/**
 * aeo-scanner.mjs — AEO (Answer Engine Optimization) scanner with 12 rules.
 * Optimizes for featured snippets, People Also Ask, and voice search.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

const RULES = {
  // High (-10)
  'missing-faqpage-schema':   { severity: 'high',   deduction: 10 },
  'missing-howto-schema':     { severity: 'high',   deduction: 10 },
  'no-snippet-answers':       { severity: 'high',   deduction: 10 },

  // Medium (-5)
  'missing-speakable-schema':  { severity: 'medium', deduction: 5 },
  'missing-content-schema':    { severity: 'medium', deduction: 5 },
  'answers-too-long':          { severity: 'medium', deduction: 5 },
  'no-numbered-steps':         { severity: 'medium', deduction: 5 },
  'missing-direct-answer':     { severity: 'medium', deduction: 5 },
  'no-featured-image':         { severity: 'medium', deduction: 5 },

  // Low (-2)
  'no-voice-friendly-content': { severity: 'low',    deduction: 2 },
  'no-people-also-ask-patterns':{ severity: 'low',   deduction: 2 },
  'missing-llms-txt-aeo':      { severity: 'low',    deduction: 2 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUESTION_WORDS = /^(what|how|why|when|where|who|which|can|does|is|are|do|should|will|could|would|has|have|did|was|were|shall|may|might|need)\b/i;

// Marketing headers that start with question words but aren't real questions
const MARKETING_HEADERS = new Set([
  "what's new", "what we do", "what we offer", "what we build",
  "how it works", "how we work", "how to get started",
  "why us", "why choose us", "who we are", "where we are",
  "is it time", "are you ready",
]);

/**
 * Returns true if a heading text starts with a question word.
 * Excludes known marketing headers that aren't real questions.
 */
function isQuestionHeading(text) {
  const lower = text.toLowerCase().trim();
  if (MARKETING_HEADERS.has(lower)) return false;
  return QUESTION_WORDS.test(lower);
}

/**
 * Extract paragraph texts from raw HTML using a simple regex approach.
 * Returns array of { text, wordCount } objects.
 */
function extractParagraphs(rawHtml) {
  const paragraphs = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(rawHtml)) !== null) {
    // Strip inner HTML tags
    const text = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 0) {
      paragraphs.push({
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      });
    }
  }
  return paragraphs;
}

/**
 * Extract H2 elements with the paragraph immediately following each.
 * Returns array of { headingText, nextParagraph } objects.
 */
function extractH2WithNextParagraph(rawHtml) {
  const results = [];
  // Match h2 followed by eventual <p>
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h[1-6]|<\/(?:article|main|section|body)|$)/gi;
  let match;
  while ((match = h2Regex.exec(rawHtml)) !== null) {
    const headingText = match[1].replace(/<[^>]+>/g, '').trim();
    const afterH2 = match[2];

    // Find first <p> after this h2
    const pMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(afterH2);
    const nextParagraph = pMatch
      ? pMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : null;

    results.push({ headingText, nextParagraph });
  }
  return results;
}

/**
 * Count the words in the first sentence of a text.
 */
function firstSentenceWordCount(text) {
  if (!text) return 0;
  const sentenceEnd = text.search(/[.!?]/);
  const sentence = sentenceEnd !== -1 ? text.slice(0, sentenceEnd + 1) : text;
  return sentence.split(/\s+/).filter(Boolean).length;
}

/**
 * Check if llms.txt exists in rootDir or rootDir/public.
 */
function hasLlmsTxt(rootDir) {
  const locations = [
    path.join(rootDir, 'llms.txt'),
    path.join(rootDir, 'public', 'llms.txt'),
  ];
  return locations.some(loc => {
    try {
      fs.accessSync(loc);
      return true;
    } catch {
      return false;
    }
  });
}

// ---------------------------------------------------------------------------
// Per-page analysis
// ---------------------------------------------------------------------------

