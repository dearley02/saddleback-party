import { ADS, ADS_LABEL, GA4, ENTRY_HTML, GA4_CONFIG, ADS_CONFIG, BUILD_CHECK } from '../../lib/site.mjs';

const OLD = 'G-ES74W7EPR4';
const DRIFTED = ['irvine', 'dana-point', 'lake-forest', 'wedding-arch-rental', 'dance-floor-rental', 'cocktail-table-rental']
  .map(s => `public/${s}.html`);
const GTAG_SRC = /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>/;

export default {
  id: 'analytics/tracking-consolidation',
  category: 'Analytics & conversion tracking',
  title: 'Consolidate GA4/Ads tags across every entry point and repair conversion labels',
  difficulty: 'medium',
  timeBudgetMin: 25,
  prompt: `
GA4 shows roughly 40% of city-page traffic vanished after the property was changed, and Google Ads reports zero call conversions from the /go landing page.

Facts you can rely on:
- Current GA4 property: **${GA4}**. The old property **${OLD}** is retired and must not appear anywhere.
- Google Ads account: **${ADS}**. Call/lead conversion label: **${ADS_LABEL}**.

Do all of the following:
1. Audit every HTML entry point - \`index.html\` and every file in \`public/\` - and make sure each one loads \`gtag.js\` exactly once and configures BOTH the GA4 property and the Ads account.
2. Remove every reference to the retired property.
3. Fix \`public/go.html\`: its call-click conversion still fires against a placeholder label, and the page never configures the Ads account (it only loads GA4). Both must be correct.
4. Write \`docs/tracking.md\`: a table with one row per entry-point file listing which tag IDs it loads and which conversion/event it can send.
5. \`npm run build\` must still pass.
`,
  setup: [
    ...DRIFTED.map(path => ({ op: 'replace', path, from: GA4, to: OLD, all: true })),
    { op: 'replace', path: 'public/laguna-hills.html', from: `  gtag('config', '${GA4}');\n`, to: '' },
    { op: 'replace', path: 'public/san-juan-capistrano.html', from: GTAG_SRC, to: '$&\n$&' },
  ],
  checks: [
    { id: 'no-retired-id', name: 'retired GA4 property removed everywhere', type: 'none', weight: 2,
      glob: [...ENTRY_HTML, 'src/**/*.jsx', 'src/**/*.js'], pattern: OLD },
    { id: 'ga4-everywhere', name: 'every entry point configures GA4', type: 'each', weight: 2, glob: ENTRY_HTML, pattern: GA4_CONFIG },
    { id: 'ads-everywhere', name: 'every entry point configures the Ads account', type: 'each', weight: 2, glob: ENTRY_HTML, pattern: ADS_CONFIG },
    { id: 'go-label', name: 'go.html fires the real conversion label', type: 'contains', path: 'public/go.html', pattern: ADS_LABEL },
    { id: 'go-no-placeholder', name: 'go.html has no placeholder label', type: 'not_contains', path: 'public/go.html', pattern: 'YOUR_CONVERSION_LABEL' },
    { id: 'single-loader', name: 'gtag.js loaded exactly once per page (ignoring HTML comments)', type: 'fn', weight: 2,
      test: ctx => {
        const bad = ctx.glob(ENTRY_HTML).filter(f => ctx.count(ctx.stripComments(ctx.read(f)), /<script[^>]+googletagmanager\.com\/gtag\/js/) !== 1);
        return bad.length ? `not exactly one loader in: ${bad.join(', ')}` : true;
      } },
    { id: 'docs', name: 'docs/tracking.md lists every entry-point file', type: 'fn',
      test: ctx => {
        if (!ctx.exists('docs/tracking.md')) return 'docs/tracking.md missing';
        const s = ctx.read('docs/tracking.md');
        const missing = ctx.glob(ENTRY_HTML).map(f => f.replace(/^public\//, '')).filter(n => !s.includes(n));
        return missing.length ? `not mentioned: ${missing.join(', ')}` : true;
      } },
    BUILD_CHECK,
  ],
  reference: [
    { op: 'fn', run: ctx => { for (const f of ctx.glob(ENTRY_HTML)) ctx.write(f, ctx.read(f).split(OLD).join(GA4)); } },
    { op: 'replace', path: 'public/laguna-hills.html', from: `  gtag('config', '${ADS}');`, to: `  gtag('config', '${ADS}');\n  gtag('config', '${GA4}');` },
    { op: 'replace', path: 'public/san-juan-capistrano.html', from: new RegExp(`(${GTAG_SRC.source})\\n\\1`), to: '$1' },
    { op: 'replace', path: 'public/go.html', from: `  gtag('config', '${GA4}');`, to: `  gtag('config', '${GA4}');\n  gtag('config', '${ADS}');` },
    { op: 'replace', path: 'public/go.html', from: 'YOUR_CONVERSION_LABEL', to: ADS_LABEL, all: true },
    { op: 'fn', run: ctx => {
      const rows = ctx.glob(ENTRY_HTML).map(f => `| ${f.replace(/^public\//, '')} | ${GA4}, ${ADS} | phone_click, conversion (${ADS_LABEL}) |`);
      ctx.write('docs/tracking.md', ['# Tracking inventory', '', '| Page | Tags loaded | Events |', '|---|---|---|', ...rows, ''].join('\n'));
    } },
  ],
};
