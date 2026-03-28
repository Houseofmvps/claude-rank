/**
 * brief-generator.mjs — Content brief generator for SEO-optimized content creation.
 * Analyzes existing HTML pages and generates structured content briefs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

// ---------------------------------------------------------------------------
// Stop words for keyword extraction
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','it','as','be','this','that','are','was','were','been','being','have','has',
  'had','do','does','did','will','would','could','should','can','may','might',
  'about','your','you','our','we','they','their','them','its','not','all','more',
  'how','what','when','where','why','which','who','than','into','also','just',
  'get','got','use','used','new','one','two','each','every','most','some','any',
  'been','much','many','very','only','then','here','there','these','those',
  'such','other','like','make','made','over','after','before','between','own',
  'same','still','even','first','last','next','back','well','way','out','up',
]);

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Extract significant keywords from text.
 * @param {string} text
 * @returns {string[]}
 */
function extractKeywords(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
}

/**
 * Count keyword frequency and return sorted [word, count] pairs.
 * @param {string[]} words
 * @returns {[string, number][]}
 */
function keywordFrequency(words) {
  const freq = new Map();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Check if text contains the target keyword (case-insensitive, partial match).
 * @param {string} text
 * @param {string} keyword
 * @returns {boolean}
 */
function textMatchesKeyword(text, keyword) {
  const lower = text.toLowerCase();
  const kwLower = keyword.toLowerCase();
  // Match whole keyword phrase or individual keyword words
  if (lower.includes(kwLower)) return true;
  const kwWords = kwLower.split(/\s+/).filter(w => w.length >= 3);
  if (kwWords.length === 0) return false;
  const matchCount = kwWords.filter(w => lower.includes(w)).length;
  return matchCount / kwWords.length >= 0.5;
}

/**
 * Extract question patterns from text (sentences starting with question words or ending with ?).
 * @param {string} text
 * @returns {string[]}
 */
function extractQuestions(text) {
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 10);
  const questions = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (/\?$/.test(trimmed)) {
      questions.push(trimmed);
    }
  }

  return questions;
}

/**
 * Extract questions from H2 headings that are phrased as questions.
 * @param {string[]} h2Texts
 * @returns {string[]}
 */
function extractQuestionHeadings(h2Texts) {
  return h2Texts.filter(h2 => {
    const lower = h2.toLowerCase();
    return /\?$/.test(h2) ||
      /^(what|how|why|when|where|who|which|can|does|do|is|are|should|will)\b/.test(lower);
  });
}

// ---------------------------------------------------------------------------
// Main brief generator
// ---------------------------------------------------------------------------

/**
 * Generate a content brief by analyzing existing HTML pages in a directory.
 * @param {string} rootDir — directory to scan
 * @param {string} targetKeyword — the keyword/topic to generate a brief for
 * @returns {object} — structured content brief
 */
