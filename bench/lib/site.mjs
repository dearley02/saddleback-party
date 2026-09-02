// Facts about the site that tasks and graders share.
export const SITE = 'https://www.saddlebackparty.com';
export const GA4 = 'G-XVW9FXFD0P';
export const ADS = 'AW-17958052127';
export const ADS_LABEL = 'AW-17958052127/bioACI7G5PkbEJ_CiPNC';
export const FORMSPREE = 'https://formspree.io/f/xojnwlyj';
export const TEL = 'tel:+19493719792';
export const PHONE = '(949) 371-9792';

export const CITY_SLUGS = [
  'mission-viejo', 'rancho-santa-margarita', 'lake-forest', 'laguna-hills', 'laguna-niguel',
  'coto-de-caza', 'ladera-ranch', 'trabuco-canyon', 'san-juan-capistrano', 'dana-point', 'irvine',
];
export const SERVICE_SLUGS = [
  'wedding-tent-rental', 'bounce-house-rental', 'cocktail-table-rental', 'wedding-arch-rental', 'dance-floor-rental',
];

// Every HTML document that ships tracking tags.
export const ENTRY_HTML = ['index.html', 'public/*.html'];

export const GA4_CONFIG = /gtag\(\s*['"]config['"]\s*,\s*['"]G-XVW9FXFD0P['"]\s*\)/;
export const ADS_CONFIG = /gtag\(\s*['"]config['"]\s*,\s*['"]AW-17958052127['"]\s*\)/;

export function pageKind(file) {
  const slug = file.replace(/^public\//, '').replace(/\.html$/, '');
  if (CITY_SLUGS.includes(slug)) return 'city';
  if (/-rental$/.test(slug)) return 'service';
  if (/^go(-|$)/.test(slug)) return 'landing';
  return 'other';
}

// Pages that should be crawlable and in the sitemap (ad landing pages and error pages are not).
export function indexablePages(ctx) {
  return ctx.pages().filter(f => pageKind(f) !== 'landing' && !/\/404\.html$/.test(f));
}

export const BUILD_CHECK = {
  id: 'build', name: '`npm run build` succeeds', type: 'command', cmd: 'npm run build',
  required: true, expectBaselinePass: true, weight: 1,
};
// The site ships with a couple of pre-existing ESLint errors, so the gate is "no new lint errors".
export const LINT_CHECK = {
  id: 'lint', name: 'ESLint reports no new errors versus the baseline', type: 'lint_delta',
  required: true, expectBaselinePass: true, weight: 1,
};

export function docMentions(path, keywords, id = 'docs') {
  return {
    id, name: `${path} documents the work (${keywords.join(', ')})`, type: 'fn', weight: 1,
    test: ctx => {
      if (!ctx.exists(path)) return `${path} missing`;
      const s = ctx.read(path).toLowerCase();
      const missing = keywords.filter(k => !s.includes(k.toLowerCase()));
      return missing.length ? `missing mentions: ${missing.join(', ')}` : true;
    },
  };
}
