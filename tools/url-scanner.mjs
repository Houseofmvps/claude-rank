/**
 * url-scanner.mjs — Scan a live URL for SEO issues.
 * Fetches HTML from a URL and runs the same per-page analysis as seo-scanner.
 * Cross-page rules (duplicates, orphans, canonicals) are skipped for single-URL scans.
 * scanSite() crawls multiple pages and adds cross-page analysis.
 */

import { parseHtml, detectPageType } from './lib/html-parser.mjs';
import { fetchPage } from './lib/url-fetcher.mjs';
import { crawlSite } from './lib/crawler.mjs';

// ---------------------------------------------------------------------------
// Rule definitions (same as seo-scanner, minus cross-page-only rules)
// ---------------------------------------------------------------------------

const RULES = {
  // Critical
  'has-noindex':               { severity: 'critical', deduction: 20 },
  'canonical-points-elsewhere':{ severity: 'critical', deduction: 20 },

  // High
  'missing-title':             { severity: 'high', deduction: 10 },
  'missing-meta-description':  { severity: 'high', deduction: 10 },
  'missing-h1':                { severity: 'high', deduction: 10 },
  'thin-content':              { severity: 'high', deduction: 10 },
  'missing-lang':              { severity: 'high', deduction: 10 },

  // Medium
  'title-too-long':            { severity: 'medium', deduction: 5 },
  'title-too-short':           { severity: 'medium', deduction: 5 },
  'meta-description-too-long': { severity: 'medium', deduction: 5 },
  'meta-description-too-short':{ severity: 'medium', deduction: 5 },
  'missing-viewport':          { severity: 'medium', deduction: 5 },
  'missing-charset':           { severity: 'medium', deduction: 5 },
  'missing-og-title':          { severity: 'medium', deduction: 5 },
  'missing-og-description':    { severity: 'medium', deduction: 5 },
  'missing-og-image':          { severity: 'medium', deduction: 5 },
  'missing-canonical':         { severity: 'medium', deduction: 5 },
  'multiple-h1':               { severity: 'medium', deduction: 5 },
  'skipped-heading-level':     { severity: 'medium', deduction: 5 },
  'images-missing-alt':        { severity: 'medium', deduction: 5 },
  'images-missing-dimensions': { severity: 'medium', deduction: 5 },
  'missing-main-landmark':     { severity: 'medium', deduction: 5 },
  'missing-json-ld':           { severity: 'medium', deduction: 5 },
  'missing-favicon':           { severity: 'medium', deduction: 5 },
  'no-analytics':              { severity: 'medium', deduction: 5 },

  // Low
  'missing-og-url':            { severity: 'low', deduction: 2 },
  'missing-twitter-card':      { severity: 'low', deduction: 2 },
  'missing-twitter-image':     { severity: 'low', deduction: 2 },
  'missing-nav-landmark':      { severity: 'low', deduction: 2 },
  'missing-footer-landmark':   { severity: 'low', deduction: 2 },
  'no-manifest':               { severity: 'low', deduction: 2 },
  'all-scripts-blocking':      { severity: 'low', deduction: 2 },

  // Cross-page rules (multi-page crawl only)
  'duplicate-title':           { severity: 'high', deduction: 10 },
  'duplicate-meta-description':{ severity: 'high', deduction: 10 },
  'canonical-conflict':        { severity: 'high', deduction: 10 },

  // HTTP-level rules (URL-scan only)
  'http-error':                { severity: 'critical', deduction: 20 },
  'redirect-detected':         { severity: 'low', deduction: 2 },
};

// ---------------------------------------------------------------------------
// Per-page rule checks (reused from seo-scanner logic)
// ---------------------------------------------------------------------------

// Page types where thin content is expected and should not be flagged
const THIN_CONTENT_EXEMPT = new Set(['contact', 'terms', 'privacy', 'legal', 'login', '404', 'sitemap']);
// Page types where missing analytics is expected
const NO_ANALYTICS_EXEMPT = new Set(['terms', 'privacy', 'legal']);
// Page types where missing OG image is expected
const NO_OG_IMAGE_EXEMPT = new Set(['terms', 'privacy', 'legal']);

