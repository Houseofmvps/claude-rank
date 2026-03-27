/**
 * seo-scanner.mjs — Core SEO scanner with 37 rules and cross-page analysis.
 * Scans a directory of HTML files and returns a structured findings + score report.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles, detectPageType } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

// ---------------------------------------------------------------------------
// Backend framework detection
// ---------------------------------------------------------------------------

const BACKEND_FRAMEWORKS = new Set([
  'hono', 'express', 'fastify', 'koa', 'nestjs', '@nestjs/core',
  'restify', 'polka', 'micro', 'sails', 'loopback', '@loopback/core',
  'django', 'flask', 'fastapi', 'rails', 'laravel', 'spring',
]);

function isBackendOnlyProject(rootDir, htmlFiles) {
  if (htmlFiles.length > 0) return false;

  // Check package.json for backend-only deps
  const pkgPath = path.join(rootDir, 'package.json');
  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    for (const depName of Object.keys(allDeps)) {
      if (BACKEND_FRAMEWORKS.has(depName)) {
        return true;
      }
    }
  } catch {
    // no package.json or parse error — not a backend-only project
  }

  return false;
}

// ---------------------------------------------------------------------------
// Rule definitions
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
  'duplicate-title':           { severity: 'high', deduction: 10 },
  'duplicate-meta-description':{ severity: 'high', deduction: 10 },
  'canonical-conflict':        { severity: 'high', deduction: 10 },
  'orphan-page':               { severity: 'high', deduction: 10 },
  'no-internal-links':         { severity: 'high', deduction: 10 },
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
};

// ---------------------------------------------------------------------------
// Per-file rule checks
// ---------------------------------------------------------------------------

// Page types where thin content is expected and should not be flagged
const THIN_CONTENT_EXEMPT = new Set(['contact', 'terms', 'privacy', 'legal', 'login', '404', 'sitemap']);
// Page types where missing analytics is expected
const NO_ANALYTICS_EXEMPT = new Set(['terms', 'privacy', 'legal']);
// Page types where missing OG image is expected
const NO_OG_IMAGE_EXEMPT = new Set(['terms', 'privacy', 'legal']);

/**
 * Run per-file checks. Returns array of finding objects.
 * @param {object} state — PageState from parseHtml
 * @param {string} filePath — absolute path
 * @param {string} rootDir — root dir for relative path display
 * @param {object} opts — { multiPage: boolean }
 */
