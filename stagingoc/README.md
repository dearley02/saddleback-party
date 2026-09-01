# stagingoc/ — content staged for stagingoc.com

This folder is **not part of the saddlebackparty.com site**. It is a holding area
for content written for the separate Staging OC site.

Vite only publishes `index.html` and the contents of `public/`, so nothing in this
folder is copied into `dist/` or deployed to saddlebackparty.com. Verified against
`npm run build`.

Move these files to the stagingoc.com repo when one is available, then delete this
folder.

## Files

Same article, two shapes. **stagingoc.com runs on WordPress, so use the
`.wordpress.html` one.**

- `home-buying-red-flags.wordpress.html` — **use this for WordPress.** Post body
  only: no `<head>`, fonts, analytics, nav, or footer, because the theme and
  plugins already supply those. Paste the whole file into one Custom HTML block.
  All CSS is scoped under `.socr` and cannot affect the rest of the site. No
  `<h1>` — the theme renders the post title. Instructions are in the comment at
  the top of the file.
- `faq-schema.json` — FAQPage JSON-LD for the WordPress version. SEO plugins emit
  Article and Breadcrumb schema on their own but not FAQPage. See its header.
- `home-buying-red-flags.html` — standalone full-page version, kept as a fallback
  for a non-WordPress host. Ignore it if the WordPress route is used.

### Before publishing

Replace the bracketed tokens (find & replace). The WordPress version needs
`[PHONE_DISPLAY]`, `[PHONE_E164]`, and `[AUTHOR_NAME]`. The standalone version
additionally needs `[EMAIL]`, `[CITY]`, `[POSTAL]`, `[GA_ID]`, and
`[LOGO_LETTER]`. They are left visibly bracketed so a missed one is obvious on
the page instead of shipping wrong contact details.

`[GA_ID]` (standalone version only) must be a GA4 property for stagingoc.com —
do not reuse saddlebackparty.com's measurement ID on a different domain.

### On publishing this automatically

WPVibe is the WordPress MCP server plugin, and with it connected Claude can
create the post directly. It was **not** connected to the session that wrote
this, so these files were handed over manually. To enable it: install the WPVibe
plugin on stagingoc.com, connect it as a connector in claude.ai settings, and
make sure it is toggled on for the chat.
