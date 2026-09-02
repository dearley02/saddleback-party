import { SITE, TEL, GA4_CONFIG, indexablePages, BUILD_CHECK } from '../../lib/site.mjs';

const cfg = ctx => { try { return JSON.parse(ctx.read('vercel.json')); } catch (e) { return { __error: e.message }; } };
const isGlobal = src => /^\/(?:\(\.\*\)|:path\*|:\w+\*|\(\.\*\)\/?)$/.test(src);
const hdr = (rule, key) => (rule.headers || []).find(h => h.key?.toLowerCase() === key.toLowerCase());

const VERCEL_JSON = `{
  "cleanUrls": true,
  "trailingSlash": false,
  "redirects": [
    { "source": "/party-rentals-mission-viejo", "destination": "/mission-viejo", "permanent": true },
    { "source": "/tents", "destination": "/wedding-tent-rental", "permanent": true },
    { "source": "/:slug.html", "destination": "/:slug", "permanent": true }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
`;

const NOT_FOUND = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Page not found | Saddleback Party Rentals</title>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XVW9FXFD0P"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XVW9FXFD0P');
</script>
</head>
<body>
<h1>We couldn't find that page</h1>
<p>Head back to the <a href="/">homepage</a> or call <a href="${TEL}">(949) 371-9792</a> and we'll get your party sorted.</p>
</body>
</html>
`;

export default {
  id: 'technical-seo/edge-config',
  category: 'Technical SEO & hosting config',
  title: 'Harden the Vercel edge config: redirects, caching/security headers, 404 page, sitemap hygiene, breadcrumbs',
  difficulty: 'hard',
  timeBudgetMin: 40,
  prompt: `
Harden the hosting and structured-data layer of the site.

