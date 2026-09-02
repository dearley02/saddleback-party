import { ADS, ADS_LABEL, FORMSPREE, ADS_CONFIG, BUILD_CHECK, docMentions } from '../../lib/site.mjs';

const CONVERSION_CALL = "if(typeof gtag_report_conversion === 'function') gtag_report_conversion(); ";

export default {
  id: 'funnel/conversion-repair',
  category: 'Lead capture & paid-ad funnel',
  title: 'Diagnose and repair a lead pipeline that silently stopped producing leads',
  difficulty: 'hard',
  timeBudgetMin: 35,
  prompt: `
Quote requests dropped to zero last week and Google Ads shows no conversions, but the site "looks fine". Nobody knows what changed. Audit the entire lead pipeline and fix every break you find.

The pipeline has three entry points: the React storefront quote form (\`src/App.jsx\`, submitted to Formspree), the homepage conversion snippet in \`index.html\`, and the ad landing page \`public/go.html\` (its own form + call-click conversion).

Known-good values: Formspree endpoint \`${FORMSPREE}\`; Google Ads account \`${ADS}\`; conversion label \`${ADS_LABEL}\`; GA4 lead event name \`generate_lead\`.

Deliverables:
1. Every entry point must actually deliver the lead (correct Formspree endpoint, real network call - not a console.log) and fire the Ads conversion against the real label plus the \`generate_lead\` GA4 event.
2. \`public/go.html\` must configure the Ads account (it currently only loads GA4) so its conversion can register at all.
3. Write \`docs/lead-pipeline.md\`: one row per conversion point (page -> user action -> destination -> tracking fired) and a list of every defect you found and fixed.
4. \`npm run build\` must pass.
`,
  setup: [
    { op: 'replace', path: 'src/App.jsx', from: 'https://formspree.io/f/xojnwlyj', to: 'https://formspree.io/f/xojnwly' },
    { op: 'replace', path: 'src/App.jsx', from: CONVERSION_CALL, to: '' },
    { op: 'replace', path: 'src/App.jsx', from: "'generate_lead'", to: "'generate_leed'" },
    { op: 'replace', path: 'index.html', from: ADS_LABEL, to: `${ADS}/REPLACE_WITH_LABEL` },
  ],
  checks: [
    { id: 'app-endpoint', name: 'App.jsx posts to the correct Formspree endpoint', type: 'contains', path: 'src/App.jsx', pattern: `"${FORMSPREE}"` },
    { id: 'app-conversion', name: 'App.jsx fires gtag_report_conversion on submit', type: 'contains', path: 'src/App.jsx', pattern: /gtag_report_conversion\(\)/ },
    { id: 'app-lead-event', name: 'App.jsx sends generate_lead (typo fixed)', type: 'fn',
      test: ctx => { const s = ctx.read('src/App.jsx'); if (/generate_leed/.test(s)) return 'still sends generate_leed'; return /['"]generate_lead['"]/.test(s) || 'no generate_lead event'; } },
    { id: 'index-label', name: 'index.html conversion snippet uses the real label', type: 'fn',
      test: ctx => { const s = ctx.read('index.html'); if (/REPLACE_WITH_LABEL/.test(s)) return 'placeholder label still present'; return s.includes(ADS_LABEL) || 'real label missing'; } },
    { id: 'go-ads-config', name: 'go.html configures the Ads account (outside HTML comments)', type: 'fn',
      test: ctx => ADS_CONFIG.test(ctx.stripComments(ctx.read('public/go.html'))) || 'no active gtag config for the Ads account' },
    { id: 'go-label', name: 'go.html fires the real conversion label, no placeholder', type: 'fn',
      test: ctx => { const s = ctx.stripComments(ctx.read('public/go.html')); if (/YOUR_CONVERSION_LABEL/.test(s)) return 'placeholder still present'; return s.includes(ADS_LABEL) || 'real label missing'; } },
    { id: 'go-form-delivers', name: 'go.html form actually POSTs to Formspree', type: 'fn', weight: 2,
      test: ctx => {
        const s = ctx.stripComments(ctx.read('public/go.html'));
        if (!s.includes(FORMSPREE)) return 'no Formspree endpoint in go.html';
        return /fetch\(\s*['"]https:\/\/formspree\.io\/f\/xojnwlyj['"]|action=["']https:\/\/formspree\.io\/f\/xojnwlyj["']/.test(s) || 'endpoint present but not used by fetch()/form action';
      } },
    docMentions('docs/lead-pipeline.md', ['go.html', 'formspree', 'generate_lead', 'gtag_report_conversion', 'index.html']),
    BUILD_CHECK,
  ],
  reference: [
    { op: 'replace', path: 'src/App.jsx', from: 'https://formspree.io/f/xojnwly"', to: `${FORMSPREE}"` },
    { op: 'replace', path: 'src/App.jsx', from: "'generate_leed'", to: "'generate_lead'" },
    { op: 'replace', path: 'src/App.jsx', from: '<Btn full onClick={() => { ', to: `<Btn full onClick={() => { ${CONVERSION_CALL}` },
    { op: 'replace', path: 'index.html', from: `${ADS}/REPLACE_WITH_LABEL`, to: ADS_LABEL },
    { op: 'replace', path: 'public/go.html', from: "  gtag('config', 'G-XVW9FXFD0P');", to: `  gtag('config', 'G-XVW9FXFD0P');\n  gtag('config', '${ADS}');` },
    { op: 'replace', path: 'public/go.html', from: 'YOUR_CONVERSION_LABEL', to: ADS_LABEL, all: true },
    { op: 'replace', path: 'public/go.html', from: /\/\/ fetch\('YOUR_WEBHOOK_URL'[^\n]*/,
      to: `fetch('${FORMSPREE}', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });\n    if (typeof gtag === 'function') gtag('event', 'conversion', { 'send_to': '${ADS_LABEL}' });` },
    { op: 'write', path: 'docs/lead-pipeline.md', content: `# Lead pipeline

| Page | Action | Destination | Tracking fired |
|---|---|---|---|
| index.html (SPA quote form) | Submit Quote Request | Formspree ${FORMSPREE} | gtag_report_conversion (${ADS_LABEL}), generate_lead |
| public/go.html | form submit | Formspree ${FORMSPREE} | conversion ${ADS_LABEL}, generate_lead |
| public/go.html | tel: click | phone call | conversion ${ADS_LABEL}, phone_click |

## Defects found and fixed
- App.jsx: Formspree endpoint was truncated (xojnwly); conversion call removed; event misspelled generate_leed.
- index.html: conversion snippet used a placeholder label.
- go.html: Ads account never configured; placeholder conversion label; form only console.logged.
` },
  ],
};