export function generateBrief(rootDir, targetKeyword) {
  const absRoot = path.resolve(rootDir);
  const htmlFiles = findHtmlFiles(absRoot);

  if (htmlFiles.length === 0) {
    return { skipped: true, reason: 'No HTML files found' };
  }

  if (!targetKeyword || targetKeyword.trim().length === 0) {
    return { skipped: true, reason: 'No target keyword provided' };
  }

  const keyword = targetKeyword.trim();

  // Parse all pages
  const allPages = [];
  const relatedPages = [];

  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const state = parseHtml(content);
    const bodyText = state.bodyText || '';
    const rel = path.relative(absRoot, filePath);
    const wordCount = state.mainContentWordCount || state.wordCount;

    const pageData = {
      file: rel,
      title: state.titleText || '',
      h1: state.h1Text || '',
      h2s: state.h2Texts,
      wordCount,
      bodyText,
      internalLinks: state.internalLinks,
      externalLinks: state.externalLinks,
      hasJsonLd: state.jsonLdScripts > 0,
      metaDescription: state.metaDescriptionText || '',
    };

    allPages.push(pageData);

    // Check if this page is related to the target keyword
    const isRelated = textMatchesKeyword(pageData.title, keyword) ||
      textMatchesKeyword(pageData.h1, keyword) ||
      pageData.h2s.some(h2 => textMatchesKeyword(h2, keyword)) ||
      textMatchesKeyword(bodyText, keyword);

    if (isRelated) {
      relatedPages.push(pageData);
    }
  }

  // ---------------------------------------------------------------------------
  // Analyze related pages to build the brief
  // ---------------------------------------------------------------------------

  // 1. Word count analysis — target 20% above average of related pages
  const relatedWordCounts = relatedPages.map(p => p.wordCount).filter(wc => wc > 100);
  const avgWordCount = relatedWordCounts.length > 0
    ? Math.round(relatedWordCounts.reduce((a, b) => a + b, 0) / relatedWordCounts.length)
    : 1000;
  const targetWordCount = Math.round(avgWordCount * 1.2);

  // 2. Collect all H2s from related pages for outline suggestions
  const allH2s = [];
  const h2Frequency = new Map();
  for (const page of relatedPages) {
    for (const h2 of page.h2s) {
      const normalized = h2.toLowerCase().trim();
      if (normalized.length > 3) {
        h2Frequency.set(normalized, (h2Frequency.get(normalized) || 0) + 1);
        if (!allH2s.some(existing => existing.toLowerCase() === normalized)) {
          allH2s.push(h2);
        }
      }
    }
  }

  // Sort H2s by frequency (most common first) then deduplicate
  const sortedH2s = allH2s
    .sort((a, b) => (h2Frequency.get(b.toLowerCase().trim()) || 0) - (h2Frequency.get(a.toLowerCase().trim()) || 0))
    .slice(0, 15);

  // Generate a smart outline that covers key angles
  const smartOutline = [];
  const coveredAngles = new Set();

  // 1. Always start with a definition/overview section
  smartOutline.push(`What Is ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}?`);
  coveredAngles.add('definition');

  // 2. Add most common H2s from related pages (proven topics)
  for (const h2 of sortedH2s) {
    if (smartOutline.length >= 12) break;
    const lower = h2.toLowerCase();
    // Skip generic headings
    if (/^(conclusion|summary|final thoughts|related|table of contents|share|comments)$/i.test(lower.trim())) continue;
    smartOutline.push(h2);
  }

  // 3. Add missing angles based on content analysis
  if (!coveredAngles.has('benefits') && !smartOutline.some(h => /benefit|advantage|pro/i.test(h))) {
    smartOutline.push(`Key Benefits of ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`);
  }
  if (!smartOutline.some(h => /mistake|avoid|common/i.test(h))) {
    smartOutline.push(`Common ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Mistakes to Avoid`);
  }
  if (!smartOutline.some(h => /faq|question/i.test(h))) {
    smartOutline.push(`${keyword.charAt(0).toUpperCase() + keyword.slice(1)} FAQ`);
  }

  // 3. Extract questions from related pages
  const questions = new Set();
  for (const page of relatedPages) {
    // Questions from H2 headings
    for (const q of extractQuestionHeadings(page.h2s)) {
      questions.add(q);
    }
    // Questions from body text
    for (const q of extractQuestions(page.bodyText)) {
      if (textMatchesKeyword(q, keyword)) {
        questions.add(q);
      }
    }
  }

  // 4. Internal linking opportunities
  const linkingOpportunities = [];
  for (const page of allPages) {
    // Pages that mention the keyword but are not the target — link TO them
    const mentionsKeyword = textMatchesKeyword(page.title, keyword) ||
      textMatchesKeyword(page.h1, keyword) ||
      textMatchesKeyword(page.bodyText, keyword);
    if (mentionsKeyword) {
      linkingOpportunities.push({
        file: page.file,
        title: page.title || page.h1 || page.file,
        direction: 'link-to',
        reason: `Mentions "${keyword}" — link to this page for topical authority`,
      });
    }
  }

  // Also find pages that could link FROM to the new content
  for (const page of allPages) {
    const keywordWords = keyword.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    const bodyLower = page.bodyText.toLowerCase();
    const topicOverlap = keywordWords.filter(w => bodyLower.includes(w)).length;
    if (topicOverlap > 0 && topicOverlap < keywordWords.length) {
      // Partial overlap — this page touches related topics
      const alreadyListed = linkingOpportunities.some(lo => lo.file === page.file);
      if (!alreadyListed) {
        linkingOpportunities.push({
          file: page.file,
          title: page.title || page.h1 || page.file,
          direction: 'link-from',
          reason: `Related topic — add a link from this page to your new content`,
        });
      }
    }
  }

  // 5. Related keywords — extract from related pages
  const allKeywords = [];
  for (const page of relatedPages) {
    const kws = extractKeywords([page.title, page.h1, ...page.h2s, page.bodyText].join(' '));
    allKeywords.push(...kws);
  }

  const kwFreqs = keywordFrequency(allKeywords);
  // Filter out the target keyword itself and very common words
  const keywordLower = keyword.toLowerCase();
  const keywordParts = keywordLower.split(/\s+/);
  const relatedKeywords = kwFreqs
    .filter(([w]) => !keywordParts.includes(w))
    .slice(0, 20)
    .map(([word, count]) => ({ word, frequency: count }));

  // 6. Content gap analysis — topics covered by related pages H2s but not all pages
  const topicsCovered = new Map(); // topic -> Set of files
  for (const page of relatedPages) {
    for (const h2 of page.h2s) {
      const topic = h2.toLowerCase().trim();
      if (topic.length > 3) {
        if (!topicsCovered.has(topic)) topicsCovered.set(topic, new Set());
        topicsCovered.get(topic).add(page.file);
      }
    }
  }

  // Gaps are topics only covered by some related pages
  const contentGaps = [];
  for (const [topic, files] of topicsCovered) {
    if (files.size < relatedPages.length && files.size >= 1) {
      contentGaps.push({
        topic,
        coveredBy: [...files],
        coverageRatio: `${files.size}/${relatedPages.length}`,
      });
    }
  }
  contentGaps.sort((a, b) => a.coveredBy.length - b.coveredBy.length);

  // 7. GEO optimization tips
  const geoTips = [];

  // Check if related pages have statistics
  const statsPattern = /\d+(\.\d+)?%|\$\d|(\d{1,3}(,\d{3})+)|\d+x\b/g;
  const pagesWithStats = relatedPages.filter(p => statsPattern.test(p.bodyText));
  if (pagesWithStats.length > 0) {
    geoTips.push({
      tip: 'Include statistics and data points',
      reason: `${pagesWithStats.length} related page(s) use statistics — AI engines prefer data-backed claims`,
      priority: 'high',
    });
  } else {
    geoTips.push({
      tip: 'Add statistics and data points to support claims',
      reason: 'No related pages include statistics — this is a differentiation opportunity for AI citation',
      priority: 'high',
    });
  }

  // Check for expert quotes/attribution
  const quotePattern = /[""].*?[""]|according to|expert|specialist|research shows/i;
  const pagesWithQuotes = relatedPages.filter(p => quotePattern.test(p.bodyText));
  if (pagesWithQuotes.length > 0) {
    geoTips.push({
      tip: 'Include expert quotes and attributions',
      reason: `${pagesWithQuotes.length} related page(s) use expert citations — match or exceed this`,
      priority: 'medium',
    });
  } else {
    geoTips.push({
      tip: 'Add expert quotes to stand out from competitors',
      reason: 'No related pages include expert attribution — first-mover advantage for AI citability',
      priority: 'high',
    });
  }

  // Check for structured data
  const pagesWithSchema = relatedPages.filter(p => p.hasJsonLd);
  if (pagesWithSchema.length === 0) {
    geoTips.push({
      tip: 'Add JSON-LD structured data (Article, FAQPage, HowTo)',
      reason: 'No related pages use structured data — add it for AI search visibility',
      priority: 'high',
    });
  }

  // General GEO tips
  geoTips.push({
    tip: 'Write a direct answer in the first 40-60 words',
    reason: 'Front-loading improves AI citation fitness — AI models extract from opening paragraphs',
    priority: 'high',
  });

  geoTips.push({
    tip: 'Use question-format H2 headings (What is...? How to...?)',
    reason: 'Question headings align with how users query AI search engines',
    priority: 'medium',
  });

  geoTips.push({
    tip: 'Write 120-167 word passages for optimal AI citation length',
    reason: 'AI models prefer passages in this range for citation extraction',
    priority: 'medium',
  });

  // 8. Suggested title
  const suggestedTitle = generateSuggestedTitle(keyword, relatedPages);

  // ---------------------------------------------------------------------------
  // Build the brief
  // ---------------------------------------------------------------------------

  return {
    targetKeyword: keyword,
    suggestedTitle,
    targetWordCount,
    avgCompetitorWordCount: avgWordCount,
    suggestedOutline: smartOutline.slice(0, 15),
    questionsToAnswer: [...questions].slice(0, 10),
    internalLinkingOpportunities: linkingOpportunities.slice(0, 15),
    relatedKeywords: relatedKeywords.slice(0, 15),
    contentGaps: contentGaps.slice(0, 10),
    geoOptimizationTips: geoTips,
    searchIntent: classifySearchIntent(keyword, relatedPages),
    analysis: {
      totalPagesScanned: allPages.length,
      relatedPagesFound: relatedPages.length,
      relatedPages: relatedPages.map(p => ({
        file: p.file,
        title: p.title,
        wordCount: p.wordCount,
        h2Count: p.h2s.length,
      })),
    },
  };
}

