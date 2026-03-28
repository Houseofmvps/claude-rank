/**
 * geo-scanner.mjs — GEO (Generative Engine Optimization) scanner with 34 rules.
 * Scans a directory for AI search engine optimization signals and returns a
 * structured findings + score report.
 *
 * GEO = optimization for AI search engines (ChatGPT, Perplexity, Google AI Overviews).
 * NOT geographic optimization.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

const RULES = {
  // Critical (-20)
  'noindex-blocks-ai':          { severity: 'critical', deduction: 20 },

  // High (-10)
  'missing-robots-ai-access':   { severity: 'high', deduction: 10 },
  'gptbot-blocked':             { severity: 'high', deduction: 10 },
  'perplexitybot-blocked':      { severity: 'high', deduction: 10 },
  'claudeweb-blocked':          { severity: 'high', deduction: 10 },
  'google-extended-blocked':    { severity: 'high', deduction: 10 },
  'missing-structured-data':    { severity: 'high', deduction: 10 },
  'missing-llms-txt':           { severity: 'high', deduction: 10 },
  'no-sitemap-for-ai':          { severity: 'high', deduction: 10 },

  // Medium (-5)
  'no-ai-bot-rules':            { severity: 'medium', deduction: 5 },
  'ccbot-blocked':              { severity: 'medium', deduction: 5 },
  'missing-organization-schema':{ severity: 'medium', deduction: 5 },
  'missing-author-schema':      { severity: 'medium', deduction: 5 },
  'missing-main-for-ai':        { severity: 'medium', deduction: 5 },
  'no-question-headers':        { severity: 'medium', deduction: 5 },
  'few-question-headers':       { severity: 'medium', deduction: 5 },
  'thin-content-ai':            { severity: 'medium', deduction: 5 },
  'no-definition-patterns':     { severity: 'medium', deduction: 5 },
  'no-comparison-tables':       { severity: 'medium', deduction: 5 },
  'no-statistics-patterns':     { severity: 'medium', deduction: 5 },
  'missing-publication-date':   { severity: 'medium', deduction: 5 },
  'missing-breadcrumb-schema':  { severity: 'medium', deduction: 5 },

  // Medium (-5) — new deeper rules
  'js-rendered-content':        { severity: 'medium', deduction: 5 },
  'no-faq-schema':              { severity: 'medium', deduction: 5 },
  'no-howto-schema':            { severity: 'medium', deduction: 5 },
  'no-meta-description-ai':     { severity: 'medium', deduction: 5 },
  'no-canonical-url':           { severity: 'medium', deduction: 5 },
  'no-lang-attribute':          { severity: 'medium', deduction: 5 },

  // Low (-2)
  'no-faq-section':             { severity: 'low', deduction: 2 },
  'content-not-citation-ready': { severity: 'low', deduction: 2 },
  'no-listicle-structure':      { severity: 'low', deduction: 2 },
  'no-about-page':              { severity: 'low', deduction: 2 },
  'no-internal-links':          { severity: 'low', deduction: 2 },
  'short-meta-description':     { severity: 'low', deduction: 2 },
};

// ---------------------------------------------------------------------------
// Question words that indicate AI-friendly H2 headers
// ---------------------------------------------------------------------------

const QUESTION_WORDS = new Set([
  'what', 'how', 'why', 'when', 'where', 'who', 'which',
  'can', 'does', 'is', 'are', 'do', 'should', 'will',
]);

// ---------------------------------------------------------------------------
// Robots.txt parser
// ---------------------------------------------------------------------------

/**
 * Parse a robots.txt string and return structured info about AI bot access.
 * @param {string} content
 * @returns {{ hasSitemap: boolean, blockedBots: Set<string>, hasAiBotRules: boolean }}
 */
