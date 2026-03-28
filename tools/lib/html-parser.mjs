/**
 * html-parser.mjs — Shared SAX-based HTML parser used by ALL scanners.
 * Extracts page metadata into a structured PageState object via htmlparser2.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Parser } from 'htmlparser2';
import { checkFileSize } from './security.mjs';

// ---------------------------------------------------------------------------
// Analytics provider detection patterns
// ---------------------------------------------------------------------------

const ANALYTICS_PATTERNS = [
  // Major platforms
  { pattern: 'googletagmanager.com', provider: 'google-analytics' },
  { pattern: 'google-analytics.com', provider: 'google-analytics' },
  { pattern: 'plausible.io', provider: 'plausible' },
  { pattern: 'posthog.com', provider: 'posthog' },
  { pattern: 'amplitude.com', provider: 'amplitude' },
  { pattern: 'cdn.amplitude.com', provider: 'amplitude' },
  { pattern: 'mixpanel.com', provider: 'mixpanel' },
  { pattern: 'segment.com', provider: 'segment' },
  { pattern: 'hotjar.com', provider: 'hotjar' },
  { pattern: 'clarity.ms', provider: 'clarity' },
  { pattern: 'usefathom.com', provider: 'fathom' },
  { pattern: 'umami.is', provider: 'umami' },
  // Added — commonly used providers
  { pattern: 'heapanalytics.com', provider: 'heap' },
  { pattern: 'heap.io', provider: 'heap' },
  { pattern: 'rudderlabs.com', provider: 'rudderstack' },
  { pattern: 'rudderstack.com', provider: 'rudderstack' },
  { pattern: 'mparticle.com', provider: 'mparticle' },
  { pattern: 'intercom.io', provider: 'intercom' },
  { pattern: 'widget.intercom.io', provider: 'intercom' },
  { pattern: 'snowplow', provider: 'snowplow' },
  { pattern: 'matomo', provider: 'matomo' },
  { pattern: 'pirsch.io', provider: 'pirsch' },
  { pattern: 'splitbee.io', provider: 'splitbee' },
  { pattern: 'simple-analytics.com', provider: 'simple-analytics' },
  { pattern: 'simpleanalytics.com', provider: 'simple-analytics' },
  { pattern: 'va.vercel-scripts.com', provider: 'vercel-analytics' },
  { pattern: 'vitals.vercel-insights.com', provider: 'vercel-analytics' },
  { pattern: 'counter.dev', provider: 'counter' },
  { pattern: 'goatcounter.com', provider: 'goatcounter' },
  { pattern: 'newrelic.com', provider: 'new-relic' },
  { pattern: 'nr-data.net', provider: 'new-relic' },
  { pattern: 'fullstory.com', provider: 'fullstory' },
  { pattern: 'logrocket.com', provider: 'logrocket' },
  { pattern: 'logr-ingest.com', provider: 'logrocket' },
];

// ---------------------------------------------------------------------------
// createPageState — default PageState object
// ---------------------------------------------------------------------------

function createPageState() {
  return {
    // Title
    hasTitle: false,
    titleText: '',

    // Meta
    hasMetaDescription: false,
    metaDescriptionText: '',
    hasViewport: false,
    hasCharset: false,
    hasNoindex: false,
    hasRobotsMeta: false,
    robotsDirectives: '',

    // OG
    hasOgTitle: false,
    hasOgDescription: false,
    hasOgImage: false,
    ogImageUrl: '',
    hasOgUrl: false,
    hasTwitterCard: false,
    hasTwitterImage: false,

    // Links (head)
    hasCanonical: false,
    canonicalUrl: '',
    hasHreflang: false,

    // HTML attributes
    hasLang: false,
    langValue: '',
    hasFavicon: false,
    hasManifest: false,
    hasThemeColor: false,

    // Headings
    h1Count: 0,
    h1Text: '',
    h2Texts: [],
    headingLevels: [],

    // Images
    imagesWithoutAlt: 0,
    imagesWithoutDimensions: 0,

    // Semantic HTML
    hasMain: false,
    hasNav: false,
    hasFooter: false,
    hasArticle: false,

    // Links (body)
    internalLinks: [],
    externalLinks: [],

    // Structured data
    jsonLdScripts: 0,
    jsonLdContent: [],

    // Analytics
    hasAnalytics: false,
    analyticsProvider: null,

    // Content
    wordCount: 0,
    mainContentWordCount: 0,
    bodyText: '',
    viewportContent: '',

    // Scripts
    preloadLinks: [],
    deferredScripts: 0,
    totalScripts: 0,

    hasAmpVersion: false,
  };
}

// ---------------------------------------------------------------------------
// parseHtml — main SAX-based parser
// ---------------------------------------------------------------------------

/**
 * Parse an HTML string and return a PageState object.
 * @param {string} htmlString
 * @returns {object} PageState
 */
