/**
 * seo-scanner.mjs — Core SEO scanner with 37 rules and cross-page analysis.
 * Scans a directory of HTML files and returns a structured findings + score report.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles, detectPageType } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';
import { validateSchema } from './schema-engine.mjs';

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
  'schema-invalid':            { severity: 'medium', deduction: 5 },
  'missing-favicon':           { severity: 'medium', deduction: 5 },
  'no-analytics':              { severity: 'medium', deduction: 5 },

  // Mobile
  'viewport-not-responsive':   { severity: 'high', deduction: 10 },

  // Keyword relevance
  'title-content-mismatch':    { severity: 'medium', deduction: 5 },

  // Low
  'missing-og-url':            { severity: 'low', deduction: 2 },
  'missing-twitter-card':      { severity: 'low', deduction: 2 },
  'missing-twitter-image':     { severity: 'low', deduction: 2 },
  'missing-nav-landmark':      { severity: 'low', deduction: 2 },
  'missing-footer-landmark':   { severity: 'low', deduction: 2 },
  'no-manifest':               { severity: 'low', deduction: 2 },
  'all-scripts-blocking':      { severity: 'low', deduction: 2 },
  'meta-content-mismatch':     { severity: 'low', deduction: 2 },

  // Phase 1: New SEO rules
  'missing-robots-txt':        { severity: 'high', deduction: 10 },
  'missing-sitemap-xml':       { severity: 'high', deduction: 10 },
  'nofollow-internal-links':   { severity: 'medium', deduction: 5 },
  'missing-date-modified':     { severity: 'medium', deduction: 5 },
  'hreflang-missing-self':     { severity: 'medium', deduction: 5 },
  'hreflang-invalid-code':     { severity: 'medium', deduction: 5 },
  'low-readability':           { severity: 'medium', deduction: 5 },
  'paragraph-wall-of-text':    { severity: 'low', deduction: 2 },
  'high-passive-voice':        { severity: 'low', deduction: 2 },
  'duplicate-content':         { severity: 'high', deduction: 10 },
  'mixed-content':             { severity: 'medium', deduction: 5 },
  'missing-lazy-loading':      { severity: 'low', deduction: 2 },
};

// ---------------------------------------------------------------------------
// Keyword relevance helpers
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they',
  'my', 'your', 'his', 'her', 'our', 'their', 'its', 'not', 'no',
  'so', 'if', 'then', 'than', 'too', 'very', 'just', 'about', 'up',
  'out', 'all', 'also', 'how', 'what', 'when', 'where', 'why', 'which',
  'who', 'whom', 'get', 'got', 'best', 'top', 'new',
]);

function extractKeywords(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Readability helpers
// ---------------------------------------------------------------------------

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;
  // Remove trailing silent e
  word = word.replace(/e$/, '');
  const matches = word.match(/[aeiouy]+/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function fleschKincaid(text) {
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length === 0 || words.length === 0) return 100;
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
}

// ---------------------------------------------------------------------------
// ISO 639-1 language code validation
// ---------------------------------------------------------------------------

const VALID_LANG_CODES = new Set([
  'aa','ab','af','ak','am','an','ar','as','av','ay','az','ba','be','bg','bh','bi','bm','bn','bo','br','bs','ca','ce','ch','co','cr','cs','cu','cv','cy','da','de','dv','dz','ee','el','en','eo','es','et','eu','fa','ff','fi','fj','fo','fr','fy','ga','gd','gl','gn','gu','gv','ha','he','hi','ho','hr','ht','hu','hy','hz','ia','id','ie','ig','ii','ik','in','io','is','it','iu','ja','jv','ka','kg','ki','kj','kk','kl','km','kn','ko','kr','ks','ku','kv','kw','ky','la','lb','lg','li','ln','lo','lt','lu','lv','mg','mh','mi','mk','ml','mn','mo','mr','ms','mt','my','na','nb','nd','ne','ng','nl','nn','no','nr','nv','ny','oc','oj','om','or','os','pa','pi','pl','ps','pt','qu','rm','rn','ro','ru','rw','sa','sc','sd','se','sg','si','sk','sl','sm','sn','so','sq','sr','ss','st','su','sv','sw','ta','te','tg','th','ti','tk','tl','tn','to','tr','ts','tt','tw','ty','ug','uk','ur','uz','ve','vi','vo','wa','wo','xh','yi','yo','za','zh','zu',
]);

function isValidLangCode(code) {
  // Handle codes like "en-US", "pt-BR", "x-default"
  if (code === 'x-default') return true;
  const primary = code.split('-')[0].toLowerCase();
  return VALID_LANG_CODES.has(primary);
}

// ---------------------------------------------------------------------------
// File existence helper
// ---------------------------------------------------------------------------

function fileExists(filePath) {
  try {
    fs.statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

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

  const contentWords = state.mainContentWordCount || state.wordCount;
  if (contentWords > 0 && contentWords < 300 && !THIN_CONTENT_EXEMPT.has(pageType)) {
    add('thin-content', `Page has only ${contentWords} words in main content (minimum recommended: 300)`);
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

  // Validate JSON-LD schema against Google's required fields
  if (state.jsonLdContent && state.jsonLdContent.length > 0) {
    for (const raw of state.jsonLdContent) {
      try {
        const data = JSON.parse(raw);
        const issues = validateSchema(data);
        if (issues.length > 0) {
          add('schema-invalid', `JSON-LD ${data['@type'] || 'unknown'} schema has issues: ${issues.join('; ')}`);
        }
      } catch {
        // Malformed JSON-LD — already handled by missing-json-ld if count is 0
      }
    }
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

  // Mobile-friendliness: viewport must include width=device-width
  if (state.hasViewport && state.viewportContent) {
    const vc = state.viewportContent.toLowerCase();
    if (!vc.includes('width=device-width') && !vc.includes('initial-scale')) {
      add('viewport-not-responsive', 'Viewport meta tag does not use width=device-width — page may not be mobile-friendly (Google uses mobile-first indexing)');
    }
  }

  // Keyword relevance: title keywords should appear in body content
  if (state.hasTitle && state.titleText && contentWords >= 100) {
    const titleKeywords = extractKeywords(state.titleText);
    if (titleKeywords.length >= 2) {
      const body = (state.bodyText || '').toLowerCase();
      const matched = titleKeywords.filter(kw => body.includes(kw));
      if (matched.length < titleKeywords.length * 0.5) {
        add('title-content-mismatch',
          `Title keywords (${titleKeywords.join(', ')}) have low presence in page content — only ${matched.length}/${titleKeywords.length} found`);
      }
    }
  }

  // Meta description keyword relevance
  if (state.hasMetaDescription && state.metaDescriptionText && contentWords >= 100) {
    const metaKeywords = extractKeywords(state.metaDescriptionText);
    if (metaKeywords.length >= 2) {
      const body = (state.bodyText || '').toLowerCase();
      const matched = metaKeywords.filter(kw => body.includes(kw));
      if (matched.length < metaKeywords.length * 0.3) {
        add('meta-content-mismatch',
          `Meta description keywords have low presence in page content — only ${matched.length}/${metaKeywords.length} found`);
      }
    }
  }

  // --- Phase 1: New per-file checks ---

  // Nofollow on internal links
  if (state.nofollowInternalLinks > 0) {
    add('nofollow-internal-links', `${state.nofollowInternalLinks} internal link(s) have rel="nofollow" — this prevents link equity from flowing within your site`);
  }

  // Missing dateModified on Article/BlogPosting pages
  if (!state.hasDateModified && state.jsonLdContent.length > 0) {
    const hasArticleSchema = state.jsonLdContent.some(raw =>
      raw.includes('Article') || raw.includes('BlogPosting')
    );
    if (hasArticleSchema) {
      add('missing-date-modified', 'Article/BlogPosting schema found but no dateModified — search engines use this for content freshness signals');
    }
  }

  // Hreflang self-reference check
  if (state.hreflangTags.length > 0) {
    const pageUrl = state.canonicalUrl || '';
    const hasSelf = state.hreflangTags.some(tag => {
      if (!pageUrl) return false;
      return tag.href === pageUrl || tag.href.endsWith('/' + path.basename(filePath));
    });
    if (!hasSelf && pageUrl) {
      add('hreflang-missing-self', 'Hreflang tags are present but none reference the current page URL — each page must include a self-referencing hreflang');
    }
  }

  // Hreflang invalid language codes
  if (state.hreflangTags.length > 0) {
    const invalidCodes = state.hreflangTags
      .filter(tag => !isValidLangCode(tag.lang))
      .map(tag => tag.lang);
    if (invalidCodes.length > 0) {
      add('hreflang-invalid-code', `Invalid hreflang language code(s): ${invalidCodes.join(', ')} — use valid ISO 639-1 codes`);
    }
  }

  // Readability check (Flesch-Kincaid)
  if (state.bodyText && contentWords >= 100) {
    const fkScore = fleschKincaid(state.bodyText);
    if (fkScore < 30) {
      add('low-readability', `Flesch-Kincaid readability score is ${Math.round(fkScore)} (very difficult to read) — aim for 30+ for general web content`);
    }
  }

  // Wall of text paragraphs
  if (state.paragraphs.length > 0) {
    const wallParas = state.paragraphs.filter(p => p.split(/\s+/).length > 150);
    if (wallParas.length > 0) {
      add('paragraph-wall-of-text', `${wallParas.length} paragraph(s) exceed 150 words — break up long paragraphs for better readability and scannability`);
    }
  }

  // High passive voice
  if (state.sentences && state.sentences.length >= 5) {
    const passiveCount = state.sentences.filter(s => /\b(is|are|was|were|been|being|be)\s+\w+ed\b/i.test(s)).length;
    const passiveRatio = passiveCount / state.sentences.length;
    if (passiveRatio > 0.3) {
      add('high-passive-voice', `${Math.round(passiveRatio * 100)}% of sentences use passive voice — consider using active voice for clearer, more engaging content`);
    }
  }

  // Mixed content
  if (state.httpResources.length > 0) {
    add('mixed-content', `${state.httpResources.length} resource(s) loaded over HTTP on an HTTPS page — this creates mixed content warnings and security issues`);
  }

  // Missing lazy loading
  if (state.imageCount > 3 && !state.hasLazyImages) {
    add('missing-lazy-loading', `Page has ${state.imageCount} images but none use loading="lazy" — lazy loading improves page load performance`);
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

  // --- Phase 1: Duplicate content detection ---
  if (allStates.length > 1) {
    const fingerprints = [];
    for (const { filePath, state } of allStates) {
      const words = (state.bodyText || '').toLowerCase().split(/\s+/).filter(w => w.length > 0).slice(0, 200);
      fingerprints.push({ filePath, words, wordSet: new Set(words) });
    }

    for (let i = 0; i < fingerprints.length; i++) {
      for (let j = i + 1; j < fingerprints.length; j++) {
        const a = fingerprints[i];
        const b = fingerprints[j];
        if (a.words.length < 50 || b.words.length < 50) continue;

        // Calculate word overlap percentage
        const smaller = a.wordSet.size <= b.wordSet.size ? a.wordSet : b.wordSet;
        const larger = a.wordSet.size > b.wordSet.size ? a.wordSet : b.wordSet;
        let overlap = 0;
        for (const w of smaller) {
          if (larger.has(w)) overlap++;
        }
        const overlapRatio = overlap / smaller.size;

        if (overlapRatio > 0.8) {
          findings.push({
            rule: 'duplicate-content',
            severity: RULES['duplicate-content'].severity,
            file: path.relative(rootDir, a.filePath),
            message: `Content is ${Math.round(overlapRatio * 100)}% similar to "${path.relative(rootDir, b.filePath)}" — duplicate content dilutes search rankings`,
            duplicates: [path.relative(rootDir, a.filePath), path.relative(rootDir, b.filePath)],
          });
        }
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
  let scanIdx = 0;
  for (const filePath of htmlFiles) {
    scanIdx++;
    if (htmlFiles.length > 5) {
      process.stderr.write(`\x1b[2K\rScanning [${scanIdx}/${htmlFiles.length}]`);
    }
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
  if (htmlFiles.length > 5) process.stderr.write('\r\x1b[K');

  // Run per-file checks
  const perFileFindings = [];
  for (const { filePath, state } of allStates) {
    const fileFindings = checkFile(state, filePath, absRoot, { multiPage });
    perFileFindings.push(...fileFindings);
  }

  // Run cross-page checks
  const crossFindings = multiPage ? crossPageChecks(allStates, absRoot) : [];

  // --- Phase 1: Project-level checks ---
  const projectFindings = [];

  // Check for robots.txt
  const hasRobotsTxt = fileExists(path.join(absRoot, 'robots.txt')) ||
                       fileExists(path.join(absRoot, 'public', 'robots.txt'));
  if (!hasRobotsTxt) {
    projectFindings.push({
      rule: 'missing-robots-txt',
      severity: RULES['missing-robots-txt'].severity,
      file: '',
      message: 'No robots.txt found — search engines need this to understand crawling rules',
    });
  }

  // Check for sitemap.xml
  const hasSitemapXml = fileExists(path.join(absRoot, 'sitemap.xml')) ||
                        fileExists(path.join(absRoot, 'public', 'sitemap.xml'));
  if (!hasSitemapXml) {
    projectFindings.push({
      rule: 'missing-sitemap-xml',
      severity: RULES['missing-sitemap-xml'].severity,
      file: '',
      message: 'No sitemap.xml found — search engines use sitemaps to discover and prioritize pages',
    });
  }

  const allFindings = [...perFileFindings, ...crossFindings, ...projectFindings];

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