function parseRobotsTxt(content) {
  const lines = content.split(/\r?\n/);

  let currentAgents = [];
  const disallowedBots = new Set();
  const allowedBots = new Set();
  let hasSitemap = false;
  let hasAiBotRules = false;

  // Normalised names of AI bots we care about
  const AI_BOT_NAMES = new Set([
    'gptbot', 'perplexitybot', 'claudebot', 'claude-web',
    'google-extended', 'ccbot',
  ]);

  for (const raw of lines) {
    const line = raw.trim();

    // Sitemap directive (anywhere in file)
    if (/^sitemap\s*:/i.test(line)) {
      hasSitemap = true;
      continue;
    }

    // Comment or empty
    if (!line || line.startsWith('#')) {
      // A blank line ends the current user-agent block
      currentAgents = [];
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const directive = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (directive === 'user-agent') {
      currentAgents.push(value.toLowerCase());
      if (AI_BOT_NAMES.has(value.toLowerCase())) {
        hasAiBotRules = true;
      }
      continue;
    }

    if (directive === 'disallow') {
      for (const agent of currentAgents) {
        if (value === '/' && AI_BOT_NAMES.has(agent)) {
          disallowedBots.add(agent);
        }
      }
      continue;
    }

    if (directive === 'allow') {
      for (const agent of currentAgents) {
        if (AI_BOT_NAMES.has(agent)) {
          allowedBots.add(agent);
        }
      }
      continue;
    }
  }

  // A bot is "blocked" only if it has a Disallow: / without a counteracting Allow: /
  const blockedBots = new Set();
  for (const bot of disallowedBots) {
    if (!allowedBots.has(bot)) {
      blockedBots.add(bot);
    }
  }

  return { hasSitemap, blockedBots, hasAiBotRules };
}

// ---------------------------------------------------------------------------
// JSON-LD schema type detection
// ---------------------------------------------------------------------------

/**
 * Extract @type values from JSON-LD content strings.
 * @param {string[]} jsonLdContent
 * @returns {Set<string>}
 */
function extractSchemaTypes(jsonLdContent) {
  const types = new Set();

  function walkSchema(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (const item of obj) walkSchema(item);
      return;
    }
    if (obj['@type']) {
      const t = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
      for (const type of t) types.add(type);
    }
    // Walk all nested objects to find embedded schemas (e.g., author: { @type: "Person" })
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') walkSchema(val);
    }
  }

  for (const raw of jsonLdContent) {
    try {
      walkSchema(JSON.parse(raw));
    } catch {
      // Non-parseable JSON-LD — skip
    }
  }
  return types;
}

// ---------------------------------------------------------------------------
// H2 question detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the heading text starts with a question word.
 * @param {string} text
 */
function isQuestionHeading(text) {
  const firstWord = text.trim().split(/\s+/)[0] || '';
  return QUESTION_WORDS.has(firstWord.toLowerCase());
}

// ---------------------------------------------------------------------------
// Content analysis helpers
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// readRobotsTxt — look in rootDir and rootDir/public
// ---------------------------------------------------------------------------