function checkPage(state, pageUrl) {
  const findings = [];
  const pageType = detectPageType(pageUrl, state);

  function add(rule, message, context = {}) {
    const def = RULES[rule];
    findings.push({
      rule,
      severity: def.severity,
      file: pageUrl,
      message,
      pageType,
      ...context,
    });
  }

  // Critical
  if (state.hasNoindex) {
    add('has-noindex', 'Page has noindex directive — will be excluded from search engines');
  }

  if (state.hasCanonical && state.canonicalUrl) {
    const canonical = state.canonicalUrl.trim();
    // For URL scans: flag if canonical points to a completely different domain
    if (canonical.startsWith('http://') || canonical.startsWith('https://')) {
      try {
        const canonicalHost = new URL(canonical).hostname;
        const pageHost = new URL(pageUrl).hostname;
        if (canonicalHost !== pageHost) {
          add('canonical-points-elsewhere', `Canonical URL "${canonical}" points to a different domain`);
        }
      } catch {
        // Invalid canonical URL — skip this check
      }
    }
  }

  // High
  if (!state.hasTitle) {
    add('missing-title', 'Page is missing a <title> tag');
  }

  if (!state.hasMetaDescription) {
    add('missing-meta-description', 'Page is missing a meta description');
  }

  if (state.h1Count === 0) {
    add('missing-h1', 'Page has no <h1> heading');
  }

  if (state.wordCount > 0 && state.wordCount < 300 && !THIN_CONTENT_EXEMPT.has(pageType)) {
    add('thin-content', `Page has only ${state.wordCount} words (minimum recommended: 300)`);
  }

  if (!state.hasLang) {
    add('missing-lang', 'HTML element is missing a lang attribute');
  }

  // Medium
  if (state.hasTitle && state.titleText.length > 60) {
    add('title-too-long', `Title is ${state.titleText.length} chars (max recommended: 60)`);
  }

  if (state.hasTitle && state.titleText.length < 20) {
    add('title-too-short', `Title is only ${state.titleText.length} chars (min recommended: 20)`);
  }

  if (state.hasMetaDescription && state.metaDescriptionText.length > 160) {
    add('meta-description-too-long', `Meta description is ${state.metaDescriptionText.length} chars (max recommended: 160)`);
  }

  if (state.hasMetaDescription && state.metaDescriptionText.length > 0 && state.metaDescriptionText.length < 70) {
    add('meta-description-too-short', `Meta description is only ${state.metaDescriptionText.length} chars (min recommended: 70)`);
  }

  if (!state.hasViewport) {
    add('missing-viewport', 'Page is missing a viewport meta tag');
  }

  if (!state.hasCharset) {
    add('missing-charset', 'Page is missing a charset declaration');
  }

  if (!state.hasOgTitle) {
    add('missing-og-title', 'Page is missing og:title Open Graph tag');
  }

  if (!state.hasOgDescription) {
    add('missing-og-description', 'Page is missing og:description Open Graph tag');
  }

  if (!state.hasOgImage && !NO_OG_IMAGE_EXEMPT.has(pageType)) {
    add('missing-og-image', 'Page is missing og:image Open Graph tag');
  }

  if (!state.hasCanonical) {
    add('missing-canonical', 'Page is missing a canonical link tag');
  }

  if (state.h1Count > 1) {
    add('multiple-h1', `Page has ${state.h1Count} <h1> tags (should have exactly 1)`);
  }

  if (state.headingLevels.length > 1) {
    for (let i = 1; i < state.headingLevels.length; i++) {
      if (state.headingLevels[i] - state.headingLevels[i - 1] > 1) {
        add('skipped-heading-level', `Heading level skipped: h${state.headingLevels[i - 1]} → h${state.headingLevels[i]}`);
        break;
      }
    }
  }

  if (state.imagesWithoutAlt > 0) {
    add('images-missing-alt', `${state.imagesWithoutAlt} image(s) missing alt attribute`);
  }

  if (state.imagesWithoutDimensions > 0) {
    add('images-missing-dimensions', `${state.imagesWithoutDimensions} image(s) missing width/height attributes`);
  }

  if (!state.hasMain) {
    add('missing-main-landmark', 'Page is missing a <main> landmark element');
  }

  if (state.jsonLdScripts === 0) {
    add('missing-json-ld', 'Page has no JSON-LD structured data');
  }

  if (!state.hasFavicon) {
    add('missing-favicon', 'Page is missing a favicon link');
  }

  if (!state.hasAnalytics && !NO_ANALYTICS_EXEMPT.has(pageType)) {
    add('no-analytics', 'No analytics provider detected on this page');
  }

  // Low
  if (!state.hasOgUrl) {
    add('missing-og-url', 'Page is missing og:url Open Graph tag');
  }

  if (!state.hasTwitterCard) {
    add('missing-twitter-card', 'Page is missing twitter:card meta tag');
  }

  if (!state.hasTwitterImage) {
    add('missing-twitter-image', 'Page is missing twitter:image meta tag');
  }

  if (!state.hasNav) {
    add('missing-nav-landmark', 'Page is missing a <nav> landmark element');
  }

  if (!state.hasFooter) {
    add('missing-footer-landmark', 'Page is missing a <footer> landmark element');
  }

  if (!state.hasManifest) {
    add('no-manifest', 'Page is missing a web app manifest link');
  }

  if (state.totalScripts > 0 && state.deferredScripts === 0) {
    add('all-scripts-blocking', `All ${state.totalScripts} script(s) are render-blocking (no async/defer)`);
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

function calculateScore(findings) {
  const triggeredRules = new Set(findings.map(f => f.rule));
  let score = 100;
  for (const rule of triggeredRules) {
    const def = RULES[rule];
    if (def) {
      score -= def.deduction;
    }
  }
  return Math.max(0, score);
}

// ---------------------------------------------------------------------------
// scanHtml — analyse raw HTML (for testing without HTTP)
// ---------------------------------------------------------------------------

/**
 * Analyse an HTML string as if it were fetched from the given URL.
 * Same analysis as scanUrl but takes HTML directly (no network request).
 * @param {string} html — raw HTML string
 * @param {string} [url='https://example.com'] — URL for context in findings
 * @returns {object} { url, findings, scores, summary }
 */
export function scanHtml(html, url = 'https://example.com') {
  const state = parseHtml(html);
  const findings = checkPage(state, url);

  const seoScore = calculateScore(findings);

  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (summary[f.severity] !== undefined) {
      summary[f.severity]++;
    }
  }

  return {
    url,
    findings,
    scores: { seo: seoScore },
    summary,
  };
}

// ---------------------------------------------------------------------------
// scanUrl — fetch + analyse
// ---------------------------------------------------------------------------

/**
 * Fetch a live URL and run SEO analysis on the returned HTML.
 * @param {string} url — the URL to scan
 * @returns {Promise<object>} { url, findings, scores, summary, http }
 */
export async function scanUrl(url) {
  const page = await fetchPage(url);

  const state = parseHtml(page.html);
  const findings = checkPage(state, page.finalUrl);

  // HTTP-level checks
  if (page.statusCode >= 400) {
    const def = RULES['http-error'];
    findings.unshift({
      rule: 'http-error',
      severity: def.severity,
      file: page.finalUrl,
      message: `HTTP ${page.statusCode} error response`,
    });
  }

  if (page.redirected) {
    const def = RULES['redirect-detected'];
    findings.push({
      rule: 'redirect-detected',
      severity: def.severity,
      file: url,
      message: `URL redirected: ${url} → ${page.finalUrl}`,
    });
  }

  const seoScore = calculateScore(findings);

  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (summary[f.severity] !== undefined) {
      summary[f.severity]++;
    }
  }

  return {
    url: page.finalUrl,
    findings,
    scores: { seo: seoScore },
    summary,
    http: {
      statusCode: page.statusCode,
      redirected: page.redirected,
      finalUrl: page.finalUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Cross-page checks (for multi-page crawl)
// ---------------------------------------------------------------------------

function crossPageChecks(allStates) {
  const findings = [];

  // --- Duplicate title detection ---
  const titleMap = new Map();
  for (const { url, state } of allStates) {
    if (state.hasTitle && state.titleText) {
      const title = state.titleText.trim().toLowerCase();
      if (!titleMap.has(title)) titleMap.set(title, []);
      titleMap.get(title).push(url);
    }
  }
  for (const [title, urls] of titleMap) {
    if (urls.length > 1) {
      for (const pageUrl of urls) {
        findings.push({
          rule: 'duplicate-title',
          severity: RULES['duplicate-title'].severity,
          file: pageUrl,
          message: `Duplicate title "${title}" shared across ${urls.length} pages`,
          duplicates: urls,
        });
      }
    }
  }

  // --- Duplicate meta description detection ---
  const descMap = new Map();
  for (const { url, state } of allStates) {
    if (state.hasMetaDescription && state.metaDescriptionText) {
      const desc = state.metaDescriptionText.trim().toLowerCase();
      if (!descMap.has(desc)) descMap.set(desc, []);
      descMap.get(desc).push(url);
    }
  }
  for (const [, urls] of descMap) {
    if (urls.length > 1) {
      for (const pageUrl of urls) {
        findings.push({
          rule: 'duplicate-meta-description',
          severity: RULES['duplicate-meta-description'].severity,
          file: pageUrl,
          message: `Duplicate meta description shared across ${urls.length} pages`,
          duplicates: urls,
        });
      }
    }
  }

  // --- Canonical conflict detection ---
  const canonicalMap = new Map();
  for (const { url, state } of allStates) {
    if (state.hasCanonical && state.canonicalUrl) {
      const canonical = state.canonicalUrl.trim();
      if (!canonicalMap.has(canonical)) canonicalMap.set(canonical, []);
      canonicalMap.get(canonical).push(url);
    }
  }
  for (const [canonical, urls] of canonicalMap) {
    if (urls.length > 1) {
      for (const pageUrl of urls) {
        findings.push({
          rule: 'canonical-conflict',
          severity: RULES['canonical-conflict'].severity,
          file: pageUrl,
          message: `Multiple pages share canonical URL "${canonical}"`,
          duplicates: urls,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// scanSite — crawl + analyse multiple pages
// ---------------------------------------------------------------------------

/**
 * Crawl and scan an entire site.
 * @param {string} startUrl
 * @param {object} [options] — passed to crawlSite (maxPages, concurrency)
 * @returns {Promise<object>} — { url, pages_scanned, files_scanned, findings, scores, summary, errors }
 */
export async function scanSite(startUrl, options = {}) {
  // 1. Crawl the site
  const crawlResult = await crawlSite(startUrl, options);

  // 2. Parse each page and run per-page checks
  const allStates = [];
  const perPageFindings = [];

  for (const page of crawlResult.pages) {
    const state = parseHtml(page.html);
    allStates.push({ url: page.url, state });

    const pageFindings = checkPage(state, page.url);

    // HTTP-level checks
    if (page.statusCode >= 400) {
      const def = RULES['http-error'];
      pageFindings.unshift({
        rule: 'http-error',
        severity: def.severity,
        file: page.url,
        message: `HTTP ${page.statusCode} error response`,
      });
    }

    perPageFindings.push(...pageFindings);
  }

  // 3. Run cross-page checks (duplicate titles, descriptions, canonical conflicts)
  const multiPage = allStates.length > 1;
  const crossFindings = multiPage ? crossPageChecks(allStates) : [];

  const allFindings = [...perPageFindings, ...crossFindings];

  // 4. Calculate deduplicated score
  const seoScore = calculateScore(allFindings);

  // 5. Summary counts
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of allFindings) {
    if (summary[f.severity] !== undefined) {
      summary[f.severity]++;
    }
  }

  return {
    url: startUrl,
    pages_scanned: crawlResult.pages.length,
    files_scanned: crawlResult.pages.length,
    findings: allFindings,
    scores: { seo: seoScore },
    summary,
    errors: crawlResult.errors,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0) {
  scanUrl(args[0]).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
