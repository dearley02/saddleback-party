# Top 5 Task Categories — Saddleback Party Rentals

Derived from every commit in this repo (18 commits, Feb 16 – Aug 21 2026, all by dearley02@gmail.com).
Each commit was classified by what its diff actually changed, not by its message.

| # | Category | Commits | Files touched | Lines added | Share of all work |
|---|----------|--------:|--------------:|------------:|-------------------|
| 1 | Analytics & conversion tracking | 7 | 40 | ~270 | Most frequent (39% of commits) |
| 2 | Local SEO landing pages | 2 | 20 | ~5,620 | Largest by volume (51% of all lines) |
| 3 | Storefront UI build & maintenance | 4 | 16 | ~3,680 | Foundation + copy fixes |
| 4 | Lead capture & paid-ad funnel | 3 | 3 | ~1,370 | Quote form + ad landing pages |
| 5 | Technical SEO & hosting config | 4 | 5 | ~70 | Small edits, high leverage |

---

## 1. Analytics & conversion tracking  — *what you do most often*

Installing, swapping, and propagating Google tags across the site. This is the single most
recurring task: seven commits spread across the whole timeline, and it is the only category
you returned to in every month you committed.

- `a5f3e80` Feb 16 — Google Ads tag `AW-17958052127` added to `index.html`
- `7f4309f` Feb 19 — `gtag_report_conversion()` helper added
- `487703d` Feb 19 — conversion fired on quote-form submit in `App.jsx`
- `54cdfa5` Jun 4 — Google Search Console verification meta
- `734cb1d` Jun 5 — GA4 `G-ES74W7EPR4` added to 17 files
- `699752b` Aug 21 — GA4 switched to `G-XVW9FXFD0P`
- `ac84b2a` Aug 21 — new GA4 ID propagated to 17 pre-rendered pages

**Pattern:** every tracking change costs a 17-file sweep because each `public/*.html` page
carries its own inline gtag block (35 copies of the Ads ID, 19 of the GA4 ID today).

## 2. Local SEO landing pages  — *where most of your effort goes*

Building static, pre-rendered pages targeting "party rentals + city" and "service + rental"
searches in South Orange County. Two commits, but they account for over half the lines in
the repo.

- `dd2bae6` Jun 3 — 11 city pages (Mission Viejo, Irvine, Dana Point, Laguna Niguel, …)
  + 3 service pages (bounce house, cocktail table, wedding tent) + `robots.txt` + `sitemap.xml`
  — 4,944 lines
- `797f4ea` Jun 5 — upmarket wedding pages (arch, dance floor) + tent pillar optimization
  — 680 lines

Each page ships full `LocalBusiness` / `PostalAddress` / `GeoCoordinates` / `City` schema.
Sitemap currently lists 17 URLs.

## 3. Storefront UI build & maintenance

The React + Vite single-page storefront in `src/App.jsx` (SVG-illustrated product cards,
quote flow, color system) and its ongoing copy corrections.

- `bef6212` Feb 16 — initial site (3,665 lines)
- `4ae5cb8` Feb 16 — "Based in Coto de Caza" → "Based in Mission Viejo"
- `4542d4a` Feb 20 — phone number (760) → (949) 371-9792
- `bc9f84b` Feb 24 — hero headline rewritten to "Party Rentals in Mission Viejo & South OC"

`App.jsx` and `index.html` are the two most-touched files in the repo (7 edits each).

## 4. Lead capture & paid-ad funnel

Wiring the site to actually produce leads, and building dedicated landing pages for ad traffic.

- `48726e7` Feb 16 — quote form POSTs to Formspree (`xojnwlyj`)
- `028b966` Mar 10 — `saddleback-landing.html` uploaded (684 lines)
- `c6ff948` Mar 10 — `public/go.html` ad landing page with call-click conversion (684 lines)

**Open item:** `go.html` still contains the placeholder `'send_to': 'YOUR_CONVERSION_LABEL'`,
so call clicks on that page are not being attributed.

## 5. Technical SEO & hosting config

Small, high-leverage edits that make the SEO pages crawlable and routable.

- `af5b922` Feb 24 — title, meta description, canonical, Open Graph, JSON-LD schema on homepage
- `cce831c` Jun 3 — `vercel.json` `cleanUrls` so `/mission-viejo` resolves without `.html`
- `dd2bae6` / `797f4ea` — `robots.txt` and `sitemap.xml` created and extended
- `699752b` Aug 21 — un-blocked `/assets/` for Googlebot (homepage was rendering as an empty shell)

---

## Timeline view

```
Feb 2026  ████████░░  Storefront build, Ads tag, quote form, copy fixes, homepage SEO meta
Mar 2026  ██░░░░░░░░  Ad landing pages (go.html, saddleback-landing.html)
Jun 2026  ██████████  18 SEO pages, GA4 rollout, GSC, Vercel routing
Aug 2026  ███░░░░░░░  GA4 ID swap across all pages, robots fix
```

## Method

Classification was done per commit by diff content (`git log --name-status`, `git show`).
Where a commit spanned two categories (`699752b`: GA4 swap + robots fix) it is counted in both.
Line counts are `git show --shortstat` insertions.
