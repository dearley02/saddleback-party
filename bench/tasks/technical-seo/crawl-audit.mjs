import { SITE, indexablePages, BUILD_CHECK, docMentions } from '../../lib/site.mjs';

const SITE_RE = SITE.replace(/[./]/g, '\\$&');
const removeSitemapEntry = slug => ({
  op: 'replace', path: 'public/sitemap.xml',
  from: new RegExp(`\\s*<url>\\s*<loc>${SITE_RE}/${slug}</loc>[\\s\\S]*?</url>`), to: '',
});

const expectedUrls = ctx => [`${SITE}/`, ...indexablePages(ctx).map(f => `${SITE}/${ctx.slug(f)}`)];

export default {
  id: 'technical-seo/crawl-audit',
  category: 'Technical SEO & hosting config',
  title: 'Diagnose Search Console coverage errors and repair crawlability across the site',
  difficulty: 'hard',
  timeBudgetMin: 40,
  prompt: `
Google Search Console lit up this week:
- "Excluded by 'noindex' tag" - 1 page
- "Duplicate without user-selected canonical" - 1 page
- "Duplicate, Google chose different canonical than user" - 1 page
- "Duplicate title tags" - 2 pages
- "Discovered - currently not indexed" - several city/service pages
- "Submitted URL not found (404)" - 1 sitemap URL
- The homepage renders as a blank shell in the URL Inspection screenshot.

Nobody remembers touching anything. Audit the whole crawl surface and fix every issue so that:
1. Every page in \`public/\` except ad landing pages (\`go*.html\`) is indexable, has a self-referencing canonical of the form \`${SITE}/<slug>\` (clean URL, no \`.html\`), and a unique \`<title>\`. \`index.html\` keeps its canonical of \`${SITE}/\`.
2. \`public/sitemap.xml\` lists exactly the live, indexable URLs - homepage plus every indexable page - all on the \`https://www.\` host, with no dead or duplicate-host entries.
3. \`public/robots.txt\` never blocks the assets Google needs to render the React homepage.
4. \`vercel.json\` serves clean URLs (\`/mission-viejo\` rather than \`/mission-viejo.html\`).
5. Write \`docs/seo-audit.md\` listing each issue you found (file, symptom, fix).
6. \`npm run build\` must pass.
`,
  setup: [
    { op: 'replace', path: 'public/robots.txt', from: 'Disallow: /.vercel/', to: 'Disallow: /.vercel/\nDisallow: /assets/' },
    removeSitemapEntry('irvine'),
    removeSitemapEntry('dance-floor-rental'),
    removeSitemapEntry('laguna-hills'),
    { op: 'replace', path: 'public/sitemap.xml', from: '</urlset>', to: `  <url>\n    <loc>${SITE}/aliso-viejo</loc>\n  </url>\n  <url>\n    <loc>https://saddlebackparty.com/dana-point</loc>\n  </url>\n</urlset>` },
    { op: 'replace', path: 'public/coto-de-caza.html', from: /<link rel="canonical"[^>]*>\n?/, to: '' },
    { op: 'replace', path: 'public/trabuco-canyon.html', from: 'content="index, follow"', to: 'content="noindex, nofollow"' },
    { op: 'replace', path: 'public/lake-forest.html', from: `${SITE}/lake-forest" />`, to: `${SITE}/lake-forest.html" />` },
    { op: 'replace', path: 'vercel.json', from: '"cleanUrls": true', to: '"cleanUrls": false' },
    { op: 'fn', run: ctx => {
      const mvTitle = ctx.title(ctx.read('public/mission-viejo.html'));
      ctx.write('public/ladera-ranch.html', ctx.read('public/ladera-ranch.html').replace(/<title>[^<]*<\/title>/, `<title>${mvTitle}</title>`));
    } },
  ],
  checks: [
    { id: 'robots-assets', name: 'robots.txt does not block /assets/', type: 'not_contains', path: 'public/robots.txt', pattern: /^Disallow:\s*\/assets\/?\s*$/m },
    { id: 'clean-urls', name: 'vercel.json cleanUrls is true', type: 'fn', test: ctx => JSON.parse(ctx.read('vercel.json')).cleanUrls === true || 'cleanUrls is not true' },
    { id: 'indexable', name: 'no indexable page carries noindex', type: 'fn', weight: 2,
      test: ctx => { const bad = indexablePages(ctx).filter(f => /noindex/.test(ctx.meta(ctx.read(f), 'robots') || '')); return bad.length ? `noindex on: ${bad.join(', ')}` : true; } },
    { id: 'canonicals', name: 'every indexable page has a self-referencing clean-URL canonical', type: 'fn', weight: 3,
      test: ctx => {
        const bad = [];
        for (const f of indexablePages(ctx)) { const c = ctx.canonical(ctx.read(f)); if (c !== `${SITE}/${ctx.slug(f)}`) bad.push(`${f} -> ${c}`); }
        const home = ctx.canonical(ctx.read('index.html')); if (home !== `${SITE}/`) bad.push(`index.html -> ${home}`);
        return bad.length ? bad.join('; ') : true;
      } },
    { id: 'unique-titles', name: 'titles are unique across the site', type: 'fn', weight: 2,
      test: ctx => {
        const seen = new Map();
        for (const f of ['index.html', ...indexablePages(ctx)]) { const t = ctx.title(ctx.read(f)); if (seen.has(t)) return `duplicate title "${t}" on ${seen.get(t)} and ${f}`; seen.set(t, f); }
        return true;
      } },
    { id: 'sitemap-exact', name: 'sitemap lists exactly the indexable URLs on the www host', type: 'fn', weight: 3,
      test: ctx => {
        const want = new Set(expectedUrls(ctx)), got = ctx.sitemapUrls();
        const missing = [...want].filter(u => !got.includes(u)), extra = got.filter(u => !want.has(u));
        const dupes = got.filter((u, i) => got.indexOf(u) !== i);
        if (missing.length || extra.length || dupes.length) return [missing.length && `missing: ${missing.join(', ')}`, extra.length && `extra: ${extra.join(', ')}`, dupes.length && `duplicates: ${dupes.join(', ')}`].filter(Boolean).join(' | ');
        return true;
      } },
    docMentions('docs/seo-audit.md', ['robots', 'canonical', 'noindex', 'sitemap', 'cleanUrls', 'title']),
    BUILD_CHECK,
  ],
  reference: [
    { op: 'replace', path: 'public/robots.txt', from: '\nDisallow: /assets/', to: '' },
    { op: 'replace', path: 'vercel.json', from: '"cleanUrls": false', to: '"cleanUrls": true' },
    { op: 'replace', path: 'public/coto-de-caza.html', from: '<meta name="robots" content="index, follow" />', to: `<meta name="robots" content="index, follow" />\n<link rel="canonical" href="${SITE}/coto-de-caza" />` },
    { op: 'replace', path: 'public/trabuco-canyon.html', from: 'content="noindex, nofollow"', to: 'content="index, follow"' },
    { op: 'replace', path: 'public/lake-forest.html', from: `${SITE}/lake-forest.html" />`, to: `${SITE}/lake-forest" />` },
    { op: 'replace', path: 'public/ladera-ranch.html', from: /<title>[^<]*<\/title>/, to: '<title>Party Rentals Ladera Ranch | Tables, Chairs, Tents, Bounce Houses | Saddleback</title>' },
    { op: 'fn', run: ctx => {
      const urls = expectedUrls(ctx);
      ctx.write('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url>\n    <loc>${u}</loc>\n    <lastmod>2026-09-02</lastmod>\n  </url>`).join('\n')}\n</urlset>\n`);
    } },
    { op: 'write', path: 'docs/seo-audit.md', content: `# SEO crawl audit

| File | Symptom | Fix |
|---|---|---|
| public/robots.txt | Disallow: /assets/ blocked the homepage JS/CSS - blank render | removed the rule |
| vercel.json | cleanUrls false - canonical URLs 404'd | cleanUrls: true |
| public/trabuco-canyon.html | noindex meta | index, follow |
| public/coto-de-caza.html | no canonical | self-referencing canonical |
| public/lake-forest.html | canonical pointed at .html | clean URL canonical |
| public/ladera-ranch.html | duplicate title (copied from Mission Viejo) | unique title |
| public/sitemap.xml | missing 3 pages, dead /aliso-viejo, non-www host | regenerated from live pages |
` },
  ],
};