function analyzePage(filePath) {
  const sizeCheck = checkFileSize(filePath, fs.statSync);
  if (!sizeCheck.ok) return null;

  let rawHtml;
  try {
    rawHtml = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }

  const state = parseHtml(rawHtml);
  const paragraphs = extractParagraphs(rawHtml);
  const h2WithNext = extractH2WithNextParagraph(rawHtml);

  const questionH2s = state.h2Texts.filter(isQuestionHeading);
  const allJsonLd = state.jsonLdContent.join(' ');

  // Detect schemas
  const hasFaqPage = allJsonLd.includes('FAQPage');
  const hasHowTo = allJsonLd.includes('HowTo');
  const hasSpeakable = allJsonLd.includes('speakable');
  const hasContentSchema = (
    allJsonLd.includes('Article') ||
    allJsonLd.includes('BlogPosting') ||
    allJsonLd.includes('NewsArticle')
  );

  // Detect procedural patterns in body text
  const bodyLower = rawHtml.toLowerCase();
  const hasProceduralText = (
    /step\s*[1-9]/.test(bodyLower) ||
    /first,/.test(bodyLower) ||
    /then,/.test(bodyLower) ||
    /next,/.test(bodyLower)
  );
  const hasOrderedList = /<ol[\s>]/i.test(rawHtml);

  // Paragraph average word count
  const avgParaWordCount = paragraphs.length > 0
    ? paragraphs.reduce((sum, p) => sum + p.wordCount, 0) / paragraphs.length
    : 0;

  // Voice-friendly paragraphs: 20-35 words
  const hasVoiceFriendlyPara = paragraphs.some(p => p.wordCount >= 20 && p.wordCount <= 35);

  // Check if question H2s have concise first paragraphs after them
  const questionH2sWithNext = h2WithNext.filter(h => isQuestionHeading(h.headingText));
  const hasMissingDirectAnswer = questionH2sWithNext.some(h => {
    if (!h.nextParagraph) return true;
    return firstSentenceWordCount(h.nextParagraph) > 60;
  });

  // Count images (including total <img> tags)
  const imgCount = (rawHtml.match(/<img[\s>]/gi) || []).length;

  return {
    questionH2Count: questionH2s.length,
    hasFaqPage,
    hasHowTo,
    hasSpeakable,
    hasContentSchema,
    hasProceduralText,
    hasOrderedList,
    avgParaWordCount,
    hasVoiceFriendlyPara,
    questionH2sWithNext,
    hasMissingDirectAnswer,
    wordCount: state.mainContentWordCount || state.wordCount,
    imgCount,
    // no snippet answers: question H2s exist but no paragraphs follow them
    noSnippetAnswers: questionH2s.length === 0 ||
      questionH2sWithNext.every(h => !h.nextParagraph),
  };
}

// ---------------------------------------------------------------------------
// scanDirectory
// ---------------------------------------------------------------------------

/**
 * Scan a directory of HTML files for AEO signals.
 * @param {string} rootDir — absolute path to directory
 * @returns {{ files_scanned, findings, scores: { aeo }, summary }}
 */
