# stagingoc/ — content staged for stagingoc.com

This folder is **not part of the saddlebackparty.com site**. It is a holding area
for content written for the separate Staging OC site.

Vite only publishes `index.html` and the contents of `public/`, so nothing in this
folder is copied into `dist/` or deployed to saddlebackparty.com. Verified against
`npm run build`.

Move these files to the stagingoc.com repo when one is available, then delete this
folder.

## Files

- `home-buying-red-flags.html` — standalone SEO article, "Home-Buying Red Flags:
  14 Warning Signs to Spot on a Walkthrough." Self-contained (no build step, no
  local assets): drop it in as a page on whatever platform stagingoc.com runs on.

### Before publishing

Replace the bracketed tokens listed in the comment at the top of the HTML file —
`[PHONE_DISPLAY]`, `[PHONE_E164]`, `[EMAIL]`, `[CITY]`, `[POSTAL]`, `[GA_ID]`,
`[AUTHOR_NAME]`, `[LOGO_LETTER]`. They are left visibly bracketed so a missed one
is obvious on the page instead of shipping wrong contact details.

`[GA_ID]` must be a GA4 property for stagingoc.com — do not reuse
saddlebackparty.com's measurement ID on a different domain.

Also confirm the nav/footer links (`/services`, `/portfolio`, `/contact`) and the
canonical URL (`https://www.stagingoc.com/home-buying-red-flags`) match the real
site's URL structure.
