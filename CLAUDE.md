# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this is

The marketing website for **Saddleback Party Rentals**, a party rental delivery
business in Mission Viejo / South Orange County, CA. Deployed to Vercel at
`https://www.saddlebackparty.com`.

It is a lead-generation site, not an application: every page exists to produce a
phone call or a quote request. Two very different front ends live side by side:

1. **A React SPA** (`index.html` + `src/`) served at `/` — the main brand site.
2. **Hand-written static HTML pages** in `public/` — one per SEO target
   (11 cities, 5 services) plus a Google Ads landing page. These are *not*
   generated from the React app; Vite copies `public/` verbatim into `dist/`.

Treat these as two separate codebases with a shared brand. A change to the
React app does **not** propagate to the static pages, and vice versa.

## Commands

```bash
npm install        # or: npm ci
npm run dev        # Vite dev server (default http://localhost:5173)
npm run build      # production build -> dist/ (also copies public/ verbatim)
npm run preview    # serve the built dist/
npm run lint       # ESLint 9 flat config
```

There is no test suite and no CI workflow. `npm run build` is the real
gate — always run it before committing a change to `src/`.

## Layout

```
index.html                  React SPA shell: all <head> SEO, JSON-LD, gtag,
                            Tailwind CDN, Google Fonts. The root canonical page.
src/main.jsx                React 19 root mount (StrictMode).
src/App.jsx                 The ENTIRE SPA — ~620 lines, palette, data,
                            components, router, footer. No other JSX files.
src/App.css, src/index.css  Empty. Styling is Tailwind CDN + inline styles.
public/<city>.html          11 city landing pages (mission-viejo, irvine, ...).
public/<service>.html       5 service pages (wedding-tent-rental,
                            bounce-house-rental, cocktail-table-rental,
                            wedding-arch-rental, dance-floor-rental).
public/go.html              Google Ads landing page (served at /go).
public/sitemap.xml          Manually maintained. Must be updated by hand.
public/robots.txt           Note inside: /assets/ must stay crawlable.
saddleback-landing.html     Root-level prototype of go.html. NOT served
                            (outside public/). See "Gotchas".
vercel.json                 cleanUrls + trailingSlash:false.
eslint.config.js            Flat config, ignores dist/.
```

## The React app (`src/App.jsx`)

Everything is in one file, in this order:

| Lines (approx) | Contents |
| --- | --- |
| `C` | Colour palette object (`terra`, `sage`, `espresso`, `cream`, …). Every colour in the app comes from here — never hardcode a hex. |
| `ProductIllustration` | Inline SVG per inventory item, keyed by item `id`. No external images anywhere in the app. |
| `inventory` | 10 rental items: `id`, `name`, `category`, `price`, `priceNum`, `unit`, `description`, `specs[]`, `popular`, `bg`. |
| `services` | Delivery and setup add-on pricing. |
| `serviceAreas` | 8 cities with zip, population, tagline, highlights. |
| `FadeIn`, `Btn`, `Logo`, `SubHead`, `HeroScene` | Shared presentational components. |
| `HomePage`, `CatalogPage`, `AreasPage`, `QuotePage` | The four "pages". |
| `App` | Router + nav + footer. |

**Routing is `useState`, not a router.** `App` holds
`const [page, setPage] = useState("home")` and renders one of four page
components based on `page === "home" | "catalog" | "areas" | "quote"`.
`nav(p)` sets the page, closes the mobile menu, and scrolls to top. There is no
URL change and no browser history — deep links into SPA pages do not exist.
This is why the SEO pages are static HTML instead of routes.

**Styling** is Tailwind utility classes plus inline `style={{}}` objects.
Tailwind is loaded from `https://cdn.tailwindcss.com` in `index.html` — it is
**not** a dependency and there is no `tailwind.config.js` or PostCSS step.
Do not add `@apply`, custom Tailwind theme values, or expect purging to work.
Anything the CDN build doesn't ship must be an inline style.

**Adding an inventory item:** append to `inventory`, add a matching SVG under
the same `id` key in `ProductIllustration.illustrations`, and set `bg` to a
palette colour. `CatalogPage` derives its filter chips from
`new Set(inventory.map(i => i.category))`, so a new category needs no other
change. The quote total is `priceNum × qty` summed over selected items.

**Quote form:** `QuotePage` POSTs JSON to
`https://formspree.io/f/xojnwlyj`, fires `gtag_report_conversion()` and a
`generate_lead` GA4 event, then flips to a success screen. The `fetch` is not
awaited and errors are not handled — the success screen shows regardless.

## The static SEO pages (`public/*.html`)

Every city/service page is a fully self-contained document, deliberately
duplicated rather than templated. Each one contains, in order:

1. `<title>`, meta description, `robots: index, follow`, canonical to the
   **clean URL** (`https://www.saddlebackparty.com/mission-viejo` — no `.html`),
   and Open Graph tags.
2. Google Fonts preconnect (DM Serif Display + Outfit).
3. The gtag snippet configuring `AW-17958052127` and `G-XVW9FXFD0P`.
4. JSON-LD: `LocalBusiness` + `FAQPage` on city pages; `Service` +
   `FAQPage` on service pages.
