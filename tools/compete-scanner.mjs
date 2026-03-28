/**
 * compete-scanner.mjs — Competitive X-Ray: compare your site against any competitor URL.
 * Fetches a competitor page, analyzes tech stack, SEO signals, content depth,
 * and compares side-by-side with your local project.
 *
 * Usage:
 *   node tools/compete-scanner.mjs <competitor-url> [your-directory]
 *
 * Output: JSON with side-by-side comparison.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';
import { fetchPage } from './lib/url-fetcher.mjs';
import { validateSchema } from './schema-engine.mjs';

// ---------------------------------------------------------------------------
// Tech stack detection patterns (Wappalyzer-style)
// ---------------------------------------------------------------------------

const TECH_STACK_PATTERNS = [
  // Frameworks — meta generators
  { signal: 'meta-generator', match: 'wordpress', tech: 'WordPress', category: 'CMS' },
  { signal: 'meta-generator', match: 'drupal', tech: 'Drupal', category: 'CMS' },
  { signal: 'meta-generator', match: 'joomla', tech: 'Joomla', category: 'CMS' },
  { signal: 'meta-generator', match: 'ghost', tech: 'Ghost', category: 'CMS' },
  { signal: 'meta-generator', match: 'squarespace', tech: 'Squarespace', category: 'Platform' },
  { signal: 'meta-generator', match: 'wix', tech: 'Wix', category: 'Platform' },
  { signal: 'meta-generator', match: 'webflow', tech: 'Webflow', category: 'Platform' },
  { signal: 'meta-generator', match: 'hugo', tech: 'Hugo', category: 'SSG' },
  { signal: 'meta-generator', match: 'gatsby', tech: 'Gatsby', category: 'Framework' },
  { signal: 'meta-generator', match: 'jekyll', tech: 'Jekyll', category: 'SSG' },
  { signal: 'meta-generator', match: 'hexo', tech: 'Hexo', category: 'SSG' },
  { signal: 'meta-generator', match: 'astro', tech: 'Astro', category: 'Framework' },

  // Frameworks — script/HTML patterns
  { signal: 'html', match: '__next', tech: 'Next.js', category: 'Framework' },
  { signal: 'html', match: '__nuxt', tech: 'Nuxt', category: 'Framework' },
  { signal: 'html', match: '__svelte', tech: 'SvelteKit', category: 'Framework' },
  { signal: 'html', match: 'ng-version', tech: 'Angular', category: 'Framework' },
  { signal: 'html', match: 'data-reactroot', tech: 'React', category: 'Framework' },
  { signal: 'html', match: 'data-react-helmet', tech: 'React', category: 'Framework' },
  { signal: 'html', match: 'data-vue-', tech: 'Vue.js', category: 'Framework' },
  { signal: 'html', match: 'data-astro-', tech: 'Astro', category: 'Framework' },
  { signal: 'html', match: 'data-gatsby', tech: 'Gatsby', category: 'Framework' },
  { signal: 'html', match: 'data-turbo', tech: 'Hotwire/Turbo', category: 'Framework' },

  // CDNs and hosting
  { signal: 'html', match: 'cdn.shopify.com', tech: 'Shopify', category: 'E-commerce' },
  { signal: 'html', match: 'bigcommerce.com', tech: 'BigCommerce', category: 'E-commerce' },
  { signal: 'html', match: 'cdn.jsdelivr.net', tech: 'jsDelivr CDN', category: 'CDN' },
  { signal: 'html', match: 'cdnjs.cloudflare.com', tech: 'Cloudflare CDN', category: 'CDN' },
  { signal: 'html', match: 'unpkg.com', tech: 'unpkg CDN', category: 'CDN' },

  // CSS frameworks
  { signal: 'html', match: 'tailwindcss', tech: 'Tailwind CSS', category: 'CSS' },
  { signal: 'html', match: 'bootstrap', tech: 'Bootstrap', category: 'CSS' },
  { signal: 'html', match: 'bulma', tech: 'Bulma', category: 'CSS' },
  { signal: 'html', match: 'chakra-ui', tech: 'Chakra UI', category: 'CSS' },

  // Analytics
  { signal: 'html', match: 'googletagmanager.com', tech: 'Google Tag Manager', category: 'Analytics' },
  { signal: 'html', match: 'google-analytics.com', tech: 'Google Analytics', category: 'Analytics' },
  { signal: 'html', match: 'plausible.io', tech: 'Plausible', category: 'Analytics' },
  { signal: 'html', match: 'posthog.com', tech: 'PostHog', category: 'Analytics' },
  { signal: 'html', match: 'hotjar.com', tech: 'Hotjar', category: 'Analytics' },
  { signal: 'html', match: 'clarity.ms', tech: 'Microsoft Clarity', category: 'Analytics' },
  { signal: 'html', match: 'segment.com', tech: 'Segment', category: 'Analytics' },
  { signal: 'html', match: 'mixpanel.com', tech: 'Mixpanel', category: 'Analytics' },
  { signal: 'html', match: 'amplitude.com', tech: 'Amplitude', category: 'Analytics' },
  { signal: 'html', match: 'heapanalytics.com', tech: 'Heap', category: 'Analytics' },
  { signal: 'html', match: 'fullstory.com', tech: 'FullStory', category: 'Analytics' },

  // Payments
  { signal: 'html', match: 'js.stripe.com', tech: 'Stripe', category: 'Payments' },
  { signal: 'html', match: 'paypal.com/sdk', tech: 'PayPal', category: 'Payments' },
  { signal: 'html', match: 'paddle.js', tech: 'Paddle', category: 'Payments' },
  { signal: 'html', match: 'lemonsqueezy', tech: 'Lemon Squeezy', category: 'Payments' },

  // Chat & support
  { signal: 'html', match: 'intercom.io', tech: 'Intercom', category: 'Chat' },
  { signal: 'html', match: 'crisp.chat', tech: 'Crisp', category: 'Chat' },
  { signal: 'html', match: 'drift.com', tech: 'Drift', category: 'Chat' },
  { signal: 'html', match: 'tawk.to', tech: 'Tawk.to', category: 'Chat' },
  { signal: 'html', match: 'zendesk.com', tech: 'Zendesk', category: 'Chat' },
  { signal: 'html', match: 'hubspot.com', tech: 'HubSpot', category: 'Marketing' },

  // Performance / monitoring
  { signal: 'html', match: 'sentry.io', tech: 'Sentry', category: 'Monitoring' },
  { signal: 'html', match: 'newrelic.com', tech: 'New Relic', category: 'Monitoring' },
  { signal: 'html', match: 'datadog', tech: 'Datadog', category: 'Monitoring' },
  { signal: 'html', match: 'logrocket.com', tech: 'LogRocket', category: 'Monitoring' },

  // Fonts
  { signal: 'html', match: 'fonts.googleapis.com', tech: 'Google Fonts', category: 'Fonts' },
  { signal: 'html', match: 'use.typekit.net', tech: 'Adobe Fonts', category: 'Fonts' },
];

// ---------------------------------------------------------------------------
// Conversion signal patterns
// ---------------------------------------------------------------------------

const CONVERSION_PATTERNS = [
  { match: 'free trial', signal: 'Free trial CTA' },
  { match: 'start free', signal: 'Free trial CTA' },
  { match: 'try free', signal: 'Free trial CTA' },
  { match: 'get started', signal: 'Get started CTA' },
  { match: 'sign up', signal: 'Sign up CTA' },
  { match: 'book a demo', signal: 'Demo booking' },
  { match: 'schedule a demo', signal: 'Demo booking' },
  { match: 'request demo', signal: 'Demo booking' },
  { match: 'pricing', signal: 'Pricing page/section' },
  { match: '/pricing', signal: 'Pricing page link' },
  { match: 'buy now', signal: 'Buy now CTA' },
  { match: 'add to cart', signal: 'E-commerce cart' },
  { match: 'subscribe', signal: 'Subscription CTA' },
  { match: 'join waitlist', signal: 'Waitlist' },
  { match: 'early access', signal: 'Early access' },
  { match: 'contact sales', signal: 'Sales contact' },
  { match: 'talk to sales', signal: 'Sales contact' },
  { match: 'money-back', signal: 'Money-back guarantee' },
  { match: 'testimonial', signal: 'Social proof (testimonials)' },
  { match: 'trusted by', signal: 'Social proof (trust badges)' },
  { match: 'as seen', signal: 'Social proof (press)' },
  { match: 'customers', signal: 'Customer count' },
  { match: 'case stud', signal: 'Case studies' },
  { match: 'review', signal: 'Reviews/ratings' },
];

// ---------------------------------------------------------------------------
// Analysis functions
// ---------------------------------------------------------------------------

/**
 * Detect tech stack from HTML content.
 * @param {string} html
 * @returns {{ tech: string, category: string }[]}
 */
