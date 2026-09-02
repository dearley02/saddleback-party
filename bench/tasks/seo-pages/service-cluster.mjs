import { SITE, CITY_SLUGS, GA4_CONFIG, ADS_CONFIG } from '../../lib/site.mjs';

const PAGE = 'public/photo-booth-rental.html';
const SLUG = 'photo-booth-rental';
const linkRe = new RegExp(`href=["'](?:${SITE.replace(/[./]/g, '\\$&')})?/${SLUG}["']`);
const asArray = x => (Array.isArray(x) ? x : x ? [x] : []);

const BUILD_AND_BUNDLE = {
  id: 'build', name: 'build passes and the bundle contains the photo-booth product', type: 'command',
  cmd: 'npm run build && grep -l "photo-booth" dist/assets/*.js', required: true, weight: 1,
};

export default {
  id: 'seo-pages/service-cluster',
  category: 'Local SEO landing pages',
  title: 'Add a photo-booth service page and wire it into the city-page cluster and the catalog',
  difficulty: 'hard',
  timeBudgetMin: 40,
  prompt: `
We are launching photo booth rentals. Ship the SEO service page and connect it to everything that already exists (study \`public/bounce-house-rental.html\` for the service-page conventions).

1. Create \`${PAGE}\`:
   - \`<title>\` and \`<h1>\` contain "Photo Booth"; self-referencing canonical \`${SITE}/${SLUG}\`; robots index,follow.
   - \`Service\` JSON-LD whose \`serviceType\` or \`name\` mentions photo booth, with a \`LocalBusiness\` provider and \`areaServed\` listing at least 5 \`City\` entries.
   - \`FAQPage\` JSON-LD with at least 3 questions.
   - A visible starting price (a dollar amount) on the page.
   - Both gtag configs (GA4 + Ads) and phone_click tracking like the other pages.
2. Cluster linking: every one of the 11 city pages must link to \`/${SLUG}\`.
3. Add \`${SITE}/${SLUG}\` to \`public/sitemap.xml\`.
4. Catalog: add a \`photo-booth\` item to \`inventory\` in \`src/App.jsx\` under the "Fun & Games" category with a numeric \`priceNum\`, and give it its own SVG in \`ProductIllustration\` (no emoji fallback).
5. \`npm run build\` must pass and the built bundle must contain the new product.
`,
  checks: [
    { id: 'exists', name: 'page exists', type: 'exists', path: PAGE },
    { id: 'title-h1', name: 'title and h1 contain "Photo Booth"', type: 'fn',
      test: ctx => { const h = ctx.read(PAGE); const t = ctx.title(h), h1 = ctx.h1(h); return (/photo booth/i.test(t) && /photo booth/i.test(h1)) || `title "${t}" / h1 "${h1}"`; } },
    { id: 'canonical', name: 'self-referencing canonical + indexable', type: 'fn',
      test: ctx => { const h = ctx.read(PAGE); const c = ctx.canonical(h), r = ctx.meta(h, 'robots') || ''; return (c === `${SITE}/${SLUG}` && !/noindex/.test(r)) || `canonical ${c}, robots "${r}"`; } },
    { id: 'service-schema', name: 'Service JSON-LD with provider + >=5 City areaServed', type: 'jsonld', path: PAGE, weight: 2,
      test: blocks => {
        const svc = blocks.find(b => b['@type'] === 'Service');
        if (!svc) return 'no Service block';
        if (!/photo booth/i.test(`${svc.serviceType || ''} ${svc.name || ''}`)) return 'serviceType/name does not mention photo booth';
        if (!svc.provider || svc.provider['@type'] !== 'LocalBusiness') return 'provider is not a LocalBusiness';
        const cities = asArray(svc.areaServed).filter(a => a && a['@type'] === 'City').length;
        return cities >= 5 || `${cities} City entries in areaServed`;
      } },
    { id: 'faq', name: 'FAQPage with >=3 questions', type: 'jsonld', path: PAGE,
      test: blocks => { const f = blocks.find(b => b['@type'] === 'FAQPage'); const n = f ? asArray(f.mainEntity).length : 0; return n >= 3 || `${n} questions`; } },
    { id: 'price', name: 'a dollar price is visible', type: 'contains', path: PAGE, pattern: /\$\d{2,}/ },
    { id: 'tracking', name: 'GA4 + Ads configs and phone_click tracking present', type: 'fn',
      test: ctx => { const s = ctx.stripComments(ctx.read(PAGE)); const miss = [['GA4', GA4_CONFIG], ['Ads', ADS_CONFIG], ['phone_click', /phone_click/]].filter(([, re]) => !re.test(s)).map(([n]) => n); return miss.length ? `missing: ${miss.join(', ')}` : true; } },
    { id: 'cluster-links', name: `all 11 city pages link to /${SLUG}`, type: 'fn', weight: 3,
      test: ctx => { const bad = CITY_SLUGS.filter(sl => !linkRe.test(ctx.read(`public/${sl}.html`))); return bad.length ? `no link from: ${bad.join(', ')}` : true; } },
    { id: 'sitemap', name: 'sitemap lists the page', type: 'sitemap', includes: [`/${SLUG}`] },
    { id: 'inventory', name: 'App.jsx inventory has photo-booth in Fun & Games with priceNum', type: 'fn', weight: 2,
      test: ctx => {
        const m = ctx.read('src/App.jsx').match(/\{[^{}]*id:\s*["']photo-booth["'][^{}]*\}/);
        if (!m) return 'no inventory entry with id "photo-booth"';
        if (!/category:\s*["']Fun & Games["']/.test(m[0])) return 'category is not "Fun & Games"';
        if (!/priceNum:\s*\d+/.test(m[0])) return 'no numeric priceNum';
        return true;
      } },
    { id: 'illustration', name: 'ProductIllustration has a "photo-booth" SVG', type: 'contains', path: 'src/App.jsx', pattern: /["']photo-booth["']:\s*\(\s*<svg/ },
    BUILD_AND_BUNDLE,
  ],
  reference: [
    { op: 'copy', from: 'public/bounce-house-rental.html', to: PAGE,
      replace: [['Bounce House', 'Photo Booth'], ['Bounce house', 'Photo booth'], ['bounce house', 'photo booth'], ['bounce-house', 'photo-booth']] },
    { op: 'fn', run: ctx => {
      for (const sl of CITY_SLUGS) {
        const p = `public/${sl}.html`;
        ctx.write(p, ctx.read(p).replace('</body>', `<p class="services-link"><a href="/${SLUG}">Photo booth rental</a></p>\n</body>`));
      }
    } },
    { op: 'replace', path: 'public/sitemap.xml', from: '</urlset>', to: `  <url>\n    <loc>${SITE}/${SLUG}</loc>\n    <lastmod>2026-09-02</lastmod>\n  </url>\n</urlset>` },
    { op: 'fn', run: ctx => {
      let s = ctx.read('src/App.jsx');
      const m = s.match(/^ *\{ id:"bounce-house".*$/m);
      if (!m) throw new Error('bounce-house inventory line not found');
      const line = m[0].replace('id:"bounce-house"', 'id:"photo-booth"').replace(/name:"[^"]*"/, 'name:"Open-Air Photo Booth"')
        .replace(/price:"[^"]*"/, 'price:"$350.00"').replace(/priceNum:\d+/, 'priceNum:350').replace(/unit:"[^"]*"/, 'unit:"per event"')
        .replace(/description:"[^"]*"/, 'description:"Open-air photo booth with props, unlimited prints and a digital gallery."');
      s = s.replace(m[0], `${m[0]}\n${line}`);
      s = s.replace('    "folding-chair": (', `    "photo-booth": (
      <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"70%",height:"70%"}}>
        <rect x="55" y="30" width="90" height="120" rx="8" fill="white" stroke={C.terra} strokeWidth="2.5"/>
        <circle cx="100" cy="80" r="20" fill="none" stroke={C.terra} strokeWidth="2.5"/>
        <rect x="75" y="120" width="50" height="14" rx="3" fill={C.blush} stroke={C.terra} strokeWidth="1.5"/>
      </svg>
    ),
    "folding-chair": (`);
      ctx.write('src/App.jsx', s);
    } },
  ],
};
