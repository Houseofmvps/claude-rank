/**
 * citability-scorer.mjs — AI Citability Score: how likely AI engines are to cite each page.
 * Proprietary scoring algorithm based on research from GEO studies.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

// Authoritative domain suffixes for source citation scoring
const AUTHORITATIVE_TLDS = new Set(['.edu', '.gov', '.org', '.ac.uk', '.gov.uk']);
const RESEARCH_DOMAINS = new Set([
  'arxiv.org', 'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'doi.org',
  'nature.com', 'science.org', 'ieee.org', 'acm.org', 'springer.com',
  'wiley.com', 'jstor.org', 'researchgate.net', 'semanticscholar.org',
]);

function isAuthoritativeLink(href) {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    for (const tld of AUTHORITATIVE_TLDS) {
      if (host.endsWith(tld)) return true;
    }
    for (const domain of RESEARCH_DOMAINS) {
      if (host === domain || host.endsWith('.' + domain)) return true;
    }
  } catch { /* invalid URL */ }
  return false;
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;
  word = word.replace(/e$/, '');
  const matches = word.match(/[aeiouy]+/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Score a single page's AI citability (0-100).
 * Based on research: statistics density, front-loading, source citations,
 * expert attribution, definition clarity, entity precision, schema completeness.
 */
function scorePage(state, html) {
  const scores = {};
  const bodyText = state.bodyText || '';
  const words = bodyText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  if (wordCount < 50) {
    return { total: 0, breakdown: { reason: 'Too little content to score' } };
  }

  // 1. Statistic density (0-15 points)
  // Target: 1+ data point per 200 words. +33.9% visibility boost.
  const statMatches = bodyText.match(/\d+(\.\d+)?%|\$[\d,.]+|\d{2,}[\s,]\d{3}|\d+\.\d+x|\d+\/\d+/g) || [];
  const statsPer200 = (statMatches.length / wordCount) * 200;
  scores.statisticDensity = Math.min(15, Math.round(statsPer200 * 10));

  // 2. Front-loading score (0-15 points)
  // 44.2% of AI citations come from first 30% of content
  const first30pct = words.slice(0, Math.ceil(wordCount * 0.3)).join(' ').toLowerCase();
  // Check if first 30% contains a direct answer (definition pattern or key statement)
  const hasDirectAnswer = /\b\w+\s+(is|are|refers?\s+to|means?|provides?|enables?)\s+/i.test(first30pct);
  const hasNumbers = /\d+/.test(first30pct);
  let frontScore = 0;
  if (hasDirectAnswer) frontScore += 8;
  if (hasNumbers) frontScore += 4;
  if (first30pct.length > 100) frontScore += 3;
  scores.frontLoading = Math.min(15, frontScore);

  // 3. Source citation quality (0-15 points)
  // +30.3% visibility with authoritative citations
  const authLinks = state.externalLinks.filter(isAuthoritativeLink).length;
  scores.sourceCitations = Math.min(15, authLinks * 5);

  // 4. Expert attribution (0-15 points)
  // Expert quotes and author signals
  let expertScore = 0;
  // Check for Person/Author schema
  for (const raw of state.jsonLdContent) {
    if (raw.includes('"Person"') || raw.includes('"Author"')) expertScore += 5;
    if (raw.includes('"author"')) expertScore += 3;
    if (raw.includes('"credentials"') || raw.includes('"jobTitle"')) expertScore += 3;
  }
  // Check for quote patterns (blockquote, or "said" / "according to")
  if (/<blockquote/i.test(html)) expertScore += 2;
  if (/according\s+to|said\s+\w+|noted\s+\w+|explained\s+\w+/i.test(bodyText)) expertScore += 2;
  scores.expertAttribution = Math.min(15, expertScore);

  // 5. Definition clarity (0-10 points)
  // "X is..." / "X refers to..." patterns
  const defPatterns = bodyText.match(/\b\w+\s+(is|are)\s+(a|an|the)\s+/gi) || [];
  const refersTo = bodyText.match(/\brefers?\s+to\b/gi) || [];
  const means = bodyText.match(/\bmeans?\s+/gi) || [];
  const totalDefs = defPatterns.length + refersTo.length + means.length;
  scores.definitionClarity = Math.min(10, totalDefs * 2);

  // 6. Structured data completeness (0-15 points)
  // Schema coverage: Organization + Author + Article + FAQ + Breadcrumb = max
  let schemaScore = 0;
  const allSchemaText = state.jsonLdContent.join(' ');
  if (allSchemaText.includes('Organization')) schemaScore += 3;
  if (allSchemaText.includes('Person') || allSchemaText.includes('Author')) schemaScore += 3;
  if (allSchemaText.includes('Article') || allSchemaText.includes('BlogPosting')) schemaScore += 3;
  if (allSchemaText.includes('FAQPage')) schemaScore += 3;
  if (allSchemaText.includes('BreadcrumbList')) schemaScore += 3;
  scores.schemaCompleteness = schemaScore;

  // 7. Content structure (0-15 points)
  // Well-organized headings, lists, paragraphs
  let structScore = 0;
  if (state.h1Count === 1) structScore += 3;
  if (state.h2Texts.length >= 3) structScore += 3;
  if (state.headingLevels.length >= 4) structScore += 2;
  // Check for lists
  if (html.match(/<ol[\s>]/gi)) structScore += 2;
  if (html.match(/<ul[\s>]/gi)) structScore += 2;
  // Paragraph count (well-segmented content)
  const paraCount = (html.match(/<p[\s>]/gi) || []).length;
  if (paraCount >= 5) structScore += 3;
  scores.contentStructure = Math.min(15, structScore);

  // Total
  const total = Object.values(scores).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

  return {
    total: Math.min(100, total),
    breakdown: scores,
  };
}

/**
 * Scan a directory and produce citability scores for all pages.
 */
export function scanDirectory(rootDir) {
  const absRoot = path.resolve(rootDir);
  let htmlFiles = findHtmlFiles(absRoot);

  // Exclude source index if build dir exists
  const hasBuildDir = htmlFiles.some(f => {
    const rel = path.relative(absRoot, f);
    return rel.startsWith('dist/') || rel.startsWith('build/') || rel.startsWith('out/');
  });
  if (hasBuildDir) {
    htmlFiles = htmlFiles.filter(f => path.relative(absRoot, f) !== 'index.html');
  }

  if (htmlFiles.length === 0) {
    return { skipped: true, reason: 'No HTML files found' };
  }

  const pages = [];
  let totalScore = 0;

  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const state = parseHtml(content);
    const result = scorePage(state, content);
    const rel = path.relative(absRoot, filePath);

    pages.push({
      file: rel,
      score: result.total,
      breakdown: result.breakdown,
    });
    totalScore += result.total;
  }

  const avgScore = pages.length > 0 ? Math.round(totalScore / pages.length) : 0;

  // Generate findings based on average score breakdown
  const findings = [];
  const avgBreakdowns = {};
  for (const page of pages) {
    for (const [key, val] of Object.entries(page.breakdown)) {
      if (typeof val !== 'number') continue;
      avgBreakdowns[key] = (avgBreakdowns[key] || 0) + val;
    }
  }
  for (const key of Object.keys(avgBreakdowns)) {
    avgBreakdowns[key] = Math.round(avgBreakdowns[key] / pages.length);
  }

  // Actionable findings
  if ((avgBreakdowns.statisticDensity || 0) < 5) {
    findings.push({ rule: 'low-statistics', severity: 'medium', message: 'Low statistic density — add data points (percentages, numbers) every 200 words for 33.9% more AI visibility' });
  }
  if ((avgBreakdowns.frontLoading || 0) < 5) {
    findings.push({ rule: 'weak-front-loading', severity: 'medium', message: 'Content not front-loaded — put the key answer in the first 30% of your content (44.2% of AI citations come from there)' });
  }
  if ((avgBreakdowns.sourceCitations || 0) < 5) {
    findings.push({ rule: 'no-authoritative-citations', severity: 'medium', message: 'No citations to authoritative sources (.edu, .gov, research papers) — adding citations boosts AI visibility by 30.3%' });
  }
  if ((avgBreakdowns.expertAttribution || 0) < 5) {
    findings.push({ rule: 'weak-expert-signals', severity: 'medium', message: 'Weak expert attribution — add Person schema, author bios, quotes with attribution for up to 32% visibility boost' });
  }
  if ((avgBreakdowns.definitionClarity || 0) < 3) {
    findings.push({ rule: 'no-definitions', severity: 'low', message: 'Few definition patterns — add "X is..." and "X refers to..." statements for AI extraction' });
  }
  if ((avgBreakdowns.schemaCompleteness || 0) < 6) {
    findings.push({ rule: 'incomplete-schema', severity: 'medium', message: 'Schema coverage is incomplete — add Organization + Author + Article + FAQ + Breadcrumb for maximum AI understanding' });
  }
  if ((avgBreakdowns.contentStructure || 0) < 5) {
    findings.push({ rule: 'poor-content-structure', severity: 'medium', message: 'Content structure needs improvement — use more headings, lists, and well-segmented paragraphs' });
  }

  return {
    files_scanned: pages.length,
    scores: { citability: avgScore },
    pages,
    findings,
    avgBreakdown: avgBreakdowns,
    summary: {
      critical: 0,
      high: 0,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length > 0) {
  const result = scanDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