function detectTechStack(html) {
  const detected = new Map();
  const lower = html.toLowerCase();

  // Check for meta generator tag
  const genMatch = lower.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/);
  const generator = genMatch ? genMatch[1].toLowerCase() : '';

  for (const p of TECH_STACK_PATTERNS) {
    if (p.signal === 'meta-generator' && generator && generator.includes(p.match)) {
      detected.set(p.tech, p.category);
    } else if (p.signal === 'html' && lower.includes(p.match)) {
      detected.set(p.tech, p.category);
    }
  }

  return [...detected].map(([tech, category]) => ({ tech, category }));
}

/**
 * Detect conversion signals in HTML content.
 * @param {string} html
 * @returns {string[]} detected signal descriptions
 */
function detectConversionSignals(html) {
  const lower = html.toLowerCase();
  const found = new Set();
  for (const { match, signal } of CONVERSION_PATTERNS) {
    if (lower.includes(match)) {
      found.add(signal);
    }
  }
  return [...found];
}

/**
 * Analyze a parsed page state into a comparable profile.
 * @param {object} state — PageState from parseHtml
 * @param {string} html — raw HTML string
 * @returns {object} analysis profile
 */
function analyzeProfile(state, html) {
  // Schema types
  const schemaTypes = [];
  const schemaIssues = [];
  for (const raw of state.jsonLdContent) {
    try {
      const data = JSON.parse(raw);
      const type = data['@type'] || 'Unknown';
      schemaTypes.push(type);
      const issues = validateSchema(data);
      if (issues.length > 0) {
        schemaIssues.push({ type, issues });
      }
    } catch { /* skip malformed */ }
  }

  // Content depth
  const wordCount = state.mainContentWordCount || state.wordCount;
  const h2Count = state.h2Texts.length;
  const headingCount = state.headingLevels.length;
  const internalLinkCount = state.internalLinks.length;
  const externalLinkCount = state.externalLinks.length;

  return {
    // Meta
    hasTitle: state.hasTitle,
    title: state.titleText || null,
    titleLength: state.titleText ? state.titleText.length : 0,
    hasMetaDescription: state.hasMetaDescription,
    metaDescription: state.metaDescriptionText || null,
    metaDescriptionLength: state.metaDescriptionText ? state.metaDescriptionText.length : 0,
    hasCanonical: state.hasCanonical,
    hasLang: state.hasLang,
    lang: state.langValue || null,

    // Open Graph
    hasOgTitle: state.hasOgTitle,
    hasOgDescription: state.hasOgDescription,
    hasOgImage: state.hasOgImage,
    hasOgUrl: state.hasOgUrl,
    hasTwitterCard: state.hasTwitterCard,

    // Content depth
    wordCount,
    h1: state.h1Text || null,
    h1Count: state.h1Count,
    h2Count,
    headingCount,
    internalLinkCount,
    externalLinkCount,

    // Technical
    hasViewport: state.hasViewport,
    hasCharset: state.hasCharset,
    hasFavicon: state.hasFavicon,
    hasAnalytics: state.hasAnalytics,
    analyticsProvider: state.analyticsProvider,
    hasMain: state.hasMain,
    hasNav: state.hasNav,
    hasFooter: state.hasFooter,

    // Structured data
    jsonLdCount: state.jsonLdScripts,
    schemaTypes,
    schemaIssues,

    // Tech stack
    techStack: detectTechStack(html),

    // Conversion
    conversionSignals: detectConversionSignals(html),

    // Scripts
    totalScripts: state.totalScripts,
    deferredScripts: state.deferredScripts,
    blockingScripts: state.totalScripts - state.deferredScripts,
  };
}

