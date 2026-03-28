/**
 * content-analyzer.mjs — Content intelligence: readability, structure, quality signals.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;
  word = word.replace(/e$/, '');
  const matches = word.match(/[aeiouy]+/g);
  return matches ? Math.max(1, matches.length) : 1;
}

function fleschKincaid(text) {
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length < 3 || words.length < 30) return null; // Not enough content
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  return Math.round(206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length));
}

function gunningFog(text) {
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length < 3 || words.length < 30) return null;
  const complexWords = words.filter(w => countSyllables(w) >= 3).length;
  return Math.round(0.4 * ((words.length / sentences.length) + 100 * (complexWords / words.length)));
}

function readabilityLabel(fk) {
  if (fk === null) return 'N/A';
  if (fk >= 80) return 'Very Easy (6th grade)';
  if (fk >= 70) return 'Easy (7th grade)';
  if (fk >= 60) return 'Standard (8-9th grade)';
  if (fk >= 50) return 'Moderate (10-12th grade)';
  if (fk >= 30) return 'Difficult (College)';
  return 'Very Difficult (Graduate)';
}

function passiveVoiceRatio(text) {
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  const passive = sentences.filter(s => /\b(is|are|was|were|been|being|be)\s+\w+ed\b/i.test(s));
  return passive.length / sentences.length;
}

function avgSentenceLength(text) {
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (sentences.length === 0) return 0;
  return Math.round(words.length / sentences.length);
}

/**
 * Simple content fingerprint for duplicate detection.
 * Uses first 200 significant words, lowercased.
 */