1. \`vercel.json\` redirects (keep \`cleanUrls\` on):
   - Legacy \`.html\` URLs permanently redirect to their clean URL (a single pattern rule, not one per page).
   - \`/party-rentals-mission-viejo\` -> \`/mission-viejo\` and \`/tents\` -> \`/wedding-tent-rental\`, both permanent.
2. \`vercel.json\` headers:
   - Everything under \`/assets/\` gets a long-lived, immutable \`Cache-Control\`.
   - Every route gets \`X-Content-Type-Options: nosniff\`, a \`Referrer-Policy\`, and clickjacking protection (\`X-Frame-Options\` or a CSP \`frame-ancestors\`).
3. A branded \`public/404.html\`: \`noindex\`, a link back to \`/\`, a \`${TEL}\` link, and the GA4 tag so 404 hits show up in analytics.
4. Sitemap hygiene: remove \`<changefreq>\` and \`<priority>\` from \`public/sitemap.xml\` (Google ignores them) but keep every \`<loc>\` and \`<lastmod>\`.
5. Add \`BreadcrumbList\` JSON-LD to every indexable city and service page (not the ad landing page, not the 404): at least two items, the last one pointing at the page's own canonical URL.
6. \`npm run build\` must pass.
`,
  checks: [
    { id: 'valid-json', name: 'vercel.json is valid JSON with cleanUrls still on', type: 'fn',
      test: ctx => { const c = cfg(ctx); if (c.__error) return c.__error; return c.cleanUrls === true || 'cleanUrls is not true'; }, expectBaselinePass: true },
    { id: 'html-redirect', name: 'one pattern rule permanently redirects *.html to clean URLs', type: 'fn', weight: 2,
      test: ctx => {
        const rules = cfg(ctx).redirects || [];
        const ok = rules.some(r => /\.html\)?$/.test(r.source) && /[:(]/.test(r.source) && !/\.html/.test(r.destination) && (r.permanent === true || [301, 308].includes(r.statusCode)));
        return ok || `no permanent pattern redirect from .html among ${rules.length} redirect rule(s)`;
      } },
    { id: 'legacy-redirects', name: 'legacy URLs redirect permanently', type: 'fn',
      test: ctx => {
        const rules = cfg(ctx).redirects || [];
        const has = (s, d) => rules.some(r => r.source === s && r.destination === d && (r.permanent === true || [301, 308].includes(r.statusCode)));
        const miss = [['/party-rentals-mission-viejo', '/mission-viejo'], ['/tents', '/wedding-tent-rental']].filter(([s, d]) => !has(s, d)).map(([s]) => s);
        return miss.length ? `missing: ${miss.join(', ')}` : true;
      } },
    { id: 'asset-cache', name: '/assets/ gets immutable Cache-Control', type: 'fn',
      test: ctx => (cfg(ctx).headers || []).some(r => /assets/.test(r.source) && /immutable/.test(hdr(r, 'Cache-Control')?.value || '')) || 'no immutable Cache-Control rule for /assets/' },
    { id: 'security-headers', name: 'nosniff, Referrer-Policy and frame protection on every route', type: 'fn', weight: 2,
      test: ctx => {
        const rules = (cfg(ctx).headers || []).filter(r => isGlobal(r.source));
        if (!rules.length) return 'no header rule with a catch-all source such as /(.*)';
        const miss = [];
        if (!rules.some(r => /nosniff/i.test(hdr(r, 'X-Content-Type-Options')?.value || ''))) miss.push('X-Content-Type-Options: nosniff');
        if (!rules.some(r => hdr(r, 'Referrer-Policy'))) miss.push('Referrer-Policy');
        if (!rules.some(r => hdr(r, 'X-Frame-Options') || /frame-ancestors/.test(hdr(r, 'Content-Security-Policy')?.value || ''))) miss.push('X-Frame-Options / CSP frame-ancestors');
        return miss.length ? `missing on catch-all: ${miss.join(', ')}` : true;
      } },
    { id: '404-page', name: 'public/404.html is noindex with home + phone links and the GA4 tag', type: 'fn',
      test: ctx => {
        if (!ctx.exists('public/404.html')) return 'public/404.html missing';
        const s = ctx.stripComments(ctx.read('public/404.html'));
        const miss = [['noindex', /noindex/.test(ctx.meta(s, 'robots') || '')], ['link to /', /href=["']\/["']/.test(s)], ['tel link', s.includes(TEL)], ['GA4 config', GA4_CONFIG.test(s)]].filter(([, ok]) => !ok).map(([n]) => n);
        return miss.length ? `missing: ${miss.join(', ')}` : true;
      } },
    { id: 'sitemap-hygiene', name: 'sitemap has no changefreq/priority but keeps loc + lastmod', type: 'fn',
      test: ctx => {
        const xml = ctx.read('public/sitemap.xml');
        if (/<(changefreq|priority)>/.test(xml)) return 'changefreq/priority still present';
        const locs = ctx.count(xml, /<loc>/), mods = ctx.count(xml, /<lastmod>/);
        return (locs >= 17 && mods === locs) || `${locs} loc, ${mods} lastmod`;
      } },
    { id: 'breadcrumbs', name: 'BreadcrumbList on every indexable page, last item = canonical', type: 'fn', weight: 3,
      test: ctx => {
        const bad = [];
        for (const f of indexablePages(ctx)) {
          const bc = ctx.jsonld(f).find(b => b['@type'] === 'BreadcrumbList');
          if (!bc) { bad.push(`${f}: none`); continue; }
          const items = bc.itemListElement || [];
          if (items.length < 2) { bad.push(`${f}: ${items.length} items`); continue; }
          const last = items[items.length - 1];
          const url = typeof last.item === 'string' ? last.item : last.item?.['@id'] || last.item?.url;
          const canon = ctx.canonical(ctx.read(f));
          if (url !== canon) bad.push(`${f}: last item ${url} != canonical ${canon}`);
        }
        return bad.length ? bad.slice(0, 4).join('; ') : true;
      } },
    BUILD_CHECK,
  ],
  reference: [
    { op: 'write', path: 'vercel.json', content: VERCEL_JSON },
    { op: 'write', path: 'public/404.html', content: NOT_FOUND },
    { op: 'replace', path: 'public/sitemap.xml', from: /\n\s*<(?:changefreq|priority)>[^<]*<\/(?:changefreq|priority)>/g, to: '' },
    { op: 'fn', run: ctx => {
      for (const f of indexablePages(ctx)) {
        const html = ctx.read(f);
        const canon = ctx.canonical(html) || `${SITE}/${ctx.slug(f)}`;
        const name = ctx.h1(html) || ctx.title(html);
        const block = `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org', '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
            { '@type': 'ListItem', position: 2, name, item: canon },
          ],
        })}</script>\n</head>`;
        ctx.write(f, html.replace('</head>', block));
      }
    } },
  ],
};