export function parseHtml(htmlString) {
  const state = createPageState();

  // Parser cursor state
  let inTitle = false;
  let inBody = false;
  let inScript = false;
  let inStyle = false;
  let inHeading = false;
  let currentHeadingLevel = 0;
  let isJsonLd = false;
  let currentHeadingText = '';
  let currentScriptSrc = '';
  let inlineScriptBuffer = '';
  let bodyTextBuffer = '';
  let mainTextBuffer = '';
  let inMain = false;

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const tag = name.toLowerCase();

        // <html>
        if (tag === 'html') {
          if (attribs.lang) {
            state.hasLang = true;
            state.langValue = attribs.lang;
          }
          return;
        }

        // <title>
        if (tag === 'title') {
          inTitle = true;
          return;
        }

        // <meta>
        if (tag === 'meta') {
          const nameLower = (attribs.name || '').toLowerCase();
          const propLower = (attribs.property || '').toLowerCase();
          const httpEquiv = (attribs['http-equiv'] || '').toLowerCase();
          const content = attribs.content || '';

          // charset
          if (attribs.charset || httpEquiv === 'content-type') {
            state.hasCharset = true;
          }

          // viewport
          if (nameLower === 'viewport') {
            state.hasViewport = true;
            state.viewportContent = content;
          }

          // description
          if (nameLower === 'description') {
            state.hasMetaDescription = true;
            state.metaDescriptionText = content;
          }

          // robots
          if (nameLower === 'robots') {
            state.hasRobotsMeta = true;
            state.robotsDirectives = content;
            if (content.toLowerCase().includes('noindex')) {
              state.hasNoindex = true;
            }
          }

          // theme-color
          if (nameLower === 'theme-color') {
            state.hasThemeColor = true;
          }

          // OG tags
          if (propLower === 'og:title') {
            state.hasOgTitle = true;
          }
          if (propLower === 'og:description') {
            state.hasOgDescription = true;
          }
          if (propLower === 'og:image') {
            state.hasOgImage = true;
            state.ogImageUrl = content;
          }
          if (propLower === 'og:url') {
            state.hasOgUrl = true;
          }

          // Twitter card
          if (nameLower === 'twitter:card') {
            state.hasTwitterCard = true;
          }
          if (nameLower === 'twitter:image') {
            state.hasTwitterImage = true;
          }

          return;
        }

        // <link>
        if (tag === 'link') {
          const rel = (attribs.rel || '').toLowerCase();
          const href = attribs.href || '';

          if (rel === 'canonical') {
            state.hasCanonical = true;
            state.canonicalUrl = href;
          }
          if (rel === 'alternate' && attribs.hreflang) {
            state.hasHreflang = true;
          }
          if (rel === 'icon' || rel === 'shortcut icon' || rel === 'apple-touch-icon') {
            state.hasFavicon = true;
          }
          if (rel === 'manifest') {
            state.hasManifest = true;
          }
          if (rel === 'amphtml') {
            state.hasAmpVersion = true;
          }
          if (rel === 'preload') {
            state.preloadLinks.push(href);
          }

          return;
        }

        // <script>
        if (tag === 'script') {
          const scriptType = (attribs.type || '').toLowerCase();
          const src = attribs.src || '';

          if (scriptType === 'application/ld+json') {
            isJsonLd = true;
            inScript = true;
            return;
          }

          // Count total and deferred scripts
          // type="module" is deferred by default per HTML spec
          state.totalScripts++;
          if (attribs.async !== undefined || attribs.defer !== undefined || scriptType === 'module') {
            state.deferredScripts++;
          }

          // Analytics detection via src
          if (src && !state.hasAnalytics) {
            for (const { pattern, provider } of ANALYTICS_PATTERNS) {
              if (src.includes(pattern)) {
                state.hasAnalytics = true;
                state.analyticsProvider = provider;
                break;
              }
            }
          }

          inScript = true;
          currentScriptSrc = src;
          return;
        }

        // <style>
        if (tag === 'style') {
          inStyle = true;
          return;
        }

        // <body>
        if (tag === 'body') {
          inBody = true;
          return;
        }

        // Headings <h1>-<h6>
        if (/^h[1-6]$/.test(tag)) {
          const level = parseInt(tag[1], 10);
          inHeading = true;
          currentHeadingLevel = level;
          currentHeadingText = '';
          state.headingLevels.push(level);
          return;
        }

        // <img>
        if (tag === 'img') {
          const alt = attribs.alt;
          const width = attribs.width;
          const height = attribs.height;

          if (alt === undefined || alt === null) {
            state.imagesWithoutAlt++;
          }
          if (!width || !height) {
            state.imagesWithoutDimensions++;
          }
          return;
        }

        // Semantic HTML
        if (tag === 'main') { state.hasMain = true; inMain = true; return; }
        if (tag === 'nav') { state.hasNav = true; return; }
        if (tag === 'footer') { state.hasFooter = true; return; }
        if (tag === 'article') { state.hasArticle = true; return; }

        // <a> — link classification
        if (tag === 'a') {
          const href = attribs.href || '';
          if (!href) return;

          if (href.startsWith('http://') || href.startsWith('https://')) {
            state.externalLinks.push(href);
          } else if (href.startsWith('/') || href.startsWith('./')) {
            state.internalLinks.push(href);
          }
          return;
        }
      },

      ontext(text) {
        // Title text
        if (inTitle) {
          state.titleText += text;
          return;
        }

        // Heading text
        if (inHeading) {
          currentHeadingText += text;
          return;
        }

        // JSON-LD content
        if (isJsonLd) {
          // Handled in onclosetag
          state.jsonLdContent.push(text);
          return;
        }

        // Inline script content — accumulate for analytics detection
        if (inScript && !isJsonLd) {
          inlineScriptBuffer += text;
          return;
        }

        // Body text (skip script/style)
        if (inBody && !inScript && !inStyle) {
          bodyTextBuffer += text + ' ';
          if (inMain) {
            mainTextBuffer += text + ' ';
          }
        }
      },

      onclosetag(name) {
        const tag = name.toLowerCase();

        if (tag === 'title') {
          state.titleText = state.titleText.trim();
          if (state.titleText) {
            state.hasTitle = true;
          }
          inTitle = false;
          return;
        }

        if (tag === 'script') {
          if (isJsonLd) {
            state.jsonLdScripts++;
            isJsonLd = false;
          }
          // Check inline script content for analytics patterns (catches lazy-loaded GA etc.)
          if (!state.hasAnalytics && !currentScriptSrc && inlineScriptBuffer) {
            for (const { pattern, provider } of ANALYTICS_PATTERNS) {
              if (inlineScriptBuffer.includes(pattern)) {
                state.hasAnalytics = true;
                state.analyticsProvider = provider;
                break;
              }
            }
          }
          inScript = false;
          currentScriptSrc = '';
          inlineScriptBuffer = '';
          return;
        }

        if (tag === 'style') {
          inStyle = false;
          return;
        }

        if (tag === 'main') {
          inMain = false;
          return;
        }

        if (tag === 'body') {
          inBody = false;
          return;
        }

        if (/^h[1-6]$/.test(tag)) {
          const trimmed = currentHeadingText.trim();
          if (currentHeadingLevel === 1) {
            state.h1Count++;
            if (!state.h1Text) {
              state.h1Text = trimmed;
            }
          } else if (currentHeadingLevel === 2) {
            state.h2Texts.push(trimmed);
          }
          inHeading = false;
          currentHeadingLevel = 0;
          currentHeadingText = '';
          return;
        }
      },
    },
    { decodeEntities: true }
  );

  parser.write(htmlString);
  parser.end();

  // Word count from body text buffer
  const trimmed = bodyTextBuffer.trim();
  if (trimmed) {
    state.wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    state.bodyText = trimmed;
  }

  // Main-content word count (falls back to total if no <main> element)
  const mainTrimmed = mainTextBuffer.trim();
  if (mainTrimmed) {
    state.mainContentWordCount = mainTrimmed.split(/\s+/).filter(Boolean).length;
  } else {
    state.mainContentWordCount = state.wordCount;
  }

  // Deduplicate JSON-LD content — text events fire once per script block
  // so we need to consolidate per-script captures
  // (each JSON-LD block's text is already pushed as a single entry during onclosetag counting)

  return state;
}

