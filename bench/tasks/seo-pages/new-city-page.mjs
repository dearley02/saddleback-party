import { SITE, TEL, CITY_SLUGS, SERVICE_SLUGS, GA4_CONFIG, ADS_CONFIG, BUILD_CHECK } from '../../lib/site.mjs';

const PAGE = 'public/aliso-viejo.html';
const SLUG = 'aliso-viejo';
const CITY = 'Aliso Viejo';

const linkRe = slug => new RegExp(`href=["'](?:${SITE.replace(/[./]/g, '\\$&')})?/${slug}["']`);

function jsonldOf(ctx, type) {
  return ctx.jsonld(PAGE).filter(b => b['@type'] === type);
}
const asArray = x => (Array.isArray(x) ? x : x ? [x] : []);

export default {
  id: 'seo-pages/new-city-page',
  category: 'Local SEO landing pages',
  title: 'Launch an Aliso Viejo city landing page end to end',
  difficulty: 'hard',
  timeBudgetMin: 40,
  prompt: `
Aliso Viejo (ZIP 92656, pop. ~52,000) is our most-requested delivery city with no landing page. Launch it end to end, matching the conventions of the existing city pages (study \`public/mission-viejo.html\` first).

1. Create \`${PAGE}\`:
   - \`<title>\` and \`<h1>\` name ${CITY}; meta description 80-170 characters that mentions ${CITY}.
   - \`robots\` index,follow; self-referencing canonical \`${SITE}/${SLUG}\`; Open Graph title.
   - \`LocalBusiness\` JSON-LD whose \`areaServed\` is a \`City\` named "${CITY}".
   - \`FAQPage\` JSON-LD with at least 3 questions, at least 2 of which mention ${CITY} by name.
   - Both gtag configs (GA4 + Google Ads) and the phone_click tracking used by the other pages; at least 2 \`${TEL}\` links.
   - Do not leave Mission Viejo copy in the new page's title, h1 or canonical.
2. Internal linking - the existing pages have none, so add a "Nearby cities" block:
   - The new page links to the homepage, at least 3 other city pages, and at least 1 service page.
   - At least 2 existing city pages link to \`/${SLUG}\`.
3. Add \`${SITE}/${SLUG}\` to \`public/sitemap.xml\` with a \`lastmod\`.
4. Add ${CITY} to \`serviceAreas\` in \`src/App.jsx\` (zip 92656) so the SPA's service-area section shows it.
5. \`npm run build\` must pass.
`,
  checks: [
    { id: 'exists', name: 'page exists', type: 'exists', path: PAGE },
    { id: 'title', name: `title names ${CITY} and not Mission Viejo`, type: 'fn',
      test: ctx => { const t = ctx.title(ctx.read(PAGE)); return t.includes(CITY) && !t.includes('Mission Viejo') || `title is "${t}"`; } },
    { id: 'h1', name: `h1 names ${CITY}`, type: 'fn',
      test: ctx => { const h = ctx.h1(ctx.read(PAGE)); return h.includes(CITY) || `h1 is "${h}"`; } },
    { id: 'description', name: `meta description 80-170 chars mentioning ${CITY}`, type: 'fn',
      test: ctx => { const d = ctx.meta(ctx.read(PAGE), 'description') || ''; return (d.length >= 80 && d.length <= 170 && d.includes(CITY)) || `description ${d.length} chars: "${d.slice(0, 60)}..."`; } },
    { id: 'canonical', name: 'self-referencing canonical + index,follow + og:title', type: 'fn',
      test: ctx => {
        const html = ctx.read(PAGE);
        const c = ctx.canonical(html), r = ctx.meta(html, 'robots') || '', og = ctx.prop(html, 'og:title');
        if (c !== `${SITE}/${SLUG}`) return `canonical is ${c}`;
        if (!/index/.test(r) || /noindex/.test(r)) return `robots is "${r}"`;
        if (!og) return 'no og:title';
        return true;
      } },
    { id: 'local-business', name: `LocalBusiness JSON-LD with areaServed City "${CITY}"`, type: 'jsonld', path: PAGE, weight: 2,
      test: (_, ctx) => {
        const lb = jsonldOf(ctx, 'LocalBusiness');
        if (!lb.length) return 'no LocalBusiness block';
        const ok = lb.some(b => asArray(b.areaServed).some(a => a && a['@type'] === 'City' && a.name === CITY));
        return ok || `areaServed does not include City "${CITY}"`;
      } },
    { id: 'faq', name: `FAQPage JSON-LD with >=3 questions, >=2 mentioning ${CITY}`, type: 'jsonld', path: PAGE, weight: 2,
      test: (_, ctx) => {
        const faq = jsonldOf(ctx, 'FAQPage')[0];
        if (!faq) return 'no FAQPage block';
        const qs = asArray(faq.mainEntity);
        const local = qs.filter(q => JSON.stringify(q).includes(CITY)).length;
        return (qs.length >= 3 && local >= 2) || `${qs.length} questions, ${local} mention ${CITY}`;
      } },
    { id: 'tracking', name: 'GA4 + Ads configs and phone_click tracking present', type: 'fn',
      test: ctx => {
        const s = ctx.stripComments(ctx.read(PAGE));
        const miss = [['GA4', GA4_CONFIG], ['Ads', ADS_CONFIG], ['phone_click', /phone_click/]].filter(([, re]) => !re.test(s)).map(([n]) => n);
        return miss.length ? `missing: ${miss.join(', ')}` : true;
      } },
    { id: 'tel-links', name: 'at least 2 tel links', type: 'contains', path: PAGE, pattern: TEL, min: 2 },
    { id: 'outbound-links', name: 'links to home, >=3 city pages, >=1 service page', type: 'fn', weight: 2,
      test: ctx => {
        const s = ctx.read(PAGE);
        const cities = CITY_SLUGS.filter(sl => linkRe(sl).test(s)).length;
        const services = SERVICE_SLUGS.filter(sl => linkRe(sl).test(s)).length;
        const home = /href=["'](?:https:\/\/www\.saddlebackparty\.com)?\/["']/.test(s);
        return (home && cities >= 3 && services >= 1) || `home:${home} cities:${cities} services:${services}`;
      } },
    { id: 'inbound-links', name: `>=2 existing city pages link to /${SLUG}`, type: 'fn', weight: 2,
      test: ctx => {
        const n = CITY_SLUGS.filter(sl => linkRe(SLUG).test(ctx.read(`public/${sl}.html`))).length;
        return n >= 2 || `${n} city pages link in`;
      } },
    { id: 'sitemap', name: 'sitemap lists the page with lastmod', type: 'fn',
      test: ctx => {
        const xml = ctx.read('public/sitemap.xml');
        const m = xml.match(new RegExp(`<url>\\s*<loc>${SITE.replace(/[./]/g, '\\$&')}/${SLUG}</loc>([\\s\\S]*?)</url>`));
        if (!m) return 'not in sitemap';
        return /<lastmod>\d{4}-\d{2}-\d{2}/.test(m[1]) || 'no lastmod';
      } },
    { id: 'service-area', name: 'App.jsx serviceAreas includes Aliso Viejo / 92656', type: 'fn',
      test: ctx => { const s = ctx.read('src/App.jsx'); return (/city:\s*["']Aliso Viejo["']/.test(s) && /92656/.test(s)) || 'serviceAreas entry missing'; } },
    BUILD_CHECK,
  ],
  reference: [
    { op: 'copy', from: 'public/mission-viejo.html', to: PAGE,
      replace: [['Mission Viejo', CITY], ['mission-viejo', SLUG], ['92691', '92656']] },
    { op: 'replace', path: PAGE, from: '</body>', to: `<nav class="nearby"><h2>Nearby cities</h2>
  <a href="/">Home</a> <a href="/mission-viejo">Mission Viejo</a> <a href="/laguna-hills">Laguna Hills</a> <a href="/laguna-niguel">Laguna Niguel</a> <a href="/bounce-house-rental">Bounce house rental</a>
</nav>
</body>` },
    { op: 'fn', run: ctx => {
      for (const sl of ['laguna-hills', 'laguna-niguel']) {
        const p = `public/${sl}.html`;
        ctx.write(p, ctx.read(p).replace('</body>', `<nav class="nearby"><h2>Nearby cities</h2><a href="/${SLUG}">${CITY} party rentals</a></nav>\n</body>`));
      }
    } },
    { op: 'replace', path: 'public/sitemap.xml', from: '</urlset>', to: `  <url>\n    <loc>${SITE}/${SLUG}</loc>\n    <lastmod>2026-09-02</lastmod>\n  </url>\n</urlset>` },
    { op: 'fn', run: ctx => {
      const s = ctx.read('src/App.jsx');
      const m = s.match(/^ *\{ city:"Mission Viejo".*$/m);
      if (!m) throw new Error('Mission Viejo serviceAreas line not found');
      const line = m[0].split('Mission Viejo').join(CITY).replace(/zip:"[^"]*"/, 'zip:"92656"');
      ctx.write('src/App.jsx', s.replace(m[0], `${m[0]}\n${line}`));
    } },
  ],
};
