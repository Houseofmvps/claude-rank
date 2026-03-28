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
    findings,
    summary: {
      critical: 0,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length > 0) {
  const result = analyzeDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
