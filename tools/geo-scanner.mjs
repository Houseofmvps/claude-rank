/**
 * geo-scanner.mjs — GEO (Generative Engine Optimization) scanner with 25 rules.
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

  // Low (-2)
  'no-faq-section':             { severity: 'low', deduction: 2 },
  'content-not-citation-ready': { severity: 'low', deduction: 2 },
  'no-listicle-structure':      { severity: 'low', deduction: 2 },
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
  for (const raw of jsonLdContent) {
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && item['@type']) {
          const t = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
          for (const type of t) types.add(type);
        }
      }
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

/**
 * Count average paragraph word count from body text.
 * Estimates paragraphs by splitting on double newlines.
 * @param {string} bodyText
 * @returns {number} average words per paragraph
 */
function avgParagraphWords(bodyText) {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 30);
  if (paragraphs.length === 0) return 0;
  const total = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0);
  return total / paragraphs.length;
}

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

  const htmlFiles = findHtmlFiles(rootDir);
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
  let avgParaWords = 0;
  let paraWordSamples = 0;
  const allRawHtml = [];

  for (const filePath of htmlFiles) {
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

    // Check for datePublished in JSON-LD
    for (const jsonStr of state.jsonLdContent) {
      if (jsonStr.includes('datePublished')) {
        hasDatePublished = true;
      }
      if (jsonStr.includes('BreadcrumbList')) {
        hasBreadcrumb = true;
      }
    }

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