// ---------------------------------------------------------------------------
// detectPageType — classify page type from URL path + parsed state
// ---------------------------------------------------------------------------

/**
 * Page type patterns — ordered by priority (first match wins).
 * Each entry: { type, patterns[] } where patterns are matched against
 * the lowercase URL path, title, and h1 text.
 */
const PAGE_TYPE_RULES = [
  { type: 'contact',  patterns: ['contact', 'get in touch', 'reach us'] },
  { type: 'terms',    patterns: ['terms', 'conditions', 'tos', 'terms-of-service'] },
  { type: 'privacy',  patterns: ['privacy', 'cookie policy', 'gdpr'] },
  { type: 'legal',    patterns: ['legal', 'disclaimer', 'imprint'] },
  { type: 'login',    patterns: ['login', 'signin', 'sign-in', 'register', 'signup'] },
  { type: '404',      patterns: ['404', 'not found', 'page not found'] },
  { type: 'sitemap',  patterns: ['sitemap'] },
];

/**
 * Detect the page type from the file path / URL and parsed HTML state.
 * Returns a page type string: 'contact', 'terms', 'privacy', 'legal',
 * 'login', '404', 'sitemap', or 'content' (default).
 *
 * @param {string} filePath — file path or URL (used for path-based signals)
 * @param {object} state — PageState from parseHtml
 * @returns {string} page type
 */
