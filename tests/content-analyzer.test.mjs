import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { analyzeDirectory } from '../tools/content-analyzer.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'content-test-'));
}

function writeHtml(dir, filename, html) {
  fs.writeFileSync(path.join(dir, filename), html, 'utf8');
}

// Generate easy-to-read sentences
function easyText(count) {
  const sentences = [];
  for (let i = 0; i < count; i++) {
    sentences.push('The cat sat on the mat and ate a big fat rat.');
  }
  return sentences.join(' ');
}

// Generate hard-to-read text with complex words
function hardText(count) {
  const sentences = [];
  for (let i = 0; i < count; i++) {
    sentences.push('The organizational restructuring necessitated comprehensive interdepartmental collaboration regarding unprecedented administrative requirements.');
  }
  return sentences.join(' ');
}

describe('content-analyzer', () => {
  it('returns skipped when no HTML files found', () => {
    const dir = makeTmpDir();
    try {
      const result = analyzeDirectory(dir);
      assert.equal(result.skipped, true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('computes Flesch-Kincaid readability for easy text', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Easy</title></head><body><p>${easyText(20)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.readability.fleschKincaid !== null, 'FK should not be null');
      // Easy text should score high (easy reading)
      assert.ok(page.readability.fleschKincaid >= 60,
        `Expected FK >= 60 for easy text but got ${page.readability.fleschKincaid}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('computes low Flesch-Kincaid for complex text', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Hard</title></head><body><p>${hardText(20)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.readability.fleschKincaid !== null, 'FK should not be null');
      assert.ok(page.readability.fleschKincaid < 40,
        `Expected FK < 40 for hard text but got ${page.readability.fleschKincaid}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('computes Gunning Fog index', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Fog</title></head><body><p>${easyText(20)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.readability.gunningFog !== null, 'Gunning Fog should not be null');
      assert.ok(typeof page.readability.gunningFog === 'number');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects high passive voice ratio', () => {
    const dir = makeTmpDir();
    // Passive voice: "is + past participle (ed)"
    const passive = Array(15).fill('The code was reviewed by the team. The bug was discovered quickly. The fix was deployed by engineers.').join(' ');
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Passive</title></head><body><p>${passive}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.issues.highPassiveVoice,
        `Expected highPassiveVoice=true, passiveVoice=${page.readability.passiveVoice}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('calculates average sentence length', () => {
    const dir = makeTmpDir();
    // 10 sentences, each ~10 words
    const text = Array(10).fill('The quick brown fox jumps over the lazy sleeping dog.').join(' ');
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Sentences</title></head><body><p>${text}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.readability.avgSentenceLength > 0, 'Should compute avg sentence length');
      assert.ok(page.readability.avgSentenceLength <= 20,
        `Expected short avg sentence length but got ${page.readability.avgSentenceLength}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects duplicate content via Jaccard similarity', () => {
    const dir = makeTmpDir();
    const shared = easyText(30);
    writeHtml(dir, 'a.html',
      `<!DOCTYPE html><html><head><title>Page A</title></head><body><p>${shared}</p></body></html>`);
    writeHtml(dir, 'b.html',
      `<!DOCTYPE html><html><head><title>Page B</title></head><body><p>${shared}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      assert.ok(result.duplicates.length > 0, 'Should detect duplicate content');
      const dup = result.duplicates[0];
      assert.ok(dup.files.length === 2, 'Duplicate should reference 2 files');
      assert.ok(dup.similarity, 'Should have a similarity percentage');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects thin pages under 300 words', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'thin.html',
      `<!DOCTYPE html><html><head><title>Thin</title></head><body><p>Just a few words here.</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.issues.thinContent, 'Should detect thin content');
      const finding = result.findings.find(f => f.rule === 'thin-pages');
      assert.ok(finding, 'Should have thin-pages finding');
      assert.equal(finding.severity, 'high');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects wall-of-text with 150+ word paragraphs', () => {
    const dir = makeTmpDir();
    // Single massive paragraph
    const wallText = 'word '.repeat(200);
    writeHtml(dir, 'wall.html',
      `<!DOCTYPE html><html><head><title>Wall</title></head><body><p>${wallText}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.issues.longParagraphs > 0, 'Should detect long paragraphs');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns correct structure with files_scanned, pages, findings, summary', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Test</title></head><body><p>${easyText(20)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      assert.ok('files_scanned' in result);
      assert.ok('pages' in result);
      assert.ok('findings' in result);
      assert.ok('summary' in result);
      assert.ok('duplicates' in result);
      assert.ok('linkSuggestions' in result);
      assert.ok('avgReadability' in result);
      assert.equal(result.files_scanned, 1);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('generates finding for low-readability pages', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'hard.html',
      `<!DOCTYPE html><html><head><title>Complex</title></head><body><p>${hardText(30)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'low-readability');
      assert.ok(finding, 'Should generate low-readability finding for complex text');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('summary counts match findings array length', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Summary</title></head><body><p>Short.</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      const total = result.summary.critical + result.summary.high + result.summary.medium + result.summary.low;
      assert.equal(total, result.findings.length,
        `Summary total (${total}) should match findings count (${result.findings.length})`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
