import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const extraRoots = process.argv.slice(2);
const failures = [];

const forbidden = [
  [/\bbounce\b/i, "bounce"],
  [/\bnatural wood\b/i, "natural wood"],
  [/\bincluded\b/i, "included"],
  [/\bcocktail\b/i, "cocktail"],
  [/\bdance[\s-]?floor/i, "dance floor"],
  [/\bwedding[\s-]?arch/i, "wedding arch"],
  [/\bwedding[\s-]?tent/i, "wedding tent"],
  [/\btents?\b/i, "tent"],
  [/\blinens?\b/i, "linen"],
  [/\blighting\b/i, "lighting"],
  [/\buplight/i, "uplight"],
  [/\bchandelier\b/i, "chandelier"],
  [/\bcanop(y|ies)\b/i, "canopy"],
  [/\bheaters?\b/i, "heater"],
  [/\btablecloths?\b/i, "tablecloth"],
  [/\bwarehouse\b/i, "warehouse"],
  [/\b92691\b/, "92691"],
  [/\btrucks?\b/i, "truck"],
  [/Mission Viejo,\s*CA/i, "Mission Viejo, CA"],
  [/\b5-star\b/i, "5-star"],
  [/\bfive-star\b/i, "five-star"],
  [/\btestimonials?\b/i, "testimonial"],
  [/19:00/, "old 7pm close"],
];

function rel(file) {
  return path.relative(root, file);
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function filesToScan() {
  const wanted = new Set([".html", ".css", ".js", ".jsx", ".xml", ".svg"]);
  const files = [];
  const index = path.join(root, "index.html");
  if (fs.existsSync(index)) files.push(index);
  for (const file of walk(path.join(root, "public"))) {
    if (wanted.has(path.extname(file))) files.push(file);
  }
  for (const file of walk(path.join(root, "src"))) {
    if (wanted.has(path.extname(file))) files.push(file);
  }
  for (const extra of extraRoots) {
    const dir = path.resolve(root, extra);
    for (const file of walk(dir)) {
      if (wanted.has(path.extname(file))) files.push(file);
    }
  }
  return files;
}

function htmlFiles() {
  const files = [];
  const index = path.join(root, "index.html");
  if (fs.existsSync(index)) files.push(index);
  for (const file of walk(path.join(root, "public"))) {
    if (file.endsWith(".html")) files.push(file);
  }
  return files;
}

for (const file of filesToScan()) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\n/);
  lines.forEach((line, i) => {
    for (const [pattern, label] of forbidden) {
      if (pattern.test(line)) {
        failures.push(`${rel(file)}:${i + 1} contains ${label}`);
      }
    }
  });
}

const pages = htmlFiles();
if (pages.length === 0) failures.push("No HTML pages found");

for (const file of pages) {
  const text = fs.readFileSync(file, "utf8");
  const name = rel(file);
  const h1s = text.match(/<h1\b/g) || [];
  if (h1s.length !== 1) failures.push(`${name} has ${h1s.length} h1 elements`);
  for (const token of [
    "G-XVW9FXFD0P",
    "AW-17958052127",
    "AW-17958052127/bioACI7G5PkbEJ_CiPNC",
    "phone_click",
    "gtag_report_conversion",
    "/site.js",
    "formspree.io/f/xojnwlyj",
    'rel="canonical"',
    "(949) 371-9792",
    "tel:+19493719792",
    "saddlebackparty@gmail.com",
    "8:00 AM",
    "6:00 PM",
    '"opens": "08:00"',
    '"closes": "18:00"',
    "quote-form",
    "Chiavari",
    "white resin",
    "from $6",
    "$14",
    "$15",
    "$50",
    "$500",
    'name="chiavari_chairs"',
    'name="round_48"',
    'name="round_60"',
  ]) {
    if (!text.includes(token)) failures.push(`${name} is missing ${token}`);
  }
}

const siteJs = fs.readFileSync(path.join(root, "public", "site.js"), "utf8");
if (!siteJs.includes("generate_lead")) failures.push("site.js missing generate_lead");
if (!siteJs.includes('form_name: "contact"')) failures.push("site.js missing form_name contact");
if (!siteJs.includes("https://formspree.io/f/xojnwlyj")) failures.push("site.js missing Formspree endpoint");
for (const token of [
  "chiavari_chairs: 6",
  "folding_chairs: 2.5",
  "table_6ft: 12",
  "table_8ft: 12",
  "round_48: 14",
  "round_60: 15",
  "total > 500",
]) {
  if (!siteJs.includes(token)) failures.push(`site.js is missing ${token}`);
}
if (/\bincluded\b/i.test(siteJs)) failures.push("site.js still says included");

const sitemapPath = path.join(root, "public", "sitemap.xml");
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const sitemapPaths = locs.map((loc) => {
  const url = new URL(loc);
  if (url.origin !== "https://www.saddlebackparty.com") {
    failures.push(`Sitemap URL is not on the www host: ${loc}`);
  }
  return url.pathname.replace(/\/$/, "") || "/";
});

const expected = new Set(["/"]);
for (const file of pages) {
  if (path.basename(file) === "index.html" && path.dirname(file) === root) continue;
  if (path.basename(file) === "go.html") continue;
  expected.add("/" + path.basename(file, ".html"));
}

for (const locPath of sitemapPaths) {
  if (!expected.has(locPath)) failures.push(`Sitemap lists a page that is not live: ${locPath}`);
}
for (const locPath of expected) {
  if (!sitemapPaths.includes(locPath)) failures.push(`Live page missing from sitemap: ${locPath}`);
}
if (sitemap.includes("go.html") || sitemapPaths.includes("/go")) {
  failures.push("Sitemap should not list /go");
}

const robots = fs.readFileSync(path.join(root, "public", "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://www.saddlebackparty.com/sitemap.xml")) {
  failures.push("robots.txt is missing the sitemap line");
}
if (/Disallow:\s*\/assets\//.test(robots)) failures.push("robots.txt blocks /assets/");

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}

console.log(`Checked ${pages.length} pages and ${sitemapPaths.length} sitemap URLs.`);