function contentFingerprint(text) {
  const STOP = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','by','from','is','it','as','be']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 3 && !STOP.has(w));
  return words.slice(0, 200);
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function analyzeDirectory(rootDir) {
  const absRoot = path.resolve(rootDir);
  const htmlFiles = findHtmlFiles(absRoot);

  if (htmlFiles.length === 0) {
    return { skipped: true, reason: 'No HTML files found' };
  }

  const pages = [];
  const fingerprints = [];
  const topicMap = new Map(); // H2 topic -> [files]
  const findings = [];
  const pageStates = new Map(); // rel -> parsed state (for cross-page analysis)

  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const state = parseHtml(content);
    const bodyText = state.bodyText || '';
    const rel = path.relative(absRoot, filePath);
    const wordCount = state.mainContentWordCount || state.wordCount;

    // Readability
    const fk = fleschKincaid(bodyText);
    const fog = gunningFog(bodyText);
    const passive = passiveVoiceRatio(bodyText);
    const avgSentLen = avgSentenceLength(bodyText);

    // Paragraph analysis
    const paragraphs = bodyText.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    const longParagraphs = paragraphs.filter(p => p.split(/\s+/).length > 150).length;

    // Topic tracking
    for (const h2 of state.h2Texts) {
      const topic = h2.toLowerCase().trim();
      if (!topicMap.has(topic)) topicMap.set(topic, []);
      topicMap.get(topic).push(rel);
    }

    // Fingerprint for duplicate detection
    const fp = contentFingerprint(bodyText);
    fingerprints.push({ file: rel, fingerprint: fp });

    // Store state for cross-page analysis
    pageStates.set(rel, state);

    pages.push({
      file: rel,
      wordCount,
      readability: {
        fleschKincaid: fk,
        label: readabilityLabel(fk),
        gunningFog: fog,
        passiveVoice: Math.round(passive * 100) + '%',
        avgSentenceLength: avgSentLen,
      },
      headings: {
        h1: state.h1Text || null,
        h2Count: state.h2Texts.length,
        h2Topics: state.h2Texts,
      },
      issues: {
        longParagraphs,
        highPassiveVoice: passive > 0.3,
        lowReadability: fk !== null && fk < 30,
        thinContent: wordCount < 300,
      },
    });
  }

  // Cross-page: duplicate content detection
  const duplicates = [];
  for (let i = 0; i < fingerprints.length; i++) {
    for (let j = i + 1; j < fingerprints.length; j++) {
      const sim = jaccardSimilarity(fingerprints[i].fingerprint, fingerprints[j].fingerprint);
      if (sim > 0.7) {
        duplicates.push({
          files: [fingerprints[i].file, fingerprints[j].file],
          similarity: Math.round(sim * 100) + '%',
        });
      }
    }
  }

  // Cross-page: internal linking suggestions (pages with similar H2 topics that don't link to each other)
  const linkSuggestions = [];
  for (const [topic, files] of topicMap) {
    if (files.length > 1 && topic.length > 5) {
      linkSuggestions.push({ topic, pages: files });
    }
  }

  // ---------------------------------------------------------------------------
  // Cross-page: Orphan content detection
  // Build a set of pages that receive at least one internal link from another page.
  // ---------------------------------------------------------------------------
  const linkedPages = new Set();
  for (const [sourceFile, state] of pageStates) {
    for (const href of state.internalLinks) {
      // Normalise the href to a relative file path for comparison
      const normalised = href.replace(/^\.\//, '').replace(/\/$/, '/index.html').replace(/^\//, '');
      for (const p of pages) {
        if (p.file === normalised || p.file.endsWith('/' + normalised) || normalised.endsWith(p.file)) {
          linkedPages.add(p.file);
        }
      }
    }
  }
  const orphanPages = pages.map(p => p.file).filter(f => !linkedPages.has(f));

  // ---------------------------------------------------------------------------
  // Cross-page: Topic cluster detection
  // Extract significant keywords from H1, H2 and body text, group pages by shared keywords.
  // ---------------------------------------------------------------------------
  const STOP_WORDS = new Set([
    'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
    'is','it','as','be','this','that','are','was','were','been','being','have','has',
    'had','do','does','did','will','would','could','should','can','may','might',
    'about','your','you','our','we','they','their','them','its','not','all','more',
    'how','what','when','where','why','which','who','than','into','also','just',
    'get','got','use','used','new','one','two','each','every','most','some','any',
  ]);

  function extractKeywords(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  }

  const pageKeywords = new Map(); // rel -> Set of keywords
  for (const p of pages) {
    const st = pageStates.get(p.file);
    if (!st) continue;
    const sources = [st.h1Text || '', ...st.h2Texts, st.bodyText || ''];
    const kws = extractKeywords(sources.join(' '));
    // Keep only keywords that appear at least twice (significant)
    const freq = new Map();
    for (const w of kws) freq.set(w, (freq.get(w) || 0) + 1);
    pageKeywords.set(p.file, new Set([...freq.entries()].filter(([, c]) => c >= 2).map(([w]) => w)));
  }

  const topicClusters = [];
  const clusterFiles = [...pageKeywords.keys()];
  for (let i = 0; i < clusterFiles.length; i++) {
    for (let j = i + 1; j < clusterFiles.length; j++) {
      const kwA = pageKeywords.get(clusterFiles[i]);
      const kwB = pageKeywords.get(clusterFiles[j]);
      if (!kwA || !kwB || kwA.size === 0 || kwB.size === 0) continue;
      const shared = [...kwA].filter(w => kwB.has(w));
      if (shared.length >= 3) {
        // Check if these pages already link to each other
        const stA = pageStates.get(clusterFiles[i]);
        const stB = pageStates.get(clusterFiles[j]);
        const aLinksB = stA && stA.internalLinks.some(l => l.includes(clusterFiles[j].replace(/\.html?$/, '')));
        const bLinksA = stB && stB.internalLinks.some(l => l.includes(clusterFiles[i].replace(/\.html?$/, '')));
        if (!aLinksB || !bLinksA) {
          topicClusters.push({
            pages: [clusterFiles[i], clusterFiles[j]],
            sharedKeywords: shared.slice(0, 8),
            missingLinks: [
              ...(!aLinksB ? [{ from: clusterFiles[i], to: clusterFiles[j] }] : []),
              ...(!bLinksA ? [{ from: clusterFiles[j], to: clusterFiles[i] }] : []),
            ],
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cross-page: Hub page detection
  // A hub/pillar page has many outgoing internal links (>= 5).
  // ---------------------------------------------------------------------------
  const hubPages = [];
  for (const [file, state] of pageStates) {
    if (state.internalLinks.length >= 5) {
      hubPages.push({ file, outgoingLinks: state.internalLinks.length });
    }
  }

  // Generate findings
  const thinPages = pages.filter(p => p.issues.thinContent);
  const lowReadPages = pages.filter(p => p.issues.lowReadability);
  const highPassivePages = pages.filter(p => p.issues.highPassiveVoice);
  const wallOfTextPages = pages.filter(p => p.issues.longParagraphs > 0);

  if (thinPages.length > 0) {
    findings.push({ rule: 'thin-pages', severity: 'high', message: `${thinPages.length} page(s) have < 300 words — expand content for better rankings`, files: thinPages.map(p => p.file) });
  }
  if (lowReadPages.length > 0) {
    findings.push({ rule: 'low-readability', severity: 'medium', message: `${lowReadPages.length} page(s) have very low readability (Flesch-Kincaid < 30) — simplify language for broader audience`, files: lowReadPages.map(p => p.file) });
  }
  if (highPassivePages.length > 0) {
    findings.push({ rule: 'high-passive-voice', severity: 'low', message: `${highPassivePages.length} page(s) have > 30% passive voice — use active voice for clearer, more engaging writing`, files: highPassivePages.map(p => p.file) });
  }
  if (wallOfTextPages.length > 0) {
    findings.push({ rule: 'wall-of-text', severity: 'low', message: `${wallOfTextPages.length} page(s) have paragraphs with 150+ words — break into shorter paragraphs for readability`, files: wallOfTextPages.map(p => p.file) });
  }
  if (duplicates.length > 0) {
    findings.push({ rule: 'duplicate-content', severity: 'high', message: `${duplicates.length} page pair(s) have > 70% content similarity — consolidate or differentiate`, pairs: duplicates });
  }
  if (orphanPages.length > 0) {
    findings.push({ rule: 'orphan-content', severity: 'high', message: `${orphanPages.length} page(s) have no incoming internal links — add links from related pages`, files: orphanPages });
  }
  if (hubPages.length === 0 && pages.length >= 5) {
    findings.push({ rule: 'no-hub-page', severity: 'medium', message: 'No hub/pillar page detected — create a page that links to all related content', files: [] });
  }

  // Avg readability
  const fkScores = pages.map(p => p.readability.fleschKincaid).filter(v => v !== null);
  const avgFk = fkScores.length > 0 ? Math.round(fkScores.reduce((a, b) => a + b, 0) / fkScores.length) : null;

  return {
    files_scanned: pages.length,
    avgReadability: {
      fleschKincaid: avgFk,
      label: readabilityLabel(avgFk),
    },
    pages,
    duplicates,
    linkSuggestions: linkSuggestions.slice(0, 10),
    topicClusters: topicClusters.slice(0, 10),
    orphanPages,
    hubPages,
    findings,
    summary: {
      critical: 0,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
  };
}

// ---------------------------------------------------------------------------
// Keyword Clustering Analyzer
// ---------------------------------------------------------------------------

/**
 * Stop words for keyword extraction — common English words that carry no topical weight.
 */
const KEYWORD_STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','it','as','be','this','that','are','was','were','been','being','have','has',
  'had','do','does','did','will','would','could','should','can','may','might',
  'about','your','you','our','we','they','their','them','its','not','all','more',
  'how','what','when','where','why','which','who','than','into','also','just',
  'get','got','use','used','new','one','two','each','every','most','some','any',
  'only','very','much','such','these','those','other','after','before','between',
  'same','over','own','through','then','here','there','now','way','well','make',
  'like','back','even','still','know','take','come','made','find','first','last',
  'long','great','little','right','look','think','help','need','want','using',
  'page','click','site','website','read','many','good','best','free','work',
  'love','hear','touch','shall','deserve','feel','dream','hope','believe',
  'experience','discover','amazing','wonderful','truly','really','today',
  'start','stop','keep','give','show','tell','turn','call','send','open',
  'close','move','play','said','says','done','went','goes','going','must',
  'let','put','run','set','try','ask','told','left','hold','bring',
  'without','within','along','while','until','already','always','never',
  'everything','nothing','something','someone','everyone','anyone',
  'because','though','since','below','above','down','away','next','sure',
]);

/**
 * Extract significant keywords from text, filtering stop words and short tokens.
 * @param {string} text
 * @returns {string[]} array of keyword tokens (not deduplicated)
 */
function extractSignificantKeywords(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 4 && !KEYWORD_STOP_WORDS.has(w));
}

/**
 * Compute TF-IDF scores for keywords across a corpus.
 * @param {Map<string, string[]>} pageKeywordMap — rel -> array of keyword tokens (with repeats)
 * @returns {Map<string, Map<string, number>>} rel -> Map<keyword, tfidfScore>
 */
function computeTfIdf(pageKeywordMap) {
  const totalDocs = pageKeywordMap.size;

  // Document frequency: how many pages contain each keyword
  const df = new Map();
  for (const [, tokens] of pageKeywordMap) {
    const unique = new Set(tokens);
    for (const kw of unique) {
      df.set(kw, (df.get(kw) || 0) + 1);
    }
  }

  // TF-IDF per page
  const tfidf = new Map();
  for (const [rel, tokens] of pageKeywordMap) {
    if (tokens.length === 0) continue;
    // Term frequency
    const tf = new Map();
    for (const kw of tokens) {
      tf.set(kw, (tf.get(kw) || 0) + 1);
    }
    const scores = new Map();
    for (const [kw, count] of tf) {
      const termFreq = count / tokens.length;
      const idf = Math.log(totalDocs / (df.get(kw) || 1));
      scores.set(kw, termFreq * idf);
    }
    tfidf.set(rel, scores);
  }

  return tfidf;
}

/**
 * Analyze keyword clusters, cannibalization, and content gaps across HTML pages.
 * @param {string} rootDir — directory containing HTML files
 * @returns {{ clusters: Array, cannibalization: Array, contentGaps: Array, primaryKeywords: Array }}
 */
export function analyzeKeywords(rootDir) {
  const absRoot = path.resolve(rootDir);
  const htmlFiles = findHtmlFiles(absRoot);

  if (htmlFiles.length === 0) {
    return { skipped: true, reason: 'No HTML files found' };
  }

  // ---------------------------------------------------------------------------
  // Phase 1: Extract keywords from each page (H1, H2, meta description, body)
  // ---------------------------------------------------------------------------
  const pageTokens = new Map();   // rel -> all keyword tokens (raw, with repeats)
  const pageHeadTokens = new Map(); // rel -> tokens from H1 + title only (for primary keyword)
  const pageStates = new Map();

  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const state = parseHtml(content);
    const rel = path.relative(absRoot, filePath);
    pageStates.set(rel, state);

    // Weighted keyword extraction: H1/title words count 3x, H2 words 2x, meta desc 2x, body 1x
    const h1Tokens = extractSignificantKeywords(state.h1Text || '');
    const titleTokens = extractSignificantKeywords(state.titleText || '');
    const h2Tokens = extractSignificantKeywords(state.h2Texts.join(' '));
    const metaTokens = extractSignificantKeywords(state.metaDescriptionText || '');
    const bodyTokens = extractSignificantKeywords(state.bodyText || '');

    // Head tokens for primary keyword detection (H1 + title, heavily weighted)
    const headTokens = [...h1Tokens, ...h1Tokens, ...h1Tokens, ...titleTokens, ...titleTokens, ...titleTokens];
    pageHeadTokens.set(rel, headTokens);

    // All tokens with weighting applied
    const allTokens = [
      ...h1Tokens, ...h1Tokens, ...h1Tokens,       // 3x weight
      ...titleTokens, ...titleTokens, ...titleTokens, // 3x weight
      ...h2Tokens, ...h2Tokens,                     // 2x weight
      ...metaTokens, ...metaTokens,                 // 2x weight
      ...bodyTokens,                                 // 1x weight
    ];
    pageTokens.set(rel, allTokens);
  }

  if (pageTokens.size === 0) {
    return { skipped: true, reason: 'No parseable HTML files found' };
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Compute TF-IDF and determine primary keyword per page
  // ---------------------------------------------------------------------------
  const tfidfScores = computeTfIdf(pageTokens);

  const primaryKeywords = [];
  const primaryKeywordMap = new Map(); // rel -> primary keyword string

  for (const [rel, scores] of tfidfScores) {
    // Primary keyword: highest raw frequency from head tokens (H1 + title).
    // We use raw frequency instead of TF-IDF for the primary keyword because
    // TF-IDF penalizes words shared across pages, but a page's primary keyword
    // is the word most emphasized in its H1/title regardless of cross-page usage.
    const headTokens = pageHeadTokens.get(rel) || [];
    let bestKeyword = null;
    let bestScore = -1;

    if (headTokens.length > 0) {
      const headFreq = new Map();
      for (const t of headTokens) headFreq.set(t, (headFreq.get(t) || 0) + 1);
      for (const [kw, count] of headFreq) {
        const freq = count / headTokens.length;
        if (freq > bestScore) {
          bestScore = freq;
          bestKeyword = kw;
        }
      }
    }

    // Fall back to overall top TF-IDF keyword
    if (!bestKeyword) {
      for (const [kw, score] of scores) {
        if (score > bestScore) {
          bestScore = score;
          bestKeyword = kw;
        }
      }
    }

    // Top 5 keywords by TF-IDF for this page
    const topKeywords = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw, score]) => ({ keyword: kw, score: Math.round(score * 1000) / 1000 }));

    primaryKeywords.push({
      file: rel,
      primaryKeyword: bestKeyword,
      score: Math.round(bestScore * 1000) / 1000,
      topKeywords,
    });
    primaryKeywordMap.set(rel, bestKeyword);
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Build keyword sets per page (significant keywords with TF-IDF > 0)
  // ---------------------------------------------------------------------------
  const pageKeywordSets = new Map();
  for (const [rel, scores] of tfidfScores) {
    // Keep keywords that appear at least twice in raw tokens and have non-trivial TF-IDF
    const rawTokens = pageTokens.get(rel) || [];
    const freq = new Map();
    for (const t of rawTokens) freq.set(t, (freq.get(t) || 0) + 1);
    const significant = new Set(
      [...freq.entries()]
        .filter(([kw, count]) => count >= 2 && scores.has(kw))
        .map(([kw]) => kw)
    );
    pageKeywordSets.set(rel, significant);
  }

  // ---------------------------------------------------------------------------
  // Phase 4: Cluster pages by shared keywords (3+ shared significant keywords)
  // ---------------------------------------------------------------------------
  const clusters = [];
  const files = [...pageKeywordSets.keys()];
  // Track which pages have been added to which cluster groups
  const clusterIndex = new Map(); // cluster label -> { pages: Set, keywords: Set }

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const kwA = pageKeywordSets.get(files[i]);
      const kwB = pageKeywordSets.get(files[j]);
      if (!kwA || !kwB || kwA.size === 0 || kwB.size === 0) continue;

      const shared = [...kwA].filter(w => kwB.has(w));
      if (shared.length >= 3) {
        // Try to merge into an existing cluster
        let merged = false;
        for (const [, cluster] of clusterIndex) {
          if (cluster.pages.has(files[i]) || cluster.pages.has(files[j])) {
            cluster.pages.add(files[i]);
            cluster.pages.add(files[j]);
            for (const kw of shared) cluster.keywords.add(kw);
            merged = true;
            break;
          }
        }
        if (!merged) {
          const label = shared.slice(0, 3).join(', ');
          clusterIndex.set(label, {
            pages: new Set([files[i], files[j]]),
            keywords: new Set(shared),
          });
        }
      }
    }
  }

  for (const [, cluster] of clusterIndex) {
    const kwArr = [...cluster.keywords].slice(0, 10);
    clusters.push({
      theme: kwArr.slice(0, 3).join(' + '),
      keywords: kwArr,
      pages: [...cluster.pages],
      suggestedPillar: cluster.pages.size >= 3
        ? `Create a pillar page covering: ${kwArr.slice(0, 5).join(', ')}`
        : null,
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 5: Detect keyword cannibalization (multiple pages sharing same primary keyword)
  // ---------------------------------------------------------------------------
  const cannibalization = [];
  const primaryGroups = new Map(); // keyword -> [files]
  for (const [rel, kw] of primaryKeywordMap) {
    if (!kw) continue;
    if (!primaryGroups.has(kw)) primaryGroups.set(kw, []);
    primaryGroups.get(kw).push(rel);
  }
  for (const [keyword, pages] of primaryGroups) {
    if (pages.length > 1) {
      cannibalization.push({
        keyword,
        pages,
        recommendation: `Consolidate "${keyword}" targeting into one authoritative page, or differentiate each page's angle`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 6: Identify content gaps (topics with only 1 page)
  // ---------------------------------------------------------------------------
  const contentGaps = [];
  // Collect all significant keywords and count how many pages target them
  const keywordPageCount = new Map();
  for (const [rel, kwSet] of pageKeywordSets) {
    for (const kw of kwSet) {
      if (!keywordPageCount.has(kw)) keywordPageCount.set(kw, []);
      keywordPageCount.get(kw).push(rel);
    }
  }
  // Topics that appear significant on only 1 page (but have high TF-IDF) are gaps
  for (const [kw, pages] of keywordPageCount) {
    if (pages.length === 1) {
      const scores = tfidfScores.get(pages[0]);
      const score = scores ? (scores.get(kw) || 0) : 0;
      if (score > 0.05) { // Only significant keywords (higher threshold avoids noise)
        contentGaps.push({
          keyword: kw,
          currentPage: pages[0],
          score: Math.round(score * 1000) / 1000,
          recommendation: `Create additional content around "${kw}" to build topical authority`,
        });
      }
    }
  }
  // Sort by TF-IDF score descending and limit
  contentGaps.sort((a, b) => b.score - a.score);
  const topGaps = contentGaps.slice(0, 20);

  return {
    clusters,
    cannibalization,
    contentGaps: topGaps,
    primaryKeywords,
    summary: {
      totalPages: pageTokens.size,
      totalClusters: clusters.length,
      cannibalizationIssues: cannibalization.length,
      contentGaps: topGaps.length,
    },
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length > 0) {
  const result = analyzeDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