export function detectPageType(filePath, state) {
  // Build a combined haystack from path, title, and h1
  const pathLower = (filePath || '').toLowerCase();
  const titleLower = (state.titleText || '').toLowerCase();
  const h1Lower = (state.h1Text || '').toLowerCase();

  for (const { type, patterns } of PAGE_TYPE_RULES) {
    for (const pattern of patterns) {
      if (pathLower.includes(pattern) || titleLower.includes(pattern) || h1Lower.includes(pattern)) {
        return type;
      }
    }
  }

  return 'content';
}

// ---------------------------------------------------------------------------
// parseHtmlFile — read file then parseHtml
// ---------------------------------------------------------------------------

/**
 * Read a file, check size, then parse it.
 * @param {string} filePath — absolute path to HTML file
 * @returns {object|null} PageState or null if file too large/unreadable
 */
export async function parseHtmlFile(filePath) {
  const sizeCheck = checkFileSize(filePath, fs.statSync);
  if (!sizeCheck.ok) {
    return null;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  return parseHtml(content);
}

// ---------------------------------------------------------------------------
// findHtmlFiles — recursively find .html/.htm files
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.cache', '.turbo', 'public']);
// Files that look like HTML but aren't real pages (e.g., Google/Bing site verification)
const SKIP_FILE_PATTERNS = [/^google[a-f0-9]+\.html$/, /^bing[a-f0-9]+\.html$/, /^yandex_[a-f0-9]+\.html$/];

/**
 * Recursively find all .html/.htm files under a directory.
 * Skips node_modules, .git, .next. Includes dist/build if they contain HTML.
 * @param {string} dir — absolute directory path
 * @returns {string[]} array of absolute file paths
 */
export function findHtmlFiles(dir) {
  const results = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.html' || ext === '.htm') {
          // Skip search engine verification files
          if (SKIP_FILE_PATTERNS.some(p => p.test(entry.name))) continue;
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}