function readRobotsTxt(rootDir) {
  const candidates = [
    path.join(rootDir, 'robots.txt'),
    path.join(rootDir, 'public', 'robots.txt'),
  ];
  for (const p of candidates) {
    try {
      const sizeCheck = checkFileSize(p, fs.statSync);
      if (!sizeCheck.ok) continue;
      return fs.readFileSync(p, 'utf8');
    } catch {
      // not found
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// fileExists helper
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
// scanDirectory — main export
// ---------------------------------------------------------------------------

/**
 * Scan a directory for GEO signals.
 * @param {string} rootDir — absolute path to the project/site root
 * @returns {{ files_scanned: number, findings: object[], scores: { geo: number }, summary: object }}
 */
export function scanDirectory(rootDir) {
  const findings = [];
  const firedRules = new Set(); // ensure each rule fires at most once

  function add(rule, message, context = {}) {
    if (firedRules.has(rule)) return;
    firedRules.add(rule);
    const def = RULES[rule];
    findings.push({
      rule,
      severity: def.severity,
      message,
      ...context,
    });
  }

  // -------------------------------------------------------------------------
  // 1. Read and parse robots.txt
  // -------------------------------------------------------------------------

  const robotsContent = readRobotsTxt(rootDir);
  let robotsInfo = null;

  if (robotsContent === null) {
    add('missing-robots-ai-access', 'No robots.txt found — AI crawlers have no explicit access rules');
  } else {
    robotsInfo = parseRobotsTxt(robotsContent);

    if (!robotsInfo.hasAiBotRules) {
      add('no-ai-bot-rules', 'robots.txt has no AI bot user-agent entries (GPTBot, PerplexityBot, ClaudeBot, etc.)');
    }

    if (robotsInfo.blockedBots.has('gptbot')) {
      add('gptbot-blocked', 'GPTBot (ChatGPT crawler) is blocked in robots.txt — ChatGPT cannot index this content');
    }

    if (robotsInfo.blockedBots.has('perplexitybot')) {
      add('perplexitybot-blocked', 'PerplexityBot is blocked in robots.txt — Perplexity AI cannot index this content');
    }

    if (robotsInfo.blockedBots.has('claudebot') || robotsInfo.blockedBots.has('claude-web')) {
      add('claudeweb-blocked', 'ClaudeBot/Claude-Web is blocked in robots.txt — Claude AI cannot index this content');
    }

    if (robotsInfo.blockedBots.has('google-extended')) {
      add('google-extended-blocked', 'Google-Extended is blocked in robots.txt — Google AI Overviews cannot use this content');
    }

    if (robotsInfo.blockedBots.has('ccbot')) {
      add('ccbot-blocked', 'CCBot (Common Crawl) is blocked — reduces AI training data coverage');
    }

    if (!robotsInfo.hasSitemap) {
      add('no-sitemap-for-ai', 'robots.txt has no Sitemap: directive — AI crawlers cannot discover all pages');
    }
  }

  // -------------------------------------------------------------------------
  // 2. Check for llms.txt
  // -------------------------------------------------------------------------

  const llmsTxtPaths = [
    path.join(rootDir, 'llms.txt'),
    path.join(rootDir, 'public', 'llms.txt'),
  ];
  const hasLlmsTxt = llmsTxtPaths.some(fileExists);
  if (!hasLlmsTxt) {
    add('missing-llms-txt', 'No llms.txt file found — AI systems cannot discover a human-readable content map');
  }

  // -------------------------------------------------------------------------
  // 3. Scan HTML files
  // -------------------------------------------------------------------------

  let htmlFiles = findHtmlFiles(rootDir);

  // If dist/build/out has HTML, exclude root index.html (Vite/webpack source template)
  const hasBuildDir = htmlFiles.some(f => {
    const rel = path.relative(rootDir, f);
    return rel.startsWith('dist' + path.sep) || rel.startsWith('build' + path.sep) || rel.startsWith('out' + path.sep);
  });
  if (hasBuildDir) {
    htmlFiles = htmlFiles.filter(f => {
      const rel = path.relative(rootDir, f);
      return rel !== 'index.html' && rel !== 'index.htm';
    });
  }

  let filesScanned = 0;

  // Aggregate data across all pages
  let totalJsonLdScripts = 0;
  const allSchemaTypes = new Set();
  let anyHasMain = false;
  let anyHasNoindex = false;
  let totalWordCount = 0;
  let pageCount = 0;
  let allH2Texts = [];
  let hasDefinitionPattern = false;
  let hasStatistics = false;
  let hasTable = false;
  let hasLists = false;
  let hasTimeElement = false;
  let hasDatePublished = false;
  let hasBreadcrumb = false;
  let hasFaqSchema = false;
  let hasHowToSchema = false;
  let anyHasMetaDesc = false;
  let anyHasCanonical = false;
  let anyHasLang = false;
  let jsOnlyPageCount = 0;
  let anyHasAboutPage = false;
  let totalInternalLinks = 0;
  let shortMetaDescCount = 0;
  let avgParaWords = 0;
  let paraWordSamples = 0;
  const allRawHtml = [];

  let scanIdx = 0;
  for (const filePath of htmlFiles) {
    scanIdx++;
    if (htmlFiles.length > 5) {
      process.stderr.write(`\rScanning [${scanIdx}/${htmlFiles.length}]`);
    }

    let raw;
    try {
      const sizeCheck = checkFileSize(filePath, fs.statSync);
      if (!sizeCheck.ok) continue;
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const state = parseHtml(raw);
    filesScanned++;
    pageCount++;

    totalJsonLdScripts += state.jsonLdScripts;
    totalWordCount += state.wordCount;

    if (state.hasNoindex) anyHasNoindex = true;
    if (state.hasMain) anyHasMain = true;

    // Collect H2 texts for question analysis
    allH2Texts = allH2Texts.concat(state.h2Texts);

    // JSON-LD schema types
    const pageTypes = extractSchemaTypes(state.jsonLdContent);
    for (const t of pageTypes) allSchemaTypes.add(t);

    // Check for datePublished and schema types in JSON-LD
    for (const jsonStr of state.jsonLdContent) {
      if (jsonStr.includes('datePublished')) hasDatePublished = true;
      if (jsonStr.includes('BreadcrumbList')) hasBreadcrumb = true;
      if (jsonStr.includes('FAQPage')) hasFaqSchema = true;
      if (jsonStr.includes('HowTo')) hasHowToSchema = true;
    }

    // Meta description
    if (state.metaDescriptionText && state.metaDescriptionText.length > 0) {
      anyHasMetaDesc = true;
      if (state.metaDescriptionText.length < 70) shortMetaDescCount++;
    }

    // Canonical URL
    if (state.hasCanonical) anyHasCanonical = true;

    // Lang attribute
    if (state.hasLang) anyHasLang = true;

    // JS-only rendering detection: page has <script> but very low word count
    // AI bots cannot render JavaScript — they see empty pages
    if (state.wordCount < 50 && raw.includes('<script') && raw.includes('</script>')) {
      jsOnlyPageCount++;
    }

    // About page detection
    const relPath = path.relative(rootDir, filePath).toLowerCase();
    if (relPath.includes('about')) anyHasAboutPage = true;

    // Count internal links (href starting with / or relative)
    const internalLinkMatches = raw.match(/href=["'](\/[^"']*|(?!https?:\/\/|mailto:|tel:)[^"']+)["']/gi);
    if (internalLinkMatches) totalInternalLinks += internalLinkMatches.length;

    // Content pattern analysis against raw HTML / body text
    allRawHtml.push(raw);

    // Definition patterns: "[X] is a/an/the..."
    if (!hasDefinitionPattern && /\b\w+\s+is\s+(a|an|the)\s+/i.test(raw)) {
      hasDefinitionPattern = true;
    }

    // Statistics: numbers with % or decimal
    if (!hasStatistics && /\d+%|\d+\.\d+/.test(raw)) {
      hasStatistics = true;
    }

    // Tables
    if (!hasTable && /<table[\s>]/i.test(raw)) {
      hasTable = true;
    }

    // Lists
    if (!hasLists && (/<ol[\s>]/i.test(raw) || /<ul[\s>]/i.test(raw))) {
      hasLists = true;
    }

    // <time> element
    if (!hasTimeElement && /<time[\s>]/i.test(raw)) {
      hasTimeElement = true;
    }

    // Avg paragraph length estimation from word count and rough paragraph count
    // Use the body text (state.wordCount) divided by estimated paragraph count
    const paraMatches = raw.match(/<p[\s>]/gi);
    const pCount = paraMatches ? paraMatches.length : 0;
    if (pCount > 0 && state.wordCount > 0) {
      const approxAvg = state.wordCount / pCount;
      avgParaWords = (avgParaWords * paraWordSamples + approxAvg) / (paraWordSamples + 1);
      paraWordSamples++;
    }
  }
  if (htmlFiles.length > 5) process.stderr.write('\r\x1b[K');

  // -------------------------------------------------------------------------
  // 4. Apply aggregate rules
  // -------------------------------------------------------------------------

  // Critical
  if (anyHasNoindex) {
    add('noindex-blocks-ai', 'Page has noindex directive — blocks ALL AI crawlers from indexing content');
  }

  // High
  if (totalJsonLdScripts === 0) {
    add('missing-structured-data', 'No JSON-LD structured data found — AI systems rely on schema to understand content context');
  }

  // Medium — Schema type checks
  const hasOrgSchema = allSchemaTypes.has('Organization');
  if (!hasOrgSchema) {
    add('missing-organization-schema', 'No Organization schema found — AI systems use this to verify brand identity');
  }

  const hasPersonSchema = allSchemaTypes.has('Person') || allSchemaTypes.has('Author');
  if (!hasPersonSchema) {
    add('missing-author-schema', 'No Person/Author schema found — AI systems favor content with identified authors (E-E-A-T signal)');
  }

  if (!anyHasMain) {
    add('missing-main-for-ai', 'No <main> element found — AI crawlers use landmark elements to identify primary content');
  }

  // H2 question analysis
  if (allH2Texts.length === 0) {
    add('no-question-headers', 'No H2 headings found — question-formatted headers improve AI citation probability');
  } else {
    const questionH2s = allH2Texts.filter(isQuestionHeading);
    const ratio = questionH2s.length / allH2Texts.length;
    if (questionH2s.length === 0) {
      add('no-question-headers', `None of the ${allH2Texts.length} H2 headings use question format — AI engines prefer "What/How/Why" style headers`);
    } else if (ratio < 0.3) {
      add('few-question-headers', `Only ${Math.round(ratio * 100)}% of H2s use question format (${questionH2s.length}/${allH2Texts.length}) — aim for ≥30%`);
    }
  }

  // Thin content
  if (totalWordCount > 0 && pageCount > 0 && totalWordCount / pageCount < 300) {
    add('thin-content-ai', `Average page word count is ${Math.round(totalWordCount / pageCount)} — AI engines prefer ≥300 words for citation`);
  }

  // Definition patterns
  if (!hasDefinitionPattern) {
    add('no-definition-patterns', 'No definition patterns found ("[X] is a/an/the...") — definitional content is highly cited by AI engines');
  }

  // Comparison tables
  if (!hasTable) {
    add('no-comparison-tables', 'No <table> elements found — comparison tables are highly cited by AI search engines');
  }

  // Statistics
  if (!hasStatistics) {
    add('no-statistics-patterns', 'No statistics or percentages found — data-backed content receives significantly more AI citations');
  }

  // Publication date
  if (!hasDatePublished && !hasTimeElement) {
    add('missing-publication-date', 'No datePublished schema or <time> element found — AI engines prefer content with clear publication dates');
  }

  // Breadcrumb schema
  if (!hasBreadcrumb) {
    add('missing-breadcrumb-schema', 'No BreadcrumbList schema found — breadcrumbs help AI engines understand site structure');
  }

  // Medium — JS-rendered content (AI bots can't render JS)
  if (jsOnlyPageCount > 0) {
    add('js-rendered-content', `${jsOnlyPageCount} page(s) appear to be JS-rendered with minimal HTML content — AI crawlers cannot execute JavaScript and will see empty pages`);
  }

  // Medium — FAQPage schema (separate from FAQ content pattern)
  if (allH2Texts.some(isQuestionHeading) && !hasFaqSchema) {
    add('no-faq-schema', 'Pages have FAQ-style content but no FAQPage schema — adding FAQPage JSON-LD significantly increases AI citation and rich result eligibility');
  }

  // Medium — HowTo schema
  if (hasLists && !hasHowToSchema) {
    // Only flag if content has procedural patterns
    const hasProcedural = allRawHtml.some(html =>
      /step\s*\d|how\s+to/i.test(html)
    );
    if (hasProcedural) {
      add('no-howto-schema', 'Pages have how-to/step content but no HowTo schema — HowTo JSON-LD enables rich results and AI step-by-step citations');
    }
  }

  // Medium — Meta description missing across all pages
  if (!anyHasMetaDesc) {
    add('no-meta-description-ai', 'No meta descriptions found — AI engines use meta descriptions as content summaries for citation context');
  }

  // Medium — Canonical URL
  if (!anyHasCanonical && pageCount > 1) {
    add('no-canonical-url', 'No canonical URLs found — AI crawlers may index duplicate content, diluting citation authority');
  }

  // Medium — Lang attribute
  if (!anyHasLang) {
    add('no-lang-attribute', 'No lang attribute on <html> — AI engines use lang to determine content language for multilingual citations');
  }

  // Low
  // FAQ section — look for question-word H2/H3 followed by paragraph content
  const hasFaqPattern = allH2Texts.some(isQuestionHeading);
  if (!hasFaqPattern) {
    add('no-faq-section', 'No FAQ-pattern content detected (question headings with answer text) — FAQs are heavily cited by AI engines');
  }

  // Citation-ready paragraph length (target 134-167 words, flag >167 avg)
  if (paraWordSamples > 0 && avgParaWords > 167) {
    add('content-not-citation-ready', `Average paragraph is ~${Math.round(avgParaWords)} words — AI engines prefer citation-ready passages of 134-167 words`);
  }

  // Lists
  if (!hasLists) {
    add('no-listicle-structure', 'No <ol> or <ul> elements found — list-based content is favored in AI-generated summaries');
  }

  // Low — About page
  if (!anyHasAboutPage && pageCount > 3) {
    add('no-about-page', 'No about page found — AI engines value E-E-A-T signals; an about page establishes author/brand credibility');
  }

  // Low — Internal linking
  if (pageCount > 1 && totalInternalLinks / pageCount < 3) {
    add('no-internal-links', `Average internal links per page is ${Math.round(totalInternalLinks / pageCount)} — AI engines use link context to understand content relationships (aim for ≥3)`);
  }

  // Low — Short meta descriptions
  if (shortMetaDescCount > 0 && shortMetaDescCount >= pageCount / 2) {
    add('short-meta-description', `${shortMetaDescCount} page(s) have meta descriptions under 70 chars — short descriptions provide insufficient context for AI citation`);
  }

  // -------------------------------------------------------------------------
  // 5. Score calculation
  // -------------------------------------------------------------------------

  let score = 100;
  let critical = 0, high = 0, medium = 0, low = 0;

  for (const finding of findings) {
    const def = RULES[finding.rule];
    score -= def.deduction;
    if (def.severity === 'critical') critical++;
    else if (def.severity === 'high') high++;
    else if (def.severity === 'medium') medium++;
    else if (def.severity === 'low') low++;
  }

  score = Math.max(0, score);

  return {
    files_scanned: filesScanned,
    findings,
    scores: { geo: score },
    summary: { critical, high, medium, low },
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