/**
 * Build a comparison verdicts array from two profiles.
 * Each verdict: { area, you, them, winner: 'you'|'them'|'tie', detail }
 */
function buildVerdicts(yours, theirs) {
  const verdicts = [];

  function v(area, youVal, themVal, detail = '') {
    let winner = 'tie';
    if (youVal > themVal) winner = 'you';
    else if (themVal > youVal) winner = 'them';
    verdicts.push({ area, you: youVal, them: themVal, winner, detail });
  }

  function bool(area, youVal, themVal, detail = '') {
    const youScore = youVal ? 1 : 0;
    const themScore = themVal ? 1 : 0;
    let winner = 'tie';
    if (youScore > themScore) winner = 'you';
    else if (themScore > youScore) winner = 'them';
    verdicts.push({ area, you: youVal ? 'Yes' : 'No', them: themVal ? 'Yes' : 'No', winner, detail });
  }

  // SEO signals
  bool('Title tag', yours.hasTitle, theirs.hasTitle);
  v('Title length', yours.titleLength, theirs.titleLength, 'Optimal: 50-60 chars');
  bool('Meta description', yours.hasMetaDescription, theirs.hasMetaDescription);
  v('Meta desc length', yours.metaDescriptionLength, theirs.metaDescriptionLength, 'Optimal: 120-160 chars');
  bool('Canonical URL', yours.hasCanonical, theirs.hasCanonical);
  bool('Language attribute', yours.hasLang, theirs.hasLang);
  bool('Viewport meta', yours.hasViewport, theirs.hasViewport);

  // Open Graph
  const yourOg = [yours.hasOgTitle, yours.hasOgDescription, yours.hasOgImage, yours.hasOgUrl].filter(Boolean).length;
  const theirOg = [theirs.hasOgTitle, theirs.hasOgDescription, theirs.hasOgImage, theirs.hasOgUrl].filter(Boolean).length;
  v('Open Graph tags', yourOg, theirOg, 'Out of 4: title, desc, image, url');

  bool('Twitter Card', yours.hasTwitterCard, theirs.hasTwitterCard);

  // Content depth
  v('Word count', yours.wordCount, theirs.wordCount, 'More content = better topical coverage');
  v('H2 headings', yours.h2Count, theirs.h2Count, 'More sections = better structure');
  v('Total headings', yours.headingCount, theirs.headingCount);
  v('Internal links', yours.internalLinkCount, theirs.internalLinkCount);
  v('External links', yours.externalLinkCount, theirs.externalLinkCount);

  // Structured data
  v('JSON-LD schemas', yours.jsonLdCount, theirs.jsonLdCount);
  v('Schema types', yours.schemaTypes.length, theirs.schemaTypes.length);

  // Performance signals
  v('Blocking scripts', theirs.blockingScripts, yours.blockingScripts, 'Lower is better (reversed)');

  // Conversion
  v('Conversion signals', yours.conversionSignals.length, theirs.conversionSignals.length);

  // Semantic HTML
  const yourSemantic = [yours.hasMain, yours.hasNav, yours.hasFooter].filter(Boolean).length;
  const theirSemantic = [theirs.hasMain, theirs.hasNav, theirs.hasFooter].filter(Boolean).length;
  v('Semantic HTML', yourSemantic, theirSemantic, 'main, nav, footer elements');

  return verdicts;
}

