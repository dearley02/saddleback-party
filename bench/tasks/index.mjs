import trackingConsolidation from './analytics/tracking-consolidation.mjs';
import eventTaxonomy from './analytics/event-taxonomy.mjs';
import newCityPage from './seo-pages/new-city-page.mjs';
import serviceCluster from './seo-pages/service-cluster.mjs';
import productLine from './storefront/product-line.mjs';
import quoteFormHardening from './storefront/quote-form-hardening.mjs';
import adsLandingPage from './funnel/ads-landing-page.mjs';
import conversionRepair from './funnel/conversion-repair.mjs';
import crawlAudit from './technical-seo/crawl-audit.mjs';
import edgeConfig from './technical-seo/edge-config.mjs';

export const TASKS = [
  trackingConsolidation, eventTaxonomy,
  newCityPage, serviceCluster,
  productLine, quoteFormHardening,
  adsLandingPage, conversionRepair,
  crawlAudit, edgeConfig,
];

export function selectTasks(sel) {
  if (!sel || sel === 'all') return TASKS;
  const exact = TASKS.find(t => t.id === sel);
  if (exact) return [exact];
  const byCat = TASKS.filter(t => t.id.startsWith(`${sel}/`));
  if (byCat.length) return byCat;
  throw new Error(`unknown task "${sel}". Known: all, ${[...new Set(TASKS.map(t => t.id.split('/')[0]))].join(', ')}, ${TASKS.map(t => t.id).join(', ')}`);
}