/**
 * Classify search intent from related pages.
 * @param {string} keyword
 * @param {object[]} relatedPages
 * @returns {object}
 */
function classifySearchIntent(keyword, relatedPages) {
  const signals = { informational: 0, transactional: 0, comparison: 0, navigational: 0 };

  for (const page of relatedPages) {
    const text = [page.title, page.h1, ...page.h2s, page.metaDescription].join(' ').toLowerCase();
    if (/what|why|how|guide|learn|understand|explain|tutorial/i.test(text)) signals.informational++;
    if (/buy|price|pricing|discount|free|trial|sign up|download|order|shop/i.test(text)) signals.transactional++;
    if (/vs|versus|compare|alternative|best|top|review|rating/i.test(text)) signals.comparison++;
    if (/login|dashboard|account|support|docs|documentation|help/i.test(text)) signals.navigational++;
  }

  const primary = Object.entries(signals).sort((a, b) => b[1] - a[1])[0];
  return {
    primary: primary[0],
    signals,
    recommendation: intentRecommendation(primary[0]),
  };
}

/**
 * Return a content recommendation based on intent type.
 * @param {string} intent
 * @returns {string}
 */
function intentRecommendation(intent) {
  const recs = {
    informational: 'Write educational, in-depth content. Use question H2s, definitions, and examples.',
    transactional: 'Focus on benefits, pricing, CTAs, and social proof. Include comparison tables.',
    comparison: 'Create detailed comparison tables, pros/cons lists, and clear recommendations.',
    navigational: 'Ensure clear navigation, documentation structure, and quick-access links.',
  };
  return recs[intent] || recs.informational;
}