// ---------------------------------------------------------------------------
// Aggregate local project profile (best-of across all pages)
// ---------------------------------------------------------------------------

/**
 * Scan local directory and produce an aggregated profile for the best representative page.
 * Uses the homepage (index.html) if available, otherwise the richest page.
 * @param {string} rootDir
 * @returns {{ profile: object, html: string, file: string }|null}
 */
function scanLocalProject(rootDir) {
  const htmlFiles = findHtmlFiles(rootDir);
  if (htmlFiles.length === 0) return null;

  // Prefer index.html or the file with the most content
  let bestFile = htmlFiles[0];
  let bestScore = -1;

  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    const basename = path.basename(filePath).toLowerCase();
    const isIndex = basename === 'index.html' || basename === 'index.htm';

    // Score: index gets a big boost, then rank by file size (proxy for content richness)
    const score = (isIndex ? 100000 : 0) + sizeCheck.size;
    if (score > bestScore) {
      bestScore = score;
      bestFile = filePath;
    }
  }

  let html;
  try {
    html = fs.readFileSync(bestFile, 'utf8');
  } catch {
    return null;
  }

  const state = parseHtml(html);
  const profile = analyzeProfile(state, html);

  return { profile, html, file: path.relative(rootDir, bestFile), totalPages: htmlFiles.length };
}