function checkFile(state, filePath, rootDir, opts = {}) {
  const findings = [];
  const rel = path.relative(rootDir, filePath);
  const pageType = detectPageType(filePath, state);

  function add(rule, message, context = {}) {
    const def = RULES[rule];
    findings.push({
      rule,
      severity: def.severity,
      file: rel,
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
    // Canonical points elsewhere if it's not external AND doesn't match the file's own path
    const canonical = state.canonicalUrl.trim();
    // Only flag non-external canonicals that look like they point away from this page
    if (!canonical.startsWith('http://') && !canonical.startsWith('https://')) {
      // Relative canonical — check if it matches this file
      const fileBase = '/' + rel.replace(/\\/g, '/');
      const normalizedCanonical = canonical.startsWith('/') ? canonical : '/' + canonical;
      if (normalizedCanonical !== fileBase && normalizedCanonical !== fileBase.replace(/\/index\.html$/, '/')) {
        add('canonical-points-elsewhere', `Canonical URL "${canonical}" points away from this page`);
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

  if (opts.multiPage && state.internalLinks.length === 0) {
    add('no-internal-links', 'Page has no outgoing internal links');
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

  // Skipped heading level — e.g. h1 → h3 without h2
  if (state.headingLevels.length > 1) {
    for (let i = 1; i < state.headingLevels.length; i++) {
      if (state.headingLevels[i] - state.headingLevels[i - 1] > 1) {
        add('skipped-heading-level', `Heading level skipped: h${state.headingLevels[i - 1]} → h${state.headingLevels[i]}`);
        break; // report once per page
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
// Cross-page analysis
// ---------------------------------------------------------------------------

/**
 * Build a set of all linked-to paths from all pages.
 * Normalises internal links to their basename for matching.
 */
function buildLinkedSet(allStates) {
  const linked = new Set();
  for (const { state } of allStates) {
    for (const href of state.internalLinks) {
      // Normalise: /about → about, /about.html → about.html, ./about → about
      const norm = href.replace(/^\.?\//, '');
      linked.add(norm);
      // Also add without extension
      linked.add(norm.replace(/\.html?$/, ''));
    }
  }
  return linked;
}

/**
 * Run cross-page checks. Returns array of finding objects.
 */
function crossPageChecks(allStates, rootDir) {
  const findings = [];

  // --- Duplicate title detection ---
  const titleMap = new Map(); // title → [filePath, ...]
  for (const { filePath, state } of allStates) {
    if (state.hasTitle && state.titleText) {
      const title = state.titleText.trim().toLowerCase();
      if (!titleMap.has(title)) titleMap.set(title, []);
      titleMap.get(title).push(filePath);
    }
  }
  for (const [title, files] of titleMap) {
    if (files.length > 1) {
      for (const fp of files) {
        findings.push({
          rule: 'duplicate-title',
          severity: RULES['duplicate-title'].severity,
          file: path.relative(rootDir, fp),
          message: `Duplicate title "${title}" shared across ${files.length} pages`,
          duplicates: files.map(f => path.relative(rootDir, f)),
        });
      }
    }
  }

  // --- Duplicate meta description detection ---
  const descMap = new Map();
  for (const { filePath, state } of allStates) {
    if (state.hasMetaDescription && state.metaDescriptionText) {
      const desc = state.metaDescriptionText.trim().toLowerCase();
      if (!descMap.has(desc)) descMap.set(desc, []);
      descMap.get(desc).push(filePath);
    }
  }
  for (const [, files] of descMap) {
    if (files.length > 1) {
      for (const fp of files) {
        findings.push({
          rule: 'duplicate-meta-description',
          severity: RULES['duplicate-meta-description'].severity,
          file: path.relative(rootDir, fp),
          message: `Duplicate meta description shared across ${files.length} pages`,
          duplicates: files.map(f => path.relative(rootDir, f)),
        });
      }
    }
  }

  // --- Canonical conflict detection ---
  const canonicalMap = new Map(); // canonicalUrl → [filePath, ...]
  for (const { filePath, state } of allStates) {
    if (state.hasCanonical && state.canonicalUrl) {
      const canonical = state.canonicalUrl.trim();
      if (!canonicalMap.has(canonical)) canonicalMap.set(canonical, []);
      canonicalMap.get(canonical).push(filePath);
    }
  }
  for (const [canonical, files] of canonicalMap) {
    if (files.length > 1) {
      for (const fp of files) {
        findings.push({
          rule: 'canonical-conflict',
          severity: RULES['canonical-conflict'].severity,
          file: path.relative(rootDir, fp),
          message: `Multiple pages share canonical URL "${canonical}"`,
          duplicates: files.map(f => path.relative(rootDir, f)),
        });
      }
    }
  }

  // --- Orphan page detection ---
  // A page is orphan if no other page links to it (skip index files)
  if (allStates.length > 1) {
    const linkedSet = buildLinkedSet(allStates);

    for (const { filePath } of allStates) {
      const filename = path.basename(filePath);
      const nameNoExt = filename.replace(/\.html?$/, '');

      // Skip index files
      if (nameNoExt === 'index') continue;

      // Check if this file is linked from anywhere
      const isLinked =
        linkedSet.has(filename) ||
        linkedSet.has(nameNoExt) ||
        linkedSet.has('/' + filename) ||
        linkedSet.has('/' + nameNoExt);

      if (!isLinked) {
        findings.push({
          rule: 'orphan-page',
          severity: RULES['orphan-page'].severity,
          file: path.relative(rootDir, filePath),
          message: `Page "${filename}" has no incoming internal links from other pages`,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

/**
 * Calculate SEO score from findings (deduplicated by rule).
 * @param {object[]} findings
 * @returns {number} 0-100
 */
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
// Main: scanDirectory
// ---------------------------------------------------------------------------

/**
 * Scan a directory for HTML files and run all SEO rules.
 * @param {string} rootDir — absolute path to project root
 * @returns {object} { files_scanned, findings, scores, summary } or { skipped, reason }
 */
export function scanDirectory(rootDir) {
  const absRoot = path.resolve(rootDir);
  let htmlFiles = findHtmlFiles(absRoot);

  // If dist/ or build/ has HTML, exclude root index.html (Vite/webpack source template)
  const hasBuildDir = htmlFiles.some(f => {
    const rel = path.relative(absRoot, f);
    return rel.startsWith('dist' + path.sep) || rel.startsWith('build' + path.sep) || rel.startsWith('out' + path.sep);
  });
  if (hasBuildDir) {
    htmlFiles = htmlFiles.filter(f => {
      const rel = path.relative(absRoot, f);
      return rel !== 'index.html' && rel !== 'index.htm';
    });
  }

  // Backend-only detection
  if (isBackendOnlyProject(absRoot, htmlFiles)) {
    return {
      skipped: true,
      reason: 'No HTML files found — detected backend-only project (has backend framework dependency)',
    };
  }

  if (htmlFiles.length === 0) {
    return {
      skipped: true,
      reason: 'No HTML files found in directory',
    };
  }

  const multiPage = htmlFiles.length > 1;

  // Parse all files
  const allStates = [];
  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const state = parseHtml(content);
    allStates.push({ filePath, state });
  }

  // Run per-file checks
  const perFileFindings = [];
  for (const { filePath, state } of allStates) {
    const fileFindings = checkFile(state, filePath, absRoot, { multiPage });
    perFileFindings.push(...fileFindings);
  }

  // Run cross-page checks
  const crossFindings = multiPage ? crossPageChecks(allStates, absRoot) : [];

  const allFindings = [...perFileFindings, ...crossFindings];

  // Score
  const seoScore = calculateScore(allFindings);

  // Summary counts
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of allFindings) {
    if (summary[f.severity] !== undefined) {
      summary[f.severity]++;
    }
  }

  return {
    files_scanned: allStates.length,
    findings: allFindings,
    scores: { seo: seoScore },
    summary,
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0) {
  const result = scanDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