/**
 * Generate a suggested H1/title based on keyword and related pages.
 * Uses intent-aware title generation with content gap analysis.
 * @param {string} keyword
 * @param {object[]} relatedPages
 * @returns {string}
 */
function generateSuggestedTitle(keyword, relatedPages) {
  const titles = relatedPages.map(p => p.title).filter(t => t.length > 0);
  const titleKeyword = keyword.split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Classify search intent from related content
  const allText = relatedPages.map(p => [p.title, p.h1, ...p.h2s].join(' ')).join(' ').toLowerCase();

  const isHowTo = /how to|step|guide|tutorial|setup|install|configure/i.test(allText);
  const isComparison = /vs|versus|compare|alternative|best|top \d/i.test(allText);
  const isDefinition = /what is|meaning|definition|explained|understanding/i.test(allText);
  const isProblem = /fix|solve|issue|problem|error|troubleshoot|why/i.test(allText);
  const isList = /best|top \d|\d+ ways|\d+ tips|\d+ strategies/i.test(allText);

  // Count existing pages to find content gaps in title format
  const existingFormats = {
    number: titles.filter(t => /\d+/.test(t)).length,
    question: titles.filter(t => /\?/.test(t) || /^(what|how|why|when|where|who|can|does|is|are|should)/i.test(t)).length,
    guide: titles.filter(t => /guide|tutorial|101/i.test(t)).length,
    year: titles.filter(t => /\b20\d{2}\b/.test(t)).length,
  };

  // Generate title that fills a content gap in format
  const year = new Date().getFullYear();

  if (isComparison && existingFormats.number === 0) {
    return `${titleKeyword}: The 7 Best Options Compared (${year})`;
  }
  if (isProblem && existingFormats.question === 0) {
    return `Why ${titleKeyword} Fails (And How to Fix It)`;
  }
  if (isHowTo && existingFormats.guide === 0) {
    return `${titleKeyword}: The Complete Guide for ${year}`;
  }
  if (isDefinition) {
    return `${titleKeyword} Explained: What It Is and Why It Matters`;
  }
  if (isList && existingFormats.number === 0) {
    return `11 ${titleKeyword} Strategies That Actually Work`;
  }
  if (existingFormats.year === 0) {
    return `${titleKeyword}: What Works in ${year} (Data-Backed Guide)`;
  }
  if (existingFormats.question === 0) {
    return `Is ${titleKeyword} Worth It? An Honest Analysis`;
  }
  return `The ${titleKeyword} Playbook: From Zero to Expert`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0) {
  const dir = args[0] || '.';
  const keyword = args[1] || '';
  const result = generateBrief(dir, keyword);
  console.log(JSON.stringify(result, null, 2));
}
