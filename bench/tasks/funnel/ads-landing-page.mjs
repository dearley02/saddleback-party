import { ADS, ADS_LABEL, GA4, FORMSPREE, TEL, GA4_CONFIG, ADS_CONFIG, BUILD_CHECK, docMentions } from '../../lib/site.mjs';

const PAGE = 'public/go-bounce.html';
const SLUG = 'go-bounce';
const SOURCE = 'ads-bounce';

const UTM_SCRIPT = `<script>
  (function () {
    var p = new URLSearchParams(window.location.search);
    ['gclid', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
      var el = document.querySelector('input[name="' + k + '"]');
      if (el && p.get(k)) el.value = p.get(k);
    });
  })();
</script>`;

export default {
  id: 'funnel/ads-landing-page',
  category: 'Lead capture & paid-ad funnel',
  title: 'Build a bounce-house Google Ads landing page with a working lead pipeline',
  difficulty: 'hard',
  timeBudgetMin: 40,
  prompt: `
We are launching a Google Ads campaign for bounce houses and need a dedicated landing page. \`public/go.html\` is the existing (imperfect) ad page - use it as a starting point but fix what it gets wrong.

Build \`${PAGE}\` (served at \`/${SLUG}\`):
1. Ad pages must not compete with the SEO pages: add \`<meta name="robots" content="noindex, nofollow">\`, do NOT add it to \`public/sitemap.xml\`, and make sure \`robots.txt\` doesn't block it.
2. \`<h1>\` sells bounce houses (must contain "Bounce House").
3. Tracking: configure GA4 (\`${GA4}\`) AND Google Ads (\`${ADS}\`); call clicks and form submits fire the conversion label \`${ADS_LABEL}\` (no placeholder labels); at least 2 \`${TEL}\` links.
4. Lead capture: a quote form that actually POSTs to \`${FORMSPREE}\` (go.html's form only console.logs) with name, phone and event date, plus a hidden \`source\` field with value \`${SOURCE}\`. On submit fire GA4 \`generate_lead\` with \`form_name: '${SOURCE}'\`.
5. Attribution: read \`gclid\`, \`utm_source\`, \`utm_medium\`, \`utm_campaign\` from the page URL with \`URLSearchParams\` and copy them into hidden form fields so they reach the inbox.
6. Keep it fast and self-contained: no external stylesheets other than Google Fonts, no external scripts other than the Google tag, file under 80 KB.
7. Register it in \`docs/landing-pages.md\` (path, campaign, source value, conversion label).
8. \`npm run build\` must pass.
`,
  checks: [
    { id: 'exists', name: 'page exists', type: 'exists', path: PAGE },
    { id: 'noindex', name: 'robots meta is noindex', type: 'fn', test: ctx => /noindex/.test(ctx.meta(ctx.read(PAGE), 'robots') || '') || 'no noindex robots meta' },
    { id: 'h1', name: 'h1 contains "Bounce House"', type: 'fn', test: ctx => /bounce house/i.test(ctx.h1(ctx.read(PAGE))) || `h1 is "${ctx.h1(ctx.read(PAGE))}"` },
    { id: 'tags', name: 'GA4 + Ads configured, real conversion label, no placeholders', type: 'fn', weight: 2,
      test: ctx => {
        const s = ctx.stripComments(ctx.read(PAGE));
        const miss = [['GA4 config', GA4_CONFIG], ['Ads config', ADS_CONFIG], ['conversion label', new RegExp(ADS_LABEL.replace('/', '\\/'))]].filter(([, re]) => !re.test(s)).map(([n]) => n);
        if (miss.length) return `missing: ${miss.join(', ')}`;
        if (/YOUR_CONVERSION_LABEL|AW-XXXXXXXXX/.test(s)) return 'placeholder tag values still present';
        return true;
      } },
    { id: 'tel-links', name: 'at least 2 tel links', type: 'contains', path: PAGE, pattern: TEL, min: 2 },
    { id: 'form-posts', name: 'form POSTs to Formspree with hidden source=ads-bounce', type: 'fn', weight: 2,
      test: ctx => {
        const s = ctx.stripComments(ctx.read(PAGE));
        if (!s.includes(FORMSPREE)) return 'no Formspree endpoint';
        if (!/fetch\(\s*['"]https:\/\/formspree|action=["']https:\/\/formspree/.test(s)) return 'endpoint present but not used by fetch()/action';
        const src = /<input[^>]*name=["']source["'][^>]*value=["']ads-bounce["']|<input[^>]*value=["']ads-bounce["'][^>]*name=["']source["']/.test(s);
        return src || 'no hidden input name="source" value="ads-bounce"';
      } },
    { id: 'lead-event', name: `generate_lead fires with form_name '${SOURCE}'`, type: 'contains', path: PAGE, pattern: /generate_lead[^\n]*form_name['"]?\s*:\s*['"]ads-bounce['"]/ },
    { id: 'attribution', name: 'gclid/utm captured via URLSearchParams into hidden fields', type: 'fn',
      test: ctx => {
        const s = ctx.stripComments(ctx.read(PAGE));
        const miss = ['URLSearchParams', 'gclid', 'utm_source', 'utm_campaign'].filter(k => !s.includes(k));
        if (miss.length) return `missing: ${miss.join(', ')}`;
        return /<input[^>]*name=["']gclid["']/.test(s) || 'no hidden input named gclid';
      } },
    { id: 'not-in-sitemap', name: 'page is not in the sitemap', type: 'sitemap', excludes: [`/${SLUG}`], expectBaselinePass: true },
    { id: 'robots-allows', name: 'robots.txt does not block the page', type: 'not_contains', path: 'public/robots.txt', pattern: /^Disallow:\s*\/go-bounce/m, expectBaselinePass: true },
    { id: 'self-contained', name: 'no third-party CSS/JS beyond Google Fonts + Google tag; under 80 KB', type: 'fn',
      test: ctx => {
        const raw = ctx.read(PAGE);
        if (Buffer.byteLength(raw) > 80 * 1024) return `${Math.round(Buffer.byteLength(raw) / 1024)} KB`;
        const s = ctx.stripComments(raw);
        const hosts = [...s.matchAll(/<(?:link|script)[^>]*(?:href|src)=["']https?:\/\/([^/"']+)/g)].map(m => m[1]);
        const bad = [...new Set(hosts)].filter(h => !/^(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com)$/.test(h));
        return bad.length ? `external hosts: ${bad.join(', ')}` : true;
      } },
    docMentions('docs/landing-pages.md', [SLUG, SOURCE, ADS_LABEL]),
    BUILD_CHECK,
  ],
  reference: [
    { op: 'copy', from: 'public/go.html', to: PAGE },
    { op: 'replace', path: PAGE, from: '<meta charset="UTF-8">', to: '<meta charset="UTF-8">\n<meta name="robots" content="noindex, nofollow">' },
    { op: 'replace', path: PAGE, from: /<h1[^>]*>[\s\S]*?<\/h1>/, to: '<h1>Bounce House Rentals in Mission Viejo - Delivered &amp; Set Up</h1>' },
    { op: 'replace', path: PAGE, from: `  gtag('config', '${GA4}');`, to: `  gtag('config', '${GA4}');\n  gtag('config', '${ADS}');` },
    { op: 'replace', path: PAGE, from: 'YOUR_CONVERSION_LABEL', to: ADS_LABEL, all: true },
    { op: 'replace', path: PAGE, from: "{ form_name: 'contact' }", to: `{ form_name: '${SOURCE}' }` },
    { op: 'replace', path: PAGE, from: /\/\/ fetch\('YOUR_WEBHOOK_URL'[^\n]*/,
      to: `fetch('${FORMSPREE}', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });\n    if (typeof gtag === 'function') gtag('event', 'conversion', { 'send_to': '${ADS_LABEL}' });` },
    { op: 'replace', path: PAGE, from: '<form id="quoteForm" onsubmit="handleSubmit(event)">',
      to: `<form id="quoteForm" onsubmit="handleSubmit(event)">
      <input type="hidden" name="source" value="${SOURCE}">
      <input type="hidden" name="gclid" value="">
      <input type="hidden" name="utm_source" value="">
      <input type="hidden" name="utm_medium" value="">
      <input type="hidden" name="utm_campaign" value="">` },
    { op: 'replace', path: PAGE, from: '</body>', to: `${UTM_SCRIPT}\n</body>` },
    { op: 'write', path: 'docs/landing-pages.md', content: `# Ad landing pages\n\n| Path | Campaign | source value | Conversion label |\n|---|---|---|---|\n| /go | Search - general party rentals | contact | ${ADS_LABEL} |\n| /${SLUG} | Search - bounce houses | ${SOURCE} | ${ADS_LABEL} |\n` },
  ],
};
