import { FORMSPREE, BUILD_CHECK, LINT_CHECK } from '../../lib/site.mjs';

const VALIDATE_JS = `const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

// Returns { valid, errors } for the quote form state. Pure so it can be unit-tested.
export function validateQuote(form, today = new Date()) {
  const errors = {};
  if (!form.name || form.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!EMAIL.test(form.email || "")) errors.email = "Enter a valid email address.";
  if ((form.phone || "").replace(/\\D/g, "").length < 10) errors.phone = "Enter a 10-digit phone number.";
  if (!form.eventDate) errors.eventDate = "Pick an event date.";
  else {
    const d = new Date(form.eventDate + "T00:00:00");
    const t = new Date(today); t.setHours(0, 0, 0, 0);
    if (Number.isNaN(d.getTime()) || d < t) errors.eventDate = "Event date must be today or later.";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
`;

const TEST_MJS = `import test from "node:test";
import assert from "node:assert/strict";
import { validateQuote } from "../src/lib/validate.js";

const good = { name: "Derek", email: "d@example.com", phone: "(949) 371-9792", eventDate: "2099-01-01" };

test("accepts a complete, valid form", () => {
  assert.equal(validateQuote(good).valid, true);
});
test("rejects a missing name", () => {
  assert.equal(validateQuote({ ...good, name: "" }).errors.name !== undefined, true);
});
test("rejects a malformed email", () => {
  assert.ok(validateQuote({ ...good, email: "not-an-email" }).errors.email);
});
test("rejects a short phone number", () => {
  assert.ok(validateQuote({ ...good, phone: "949-371" }).errors.phone);
});
test("rejects an event date in the past", () => {
  assert.ok(validateQuote({ ...good, eventDate: "2000-01-01" }, new Date("2026-09-02")).errors.eventDate);
});
`;

const HOOK_JS = `import { useState } from "react";
import { validateQuote } from "../lib/validate.js";

export const QUOTE_ENDPOINT = "${FORMSPREE}";

// Owns validation, the in-flight state, the network call and conversion firing for the quote form.
export function useQuoteSubmit({ form, onSuccess }) {
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [errors, setErrors] = useState({});

  const submit = async () => {
    const v = validateQuote(form);
    setErrors(v.errors);
    if (!v.valid) return;
    setStatus("sending");
    try {
      const res = await fetch(QUOTE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      if (typeof window.gtag_report_conversion === "function") window.gtag_report_conversion();
      if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { form_name: "contact" });
      setStatus("idle");
      onSuccess();
    } catch {
      setStatus("error");
    }
  };

  return { submit, status, errors };
}
`;