// ---------------------------------------------------------------------------
// Main: compete
// ---------------------------------------------------------------------------

/**
 * Run competitive analysis: fetch competitor URL, scan local project, compare.
 * @param {string} competitorUrl — URL to analyze
 * @param {string} localDir — local project directory
 * @returns {Promise<object>} comparison result
 */
export async function compete(competitorUrl, localDir) {
  // 1. Fetch and analyze competitor
  const fetched = await fetchPage(competitorUrl);
  const competitorState = parseHtml(fetched.html);
  const competitorProfile = analyzeProfile(competitorState, fetched.html);

  // 2. Scan local project
  const local = scanLocalProject(localDir);
  if (!local) {
    return {
      error: 'No HTML files found in local project directory',
      competitor: {
        url: competitorUrl,
        finalUrl: fetched.finalUrl,
        profile: competitorProfile,
      },
    };
  }

  // 3. Build verdicts
  const verdicts = buildVerdicts(local.profile, competitorProfile);

  // 4. Tally wins
  const youWins = verdicts.filter(v => v.winner === 'you').length;
  const themWins = verdicts.filter(v => v.winner === 'them').length;
  const ties = verdicts.filter(v => v.winner === 'tie').length;

  // 5. Headline
  let headline;
  if (youWins > themWins) {
    headline = `You're winning ${youWins}-${themWins} (${ties} ties). Keep pushing.`;
  } else if (themWins > youWins) {
    headline = `They're ahead ${themWins}-${youWins} (${ties} ties). Time to close the gap.`;
  } else {
    headline = `Dead even at ${youWins}-${themWins} (${ties} ties). Small edges matter.`;
  }

  // 6. Key advantages and gaps
  const yourAdvantages = verdicts.filter(v => v.winner === 'you').map(v => v.area);
  const theirAdvantages = verdicts.filter(v => v.winner === 'them').map(v => v.area);

  return {
    headline,
    competitor: {
      url: competitorUrl,
      finalUrl: fetched.finalUrl,
      redirected: fetched.redirected,
      title: competitorProfile.title,
      techStack: competitorProfile.techStack,
      conversionSignals: competitorProfile.conversionSignals,
      schemaTypes: competitorProfile.schemaTypes,
    },
    you: {
      directory: localDir,
      file: local.file,
      totalPages: local.totalPages,
      title: local.profile.title,
      techStack: local.profile.techStack,
      conversionSignals: local.profile.conversionSignals,
      schemaTypes: local.profile.schemaTypes,
    },
    verdicts,
    summary: {
      youWins,
      themWins,
      ties,
      yourAdvantages,
      theirAdvantages,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0) {
  const url = args[0];
  const dir = args[1] || '.';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.error('Usage: node compete-scanner.mjs <competitor-url> [your-directory]');
    process.exit(1);
  }

  try {
    const result = await compete(url, dir);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