5. An inline `<style>` block redeclaring the same CSS custom properties as
   the React palette (`--terra: #c4704b`, `--espresso: #3b302a`, …).
6. Markup: `.call-bar` (sticky click-to-call) → `header.site-header` → `.hero`
   → about section → `.inv-section` (pricing cards) → `.faq-section`
   (`<details>` elements mirroring the FAQPage JSON-LD) → `.final-cta` →
   `footer`.
7. A trailing click listener that fires a `phone_click` GA4 event on any
   `a[href^="tel:"]`.

### Adding a new landing page

1. Copy the closest existing page (a city page for a city, a service page for a
   service) and rewrite the copy — do not try to extract a shared template.
2. Update **every** occurrence of the slug: `<title>`, description, canonical,
   all OG tags, and the JSON-LD `@id` / `url` / `name` / `areaServed`.
3. Keep the FAQ `<details>` text and the `FAQPage` JSON-LD answers identical —
   mismatched visible and structured content is a structured-data violation.
4. Add a `<url>` entry to `public/sitemap.xml` with today's `lastmod`,
   `changefreq: weekly`, `priority: 0.8` (the homepage keeps `1.0`).
5. Reference it as `/slug`, never `/slug.html` — `vercel.json` sets
   `cleanUrls: true` and `trailingSlash: false`.

## Analytics and business facts

Hardcoded in many places; keep them identical everywhere you touch them.

- Google Ads: `AW-17958052127`, conversion label
  `AW-17958052127/bioACI7G5PkbEJ_CiPNC` (via `gtag_report_conversion(url)` in
  `index.html`).
- GA4: `G-XVW9FXFD0P`. Custom events: `phone_click`, `generate_lead`.
- Search Console verification meta tag lives in `index.html`.
- NAP (name/address/phone — consistency matters for local SEO):
  Saddleback Party Rentals · Mission Viejo, CA 92691 · (949) 371-9792 ·
  saddlebackparty@gmail.com · open daily 8am–7pm.

If a business fact changes, grep the whole repo — the phone number alone
appears ~164 times across `src/App.jsx` and every `public/*.html`.
(`(949) 555-0000` / `(949) 555-0100` are form input placeholders, not real.)

## Gotchas

- **`npm run lint` currently fails with 8 pre-existing errors** in
  `src/App.jsx`: `gtag`/`gtag_report_conversion` are `no-undef` (they are
  globals injected by `index.html`), an unused `_` destructure, and five
  `react-hooks/static-components` errors. The last one is a real bug: `Inp` is
  defined *inside* `QuotePage`, so it is a new component type on every render
  and the quote form's inputs lose focus after each keystroke. Fixing it means
  hoisting `Inp` out of `QuotePage` and passing `form`/`sf` as props. Don't
  treat these as your regression, and don't add new lint errors.
- **Pricing is duplicated and already inconsistent** between `src/App.jsx` and
  the static pages (e.g. Chiavari chair $10 in the app vs "from $6" on the
  landing pages; bounce house $250 vs "from $175"). There is no single source
  of truth. When asked to change a price, ask which surface(s) it applies to
  and update all of them deliberately.
- **`go.html`'s form has no backend.** `handleSubmit` fires a `generate_lead`
  event, logs the payload to the console, and shows the success message. The
  webhook line is commented out. Only the React quote form actually delivers a
  lead (via Formspree).
- **`saddleback-landing.html` at the repo root is dead weight** — it is
  `go.html` minus the GA4 tag and phone-click tracking, and it is not inside
  `public/` so it is never deployed. Edit `public/go.html`, not this.
- **`serviceAreas` in `App.jsx` lists 8 cities, but 11 city pages exist.**
  Laguna Niguel, Dana Point, and Irvine have landing pages and appear in the
  homepage JSON-LD `areaServed`, but only in the "Don't See Your City?" prose
  on the SPA's Areas page.
- **Nothing links the SPA to the static pages.** `src/App.jsx` contains no
  internal `href`s; the static pages link back only to `/`. Internal linking is
  a known SEO gap, not an accident to "fix" silently.
- **Do not add `Disallow: /assets/` to `robots.txt`.** The homepage is
  client-rendered; blocking `/assets/` makes Googlebot see an empty shell. The
  file carries a comment saying so — it was a previously-fixed bug.
- `dist/` is gitignored — never commit build output.

## Conventions

- JS/JSX only, ESM, no TypeScript. 2-space indent, double quotes in
  `src/App.jsx`, semicolons.
- The codebase favours dense single-line JSX and object literals; match the
  surrounding style rather than reformatting.
- Copy is first-person-plural, local, and specific ("we live here", named parks
  and neighbourhoods). Keep new marketing copy in that voice and keep claims
  consistent with existing pages (free delivery over $500, response within
  hours, setup included).
- Static pages use no build step, no framework, and no external assets beyond
  Google Fonts. Keep them that way — they must render fast and crawl clean.

## Git

Work on the branch you were assigned, commit with descriptive messages, and
push with `git push -u origin <branch>`. Do not open a pull request unless
explicitly asked. The default branch is `main`.