export default {
  id: 'storefront/quote-form-hardening',
  category: 'Storefront UI build & maintenance',
  title: 'Harden the quote form: validation, in-flight and error states, tested submit hook',
  difficulty: 'hard',
  timeBudgetMin: 45,
  prompt: `
The quote form in \`src/App.jsx\` (see \`QuotePage\`) submits unconditionally: it fires the Ads conversion and the GA4 lead event, kicks off a \`fetch\` to Formspree without awaiting it, and immediately shows the success screen - even when the request fails or the form is empty.

Rework it:
1. Create \`src/lib/validate.js\` exporting a pure \`validateQuote(form)\` that returns \`{ valid, errors }\`. Require: name (>=2 chars), a well-formed email, a phone number with at least 10 digits, and an event date that is today or later. \`errors\` is keyed by field name with a human-readable message.
2. Add unit tests for it under \`tests/\` using \`node:test\` (at least 4 cases, including the past-date rule) and a \`"test"\` script in \`package.json\` so \`npm test\` runs them.
3. Move the submission logic out of the component into a hook \`src/hooks/useQuoteSubmit.js\` exporting \`useQuoteSubmit({ form, onSuccess })\` -> \`{ submit, status, errors }\`. The hook validates first, tracks an in-flight state, POSTs to \`${FORMSPREE}\`, checks \`response.ok\`, and only fires \`gtag_report_conversion()\` + the \`generate_lead\` event and calls \`onSuccess\` after a successful response. \`App.jsx\` must no longer reference Formspree or \`gtag_report_conversion\` directly.
4. In the UI: show the field errors inline, disable the submit button and label it "Sending..." while in flight (extend \`Btn\` to accept \`disabled\`), and on failure show an error message that includes the phone number so the customer can still reach us.
5. \`npm test\`, \`npm run lint\` and \`npm run build\` must pass.
`,
  checks: [
    { id: 'validate-module', name: 'src/lib/validate.js exports validateQuote', type: 'contains', path: 'src/lib/validate.js', pattern: /export\s+(?:function\s+validateQuote\b|const\s+validateQuote\b)/ },
    { id: 'tests-exist', name: 'tests/ has >=4 node:test cases for validation', type: 'fn',
      test: ctx => {
        const files = ctx.glob(['tests/*.test.mjs', 'tests/*.test.js', 'tests/**/*.test.mjs', 'tests/**/*.test.js']);
        if (!files.length) return 'no tests/*.test.{mjs,js}';
        const n = files.reduce((s, f) => s + ctx.count(ctx.read(f), /\b(?:test|it)\(/), 0);
        const usesNodeTest = files.some(f => /from\s+["']node:test["']/.test(ctx.read(f)));
        return (n >= 4 && usesNodeTest) || `${n} test cases, node:test import: ${usesNodeTest}`;
      } },
    { id: 'test-script', name: 'package.json has a test script and `npm test` passes', type: 'fn', required: true, weight: 2,
      test: ctx => {
        const pkg = JSON.parse(ctx.read('package.json'));
        if (!pkg.scripts?.test) return 'no "test" script';
        const r = ctx.exec('npm test');
        return r.code === 0 || `npm test exit ${r.code}: ${(r.stderr || r.stdout).trim().split('\n').slice(-5).join(' | ').slice(0, 300)}`;
      } },
    { id: 'hook', name: 'useQuoteSubmit hook validates, awaits fetch, checks ok, fires conversion', type: 'fn', weight: 3,
      test: ctx => {
        const f = ctx.glob(['src/hooks/useQuoteSubmit.js', 'src/hooks/useQuoteSubmit.jsx'])[0];
        if (!f) return 'src/hooks/useQuoteSubmit.js(x) missing';
        const s = ctx.read(f);
        const need = [
          ['export useQuoteSubmit', /export\s+(?:function\s+useQuoteSubmit\b|const\s+useQuoteSubmit\b)/],
          ['validateQuote', /validateQuote\(/], ['fetch to Formspree', new RegExp(FORMSPREE.replace(/[./]/g, '\\$&'))],
          ['awaited fetch', /await\s+fetch\(|fetch\([^)]*\)\s*\.then/], ['response.ok check', /\.ok\b/],
          ['gtag_report_conversion', /gtag_report_conversion/], ['generate_lead', /generate_lead/],
        ];
        const miss = need.filter(([, re]) => !re.test(s)).map(([n]) => n);
        return miss.length ? `hook missing: ${miss.join(', ')}` : true;
      } },
    { id: 'app-uses-hook', name: 'App.jsx imports and calls useQuoteSubmit', type: 'contains', path: 'src/App.jsx', pattern: /useQuoteSubmit\(\s*\{/ },
    { id: 'app-no-formspree', name: 'App.jsx no longer references Formspree directly', type: 'not_contains', path: 'src/App.jsx', pattern: /formspree/i },
    { id: 'app-no-conversion', name: 'App.jsx no longer calls gtag_report_conversion directly', type: 'not_contains', path: 'src/App.jsx', pattern: 'gtag_report_conversion' },
    { id: 'ui-states', name: 'UI shows Sending..., disables the button, renders errors and a phone fallback', type: 'fn', weight: 2,
      test: ctx => {
        const s = ctx.read('src/App.jsx');
        const need = [['"Sending"', /Sending/], ['disabled prop on Btn', /<Btn[^>]*disabled=/], ['Btn accepts disabled', /const Btn = \(\{[^}]*disabled/],
          ['errors rendered', /errors\.(?:name|email|phone|eventDate)|errors\[|Object\.(?:values|entries)\(errors\)/], ['error state with phone', /status === ["']error["'][\s\S]{0,400}371-9792/]];
        const miss = need.filter(([, re]) => !re.test(s)).map(([n]) => n);
        return miss.length ? `missing: ${miss.join(', ')}` : true;
      } },
    LINT_CHECK,
    BUILD_CHECK,
  ],
  reference: [
    { op: 'write', path: 'src/lib/validate.js', content: VALIDATE_JS },
    { op: 'write', path: 'tests/validate.test.mjs', content: TEST_MJS },
    { op: 'write', path: 'src/hooks/useQuoteSubmit.js', content: HOOK_JS },
    { op: 'fn', run: ctx => {
      const pkg = JSON.parse(ctx.read('package.json'));
      pkg.scripts.test = 'node --test tests/*.test.mjs';
      ctx.write('package.json', JSON.stringify(pkg, null, 2) + '\n');
    } },
    { op: 'replace', path: 'src/App.jsx', from: 'import { useState, useEffect, useRef } from "react";',
      to: 'import { useState, useEffect, useRef } from "react";\nimport { useQuoteSubmit } from "./hooks/useQuoteSubmit.js";' },
    { op: 'replace', path: 'src/App.jsx', from: 'const Btn = ({ children, variant = "terra", onClick, className = "", full = false }) => {',
      to: 'const Btn = ({ children, variant = "terra", onClick, className = "", full = false, disabled = false }) => {' },
    { op: 'replace', path: 'src/App.jsx', from: '<button onClick={onClick} ', to: '<button onClick={onClick} disabled={disabled} ' },
    { op: 'replace', path: 'src/App.jsx', from: '  const [submitted, setSubmitted] = useState(false);\n',
      to: '  const [submitted, setSubmitted] = useState(false);\n  const { submit, status, errors } = useQuoteSubmit({ form, onSuccess: () => setSubmitted(true) });\n' },
    { op: 'replace', path: 'src/App.jsx', from: /<Btn full onClick=\{\(\) => \{ if\(typeof gtag_report_conversion[^\n]*?Submit Quote Request →<\/Btn>/,
      to: `<div>
                  {Object.keys(errors).length > 0 && <ul className="mb-3 text-sm" style={{ color: C.terraDark }}>{Object.entries(errors).map(([k, msg]) => <li key={k}>{msg}</li>)}</ul>}
                  {status === "error" && <p className="mb-3 text-sm" style={{ color: C.terraDark }}>Something went wrong sending your request. Please call (949) 371-9792 and we'll quote you by phone.</p>}
                  <Btn full disabled={status === "sending"} onClick={submit}>{status === "sending" ? "Sending..." : "Submit Quote Request →"}</Btn>
                </div>` },
  ],
};