export function scanDirectory(rootDir) {
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

  const findings = [];

  // Per-file analyses
  const analyses = htmlFiles
    .map(f => analyzePage(f))
    .filter(Boolean);

  const fileCount = analyses.length;

  // Aggregate signals across all pages
  const anyFaqPage       = analyses.some(a => a.hasFaqPage);
  const anyHowTo         = analyses.some(a => a.hasHowTo);
  const anySpeakable     = analyses.some(a => a.hasSpeakable);
  const anyContentSchema = analyses.some(a => a.hasContentSchema);
  const anyVoiceFriendly = analyses.some(a => a.hasVoiceFriendlyPara);

  const pagesWithQuestionH2s = analyses.filter(a => a.questionH2Count > 0);
  const pagesWithProcedural   = analyses.filter(a => a.hasProceduralText);

  const totalQuestionH2s = analyses.reduce((s, a) => s + a.questionH2Count, 0);

  // Average paragraph length across all pages
  const allAvgLengths = analyses.filter(a => a.avgParaWordCount > 0).map(a => a.avgParaWordCount);
  const globalAvgParaWords = allAvgLengths.length > 0
    ? allAvgLengths.reduce((s, v) => s + v, 0) / allAvgLengths.length
    : 0;

  // Content pages (>300 words) missing images
  const contentPagesWithoutImages = analyses.filter(
    a => a.wordCount > 300 && a.imgCount === 0
  );

  // Pages with question H2s that have no snippet answers
  const pagesWithNoSnippetAnswers = analyses.filter(a => a.noSnippetAnswers);

  // Pages with question H2s but missing direct answers
  const pagesWithMissingDirectAnswer = analyses.filter(
    a => a.questionH2Count > 0 && a.hasMissingDirectAnswer
  );

  // --- Rule evaluation ---

  // 1. missing-faqpage-schema — no FAQPage schema anywhere (any content site should have it)
  if (!anyFaqPage) {
    const msg = pagesWithQuestionH2s.length > 0
      ? `${pagesWithQuestionH2s.length} page(s) have question-format H2s but no FAQPage schema found.`
      : 'No FAQPage schema found. Add FAQ structured data to improve featured snippet eligibility.';
    findings.push({
      rule: 'missing-faqpage-schema',
      severity: RULES['missing-faqpage-schema'].severity,
      message: msg,
    });
  }

  // 2. missing-howto-schema — procedural content but no HowTo schema
  if (pagesWithProcedural.length > 0 && !anyHowTo) {
    findings.push({
      rule: 'missing-howto-schema',
      severity: RULES['missing-howto-schema'].severity,
      message: `${pagesWithProcedural.length} page(s) have step/procedural patterns but no HowTo schema.`,
    });
  }

  // 3. no-snippet-answers — no question H2s at all OR none followed by paragraphs
  if (fileCount > 0 && pagesWithNoSnippetAnswers.length > 0) {
    findings.push({
      rule: 'no-snippet-answers',
      severity: RULES['no-snippet-answers'].severity,
      message: `${pagesWithNoSnippetAnswers.length} page(s) have no concise answer blocks after question H2s.`,
    });
  }

  // 4. missing-speakable-schema
  if (!anySpeakable) {
    findings.push({
      rule: 'missing-speakable-schema',
      severity: RULES['missing-speakable-schema'].severity,
      message: 'No speakable schema found in any JSON-LD across all pages.',
    });
  }

  // 5. missing-content-schema
  if (!anyContentSchema) {
    findings.push({
      rule: 'missing-content-schema',
      severity: RULES['missing-content-schema'].severity,
      message: 'No Article, BlogPosting, or NewsArticle schema found on any page.',
    });
  }

  // 6. answers-too-long
  if (globalAvgParaWords > 100) {
    findings.push({
      rule: 'answers-too-long',
      severity: RULES['answers-too-long'].severity,
      message: `Average paragraph word count is ${Math.round(globalAvgParaWords)} words (>100 is snippet-unfriendly).`,
    });
  }

  // 7. no-numbered-steps
  if (pagesWithProcedural.length > 0 && pagesWithProcedural.every(a => !a.hasOrderedList)) {
    findings.push({
      rule: 'no-numbered-steps',
      severity: RULES['no-numbered-steps'].severity,
      message: `${pagesWithProcedural.length} page(s) have procedural patterns but no <ol> numbered lists.`,
    });
  }

  // 8. missing-direct-answer
  if (pagesWithMissingDirectAnswer.length > 0) {
    findings.push({
      rule: 'missing-direct-answer',
      severity: RULES['missing-direct-answer'].severity,
      message: `${pagesWithMissingDirectAnswer.length} page(s) have question H2s but first sentences exceed 60 words.`,
    });
  }

  // 9. no-featured-image
  if (contentPagesWithoutImages.length > 0) {
    findings.push({
      rule: 'no-featured-image',
      severity: RULES['no-featured-image'].severity,
      message: `${contentPagesWithoutImages.length} content page(s) (>300 words) have no images.`,
    });
  }

  // 10. no-voice-friendly-content
  if (fileCount > 0 && !anyVoiceFriendly) {
    findings.push({
      rule: 'no-voice-friendly-content',
      severity: RULES['no-voice-friendly-content'].severity,
      message: 'No paragraphs between 20-35 words found (voice search answer length).',
    });
  }

  // 11. no-people-also-ask-patterns
  if (totalQuestionH2s < 3) {
    findings.push({
      rule: 'no-people-also-ask-patterns',
      severity: RULES['no-people-also-ask-patterns'].severity,
      message: `Only ${totalQuestionH2s} question-format heading(s) found across all pages (need ≥3 for PAA coverage).`,
    });
  }

  // 12. missing-llms-txt-aeo
  if (!hasLlmsTxt(rootDir)) {
    findings.push({
      rule: 'missing-llms-txt-aeo',
      severity: RULES['missing-llms-txt-aeo'].severity,
      message: 'No llms.txt file found in root or public/ directory.',
    });
  }

  // --- Scoring (deduct once per unique rule, consistent with SEO scorer) ---
  const triggeredRules = new Set(findings.map(f => f.rule));
  let score = 100;
  for (const rule of triggeredRules) {
    const def = RULES[rule];
    if (def) score -= def.deduction;
  }
  score = Math.max(0, score);

  // --- Summary ---
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    summary[finding.severity] = (summary[finding.severity] || 0) + 1;
  }

  return {
    files_scanned: htmlFiles.length,
    findings,
    scores: { aeo: score },
    summary,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0) {
  const result = scanDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
