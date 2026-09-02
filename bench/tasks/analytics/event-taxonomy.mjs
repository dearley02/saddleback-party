import { BUILD_CHECK, LINT_CHECK, pageKind, docMentions } from '../../lib/site.mjs';

const PHONE_EVENT = /gtag\(\s*['"]event['"]\s*,\s*['"]phone_click['"]\s*(?:,\s*\{([^}]*)\})?\s*\)/;

const ANALYTICS_MODULE = `// Thin wrapper so the app never depends on gtag being loaded.
export function track(eventName, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}
`;

const EVENTS_DOC = `# GA4 event taxonomy

| Event | Params | Fires when |
|---|---|---|
| phone_click | page_type ('city' / 'service' / 'landing') | any tel: link is clicked on a static page |
| quote_view | - | the SPA quote page mounts |
| generate_lead | form_name, event_type, city, estimated_value | a quote request is submitted from the SPA |

All SPA events go through \`track()\` in src/analytics.js. Static pages call window.gtag directly.
`;

export default {
  id: 'analytics/event-taxonomy',
  category: 'Analytics & conversion tracking',
  title: 'Implement one GA4 event taxonomy across the React storefront and all static pages',
  difficulty: 'hard',
  timeBudgetMin: 35,
  prompt: `
GA4 explorations don't line up: the React storefront and the 17 static pages each send slightly different events with no shared parameters. Implement one taxonomy end to end.

Event spec:

| Event | Params | Fires when |
|---|---|---|
| \`phone_click\` | \`page_type\` | any \`tel:\` link is clicked, on every static page |
| \`quote_view\` | - | the SPA quote page mounts (once per mount) |
| \`generate_lead\` | \`form_name\`, \`event_type\`, \`city\`, \`estimated_value\` | a quote request is submitted |

Requirements:
- \`page_type\` is \`'city'\` on the 11 city pages, \`'service'\` on every \`*-rental\` page, and \`'landing'\` on \`go.html\`.
- Create \`src/analytics.js\` exporting \`track(eventName, params)\` which calls \`window.gtag('event', ...)\` when gtag exists and silently no-ops otherwise. Every GA4 event in the React app must go through \`track\` - leave no direct \`gtag('event', ...)\` calls under \`src/\`.
- \`generate_lead\` must carry \`estimated_value\` equal to the quote estimate total, plus \`event_type\` and \`city\` from the form state.
- Fire \`quote_view\` from a \`useEffect\` when the quote page mounts.
- Update every static page's phone-click handler so \`phone_click\` carries \`page_type\`.
- Document the taxonomy in \`docs/events.md\` (event, params, where it fires).
- \`npm run lint\` and \`npm run build\` must pass.
`,
  checks: [
    { id: 'module', name: 'src/analytics.js exports track()', type: 'contains', path: 'src/analytics.js',
      pattern: /export\s+(?:function\s+track\b|const\s+track\b|\{[^}]*\btrack\b[^}]*\})/ },
    { id: 'app-imports', name: 'App.jsx imports track from ./analytics', type: 'contains', path: 'src/App.jsx',
      pattern: /import\s*\{[^}]*\btrack\b[^}]*\}\s*from\s*['"]\.\/analytics(?:\.js)?['"]/ },
    { id: 'no-direct-gtag', name: 'no direct gtag("event") calls under src/', type: 'none', weight: 2,
      glob: ['src/**/*.jsx', 'src/**/*.js'], exclude: ['src/analytics.js'], pattern: /gtag\(\s*['"]event['"]/ },
    { id: 'lead-params', name: 'generate_lead carries form_name, event_type, city, estimated_value', type: 'fn', weight: 2,
      test: ctx => {
        const s = ctx.read('src/App.jsx');
        const m = s.match(/track\(\s*['"]generate_lead['"]\s*,\s*\{([\s\S]*?)\}\s*\)/);
        if (!m) return 'no track("generate_lead", {...}) call in App.jsx';
        const missing = ['form_name', 'event_type', 'city', 'estimated_value'].filter(k => !m[1].includes(k));
        return missing.length ? `params missing: ${missing.join(', ')}` : true;
      } },
    { id: 'quote-view', name: 'quote_view tracked from a useEffect on the quote page', type: 'contains', path: 'src/App.jsx',
      pattern: /useEffect\(\s*\(\)\s*=>\s*\{[^}]*track\(\s*['"]quote_view['"]/ },
    { id: 'page-type', name: 'phone_click carries the right page_type on every static page', type: 'fn', weight: 3,
      test: ctx => {
        const bad = [];
        for (const f of ctx.pages()) {
          const m = ctx.stripComments(ctx.read(f)).match(PHONE_EVENT);
          const want = pageKind(f);
          if (!m) { bad.push(`${f}: no phone_click event`); continue; }
          const got = (m[1] || '').match(/page_type\s*:\s*['"]([a-z]+)['"]/);
          if (!got) bad.push(`${f}: no page_type`);
          else if (got[1] !== want) bad.push(`${f}: page_type '${got[1]}' should be '${want}'`);
        }
        return bad.length ? bad.slice(0, 5).join('; ') : true;
      } },
    docMentions('docs/events.md', ['phone_click', 'quote_view', 'generate_lead', 'page_type', 'estimated_value']),
    LINT_CHECK,
    BUILD_CHECK,
  ],
  reference: [
    { op: 'write', path: 'src/analytics.js', content: ANALYTICS_MODULE },
    { op: 'replace', path: 'src/App.jsx', from: 'import { useState, useEffect, useRef } from "react";',
      to: 'import { useState, useEffect, useRef } from "react";\nimport { track } from "./analytics";' },
    { op: 'replace', path: 'src/App.jsx',
      from: "if(typeof gtag === 'function') gtag('event','generate_lead',{form_name:'contact'});",
      to: "track('generate_lead', { form_name: 'contact', event_type: form.eventType, city: form.city, estimated_value: total });" },
    { op: 'replace', path: 'src/App.jsx', from: '  const [submitted, setSubmitted] = useState(false);\n',
      to: "  const [submitted, setSubmitted] = useState(false);\n  useEffect(() => { track('quote_view'); }, []);\n" },
    { op: 'fn', run: ctx => {
      for (const f of ctx.pages()) {
        ctx.write(f, ctx.read(f).replace("window.gtag('event', 'phone_click');", `window.gtag('event', 'phone_click', { page_type: '${pageKind(f)}' });`));
      }
    } },
    { op: 'write', path: 'docs/events.md', content: EVENTS_DOC },
  ],
};
