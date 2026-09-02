import { BUILD_CHECK, LINT_CHECK } from '../../lib/site.mjs';

const CATEGORY = 'Bar & Beverage';
const ITEMS = [
  { id: 'portable-bar', name: 'Portable Bar', priceNum: 125, unit: 'per bar', description: 'A 6-foot portable bar with a shelf and a black skirt.' },
  { id: 'beverage-dispenser', name: 'Glass Beverage Dispenser (3 gal)', priceNum: 20, unit: 'per dispenser', description: 'Three-gallon glass dispenser with a spigot and a stand.' },
  { id: 'ice-chest', name: 'Rolling Ice Chest (100 qt)', priceNum: 15, unit: 'per chest', description: 'Rolling 100-quart cooler for cans, bottles and ice.' },
];

const entry = (ctx, id) => ctx.read('src/App.jsx').match(new RegExp(`\\{[^{}]*id:\\s*["']${id}["'][^{}]*\\}`))?.[0];

export default {
  id: 'storefront/product-line',
  category: 'Storefront UI build & maintenance',
  title: 'Add a Bar & Beverage product line to the React catalog with illustrations and a "New" badge',
  difficulty: 'medium',
  timeBudgetMin: 30,
  prompt: `
Add a new product line to the storefront in \`src/App.jsx\`.

1. Add three items to \`inventory\` under a new category **"${CATEGORY}"**, using exactly these ids and prices:
   | id | name | priceNum | unit |
   |---|---|---:|---|
   ${ITEMS.map(i => `| \`${i.id}\` | ${i.name} | ${i.priceNum} | ${i.unit} |`).join('\n   ')}
   Follow the existing entry shape (price string, priceNum, unit, description, bg) so the catalog filter chips and the quote form pick them up automatically.
2. Give each new item its own SVG in \`ProductIllustration\` - none of them may fall back to the emoji placeholder.
3. Add an \`isNew: true\` flag to all three items and render a "New" badge on catalog cards for any item with \`isNew\` (the existing "Popular" badge is a good model - "New" should be a separate badge, not a rename).
4. \`npm run lint\` and \`npm run build\` must pass, and the built bundle must contain the "${CATEGORY}" category.
`,
  checks: [
    ...ITEMS.map(i => ({
      id: `item-${i.id}`, name: `inventory has ${i.id} in "${CATEGORY}" at priceNum ${i.priceNum}`, type: 'fn',
      test: ctx => {
        const e = entry(ctx, i.id);
        if (!e) return `no inventory entry with id "${i.id}"`;
        if (!e.includes(`category:"${CATEGORY}"`) && !new RegExp(`category:\\s*["']${CATEGORY}["']`).test(e)) return 'wrong category';
        if (!new RegExp(`priceNum:\\s*${i.priceNum}\\b`).test(e)) return 'wrong priceNum';
        if (!/isNew:\s*true/.test(e)) return 'no isNew: true flag';
        return true;
      },
    })),
    { id: 'illustrations', name: 'each new item has its own SVG illustration', type: 'fn', weight: 2,
      test: ctx => {
        const s = ctx.read('src/App.jsx');
        const missing = ITEMS.filter(i => !new RegExp(`["']${i.id}["']:\\s*\\(\\s*<svg`).test(s)).map(i => i.id);
        return missing.length ? `no SVG for: ${missing.join(', ')}` : true;
      } },
    { id: 'new-badge', name: 'catalog card renders a "New" badge for item.isNew', type: 'contains', path: 'src/App.jsx',
      pattern: /item\.isNew\s*&&[^\n]*>\s*New\s*</, weight: 2 },
    { id: 'popular-kept', name: 'the existing Popular badge still exists', type: 'contains', path: 'src/App.jsx', pattern: /item\.popular\s*&&/, expectBaselinePass: true },
    LINT_CHECK,
    { ...BUILD_CHECK, id: 'build', name: 'build passes and the bundle contains the new category', cmd: `npm run build && grep -l "${CATEGORY}" dist/assets/*.js`, expectBaselinePass: false },
  ],
  reference: [
    { op: 'fn', run: ctx => {
      let s = ctx.read('src/App.jsx');
      const anchor = s.match(/^ *\{ id:"patio-heater".*$/m);
      if (!anchor) throw new Error('patio-heater inventory line not found');
      const lines = ITEMS.map(i => anchor[0]
        .replace('id:"patio-heater"', `id:"${i.id}"`).replace(/name:"[^"]*"/, `name:"${i.name}"`).replace(/category:"[^"]*"/, `category:"${CATEGORY}"`)
        .replace(/price:"[^"]*"/, `price:"$${i.priceNum.toFixed(2)}"`).replace(/priceNum:[\d.]+/, `priceNum:${i.priceNum}`).replace(/unit:"[^"]*"/, `unit:"${i.unit}"`)
        .replace(/description:"[^"]*"/, `description:"${i.description}"`).replace(/\},?\s*$/, ', isNew:true },'));
      s = s.replace(anchor[0], `${anchor[0]}\n${lines.join('\n')}`);
      const svgs = ITEMS.map((i, k) => `    "${i.id}": (
      <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"70%",height:"70%"}}>
        <rect x="${40 + k * 10}" y="50" width="120" height="${70 + k * 10}" rx="8" fill="white" stroke={C.terra} strokeWidth="2.5"/>
        <line x1="60" y1="70" x2="140" y2="70" stroke={C.driftwood} strokeWidth="2"/>
      </svg>
    ),`).join('\n');
      s = s.replace('    "folding-chair": (', `${svgs}\n    "folding-chair": (`);
      const popular = s.match(/^ *\{item\.popular && <span[^\n]*$/m);
      if (!popular) throw new Error('Popular badge line not found');
      s = s.replace(popular[0], `${popular[0]}\n                    {item.isNew && <span className="absolute bottom-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.terra, color: C.cream, fontFamily: "'Outfit',sans-serif", fontSize: "0.65rem" }}>New</span>}`);
      ctx.write('src/App.jsx', s);
    } },
  ],
};
