import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'url';
import { analyzeDirectory, analyzeKeywords } from '../tools/content-analyzer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  it('detects orphan pages with no incoming internal links', () => {
    const dir = makeTmpDir();
    // Page A links to page B, but page C gets no links from anyone
    writeHtml(dir, 'a.html',
      `<!DOCTYPE html><html><head><title>A</title></head><body><p>${easyText(20)}</p><a href="./b.html">Go B</a></body></html>`);
    writeHtml(dir, 'b.html',
      `<!DOCTYPE html><html><head><title>B</title></head><body><p>${easyText(20)}</p><a href="./a.html">Go A</a></body></html>`);
    writeHtml(dir, 'c.html',
      `<!DOCTYPE html><html><head><title>C</title></head><body><p>${easyText(20)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      assert.ok(result.orphanPages.length > 0, 'Should detect orphan pages');
      assert.ok(result.orphanPages.includes('c.html'), 'c.html should be orphaned');
      const finding = result.findings.find(f => f.rule === 'orphan-content');
      assert.ok(finding, 'Should have orphan-content finding');
      assert.equal(finding.severity, 'high');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects topic clusters from shared keywords', () => {
    const dir = makeTmpDir();
    // Both pages share significant keywords: performance, optimization, caching, latency
    const topicA = 'Performance optimization requires caching strategies. Caching improves latency dramatically. Performance gains from optimization and caching reduce latency. Server latency drops with proper caching and optimization of performance bottlenecks. ';
    const topicB = 'Performance optimization through caching layers. Caching reduces latency for visitors. Optimization of performance starts with caching at the edge. Latency improvements come from smart caching and performance optimization techniques. ';
    writeHtml(dir, 'perf-a.html',
      `<!DOCTYPE html><html><head><title>Perf A</title></head><body><h1>Performance Tips</h1><h2>Web Optimization</h2><p>${topicA.repeat(5)}</p></body></html>`);
    writeHtml(dir, 'perf-b.html',
      `<!DOCTYPE html><html><head><title>Perf B</title></head><body><h1>Performance Guide</h1><h2>Speed Optimization</h2><p>${topicB.repeat(5)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      assert.ok(result.topicClusters.length > 0, 'Should detect topic clusters');
      const cluster = result.topicClusters[0];
      assert.ok(cluster.sharedKeywords.length >= 3, 'Should have at least 3 shared keywords');
      assert.ok(cluster.missingLinks.length > 0, 'Should suggest missing links between cluster pages');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects hub pages with many outgoing internal links', () => {
    const dir = makeTmpDir();
    const hubLinks = Array.from({ length: 6 }, (_, i) => `<a href="./page-${i}.html">Page ${i}</a>`).join(' ');
    writeHtml(dir, 'hub.html',
      `<!DOCTYPE html><html><head><title>Hub</title></head><body><p>${easyText(20)}</p>${hubLinks}</body></html>`);
    writeHtml(dir, 'page-0.html',
      `<!DOCTYPE html><html><head><title>P0</title></head><body><p>${easyText(20)}</p></body></html>`);
    try {
      const result = analyzeDirectory(dir);
      assert.ok(result.hubPages.length > 0, 'Should detect hub pages');
      assert.ok(result.hubPages[0].outgoingLinks >= 5, 'Hub page should have >= 5 outgoing links');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('generates no-hub-page finding when 5+ pages exist without a hub', () => {
    const dir = makeTmpDir();
    // Create 5 pages, none with >= 5 internal links
    for (let i = 0; i < 5; i++) {
      writeHtml(dir, `page-${i}.html`,
        `<!DOCTYPE html><html><head><title>Page ${i}</title></head><body><p>${easyText(20)}</p></body></html>`);
    }
    try {
      const result = analyzeDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'no-hub-page');
      assert.ok(finding, 'Should have no-hub-page finding when 5+ pages exist without hub');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Keyword Clustering Tests
// ---------------------------------------------------------------------------

describe('analyzeKeywords', () => {
  const fixtureDir = path.join(__dirname, 'fixtures', 'keyword-cluster-dir');

  it('returns skipped when no HTML files found', () => {
    const dir = makeTmpDir();
    try {
      const result = analyzeKeywords(dir);
      assert.equal(result.skipped, true);
      assert.ok(result.reason.includes('No HTML'));
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns correct top-level structure', () => {
    const result = analyzeKeywords(fixtureDir);
    assert.ok('clusters' in result, 'should have clusters');
    assert.ok('cannibalization' in result, 'should have cannibalization');
    assert.ok('contentGaps' in result, 'should have contentGaps');
    assert.ok('primaryKeywords' in result, 'should have primaryKeywords');
    assert.ok('summary' in result, 'should have summary');
  });

  it('extracts a primary keyword for each page', () => {
    const result = analyzeKeywords(fixtureDir);
    assert.ok(result.primaryKeywords.length > 0, 'should have primary keywords');
    for (const pk of result.primaryKeywords) {
      assert.ok(pk.file, 'primary keyword entry should have file');
      assert.ok(pk.primaryKeyword, `page ${pk.file} should have a primary keyword`);
      assert.ok(typeof pk.score === 'number', 'score should be a number');
      assert.ok(pk.topKeywords.length > 0, 'should have top keywords list');
    }
  });

  it('clusters pages with shared keywords (SEO pages should cluster)', () => {
    const result = analyzeKeywords(fixtureDir);
    // seo-basics.html and seo-advanced.html share keywords like optimization, search, keyword, engine
    assert.ok(result.clusters.length > 0, 'should detect at least one cluster');
    const seoCluster = result.clusters.find(cl =>
      cl.pages.some(p => p.includes('seo-basics')) && cl.pages.some(p => p.includes('seo-advanced'))
    );
    assert.ok(seoCluster, 'SEO pages should be in the same cluster');
    assert.ok(seoCluster.keywords.length >= 3, 'cluster should have at least 3 shared keywords');
  });

  it('detects content gaps (unique topics with only 1 page)', () => {
    const result = analyzeKeywords(fixtureDir);
    assert.ok(result.contentGaps.length > 0, 'should detect content gaps');
    // Email deliverability keywords should appear as gaps since only one page covers them
    const emailGap = result.contentGaps.find(g =>
      g.keyword.includes('deliverability') || g.keyword.includes('email') || g.keyword.includes('authentication') || g.keyword.includes('inbox')
    );
    assert.ok(emailGap, 'unique-topic keywords should appear as content gaps');
    assert.ok(emailGap.recommendation, 'content gap should have a recommendation');
    assert.ok(emailGap.currentPage, 'content gap should reference the current page');
  });

  it('detects keyword cannibalization when pages share primary keyword', () => {
    const dir = makeTmpDir();
    // Both pages use the exact same unique H1 keyword "memoization" which only appears in these 2 pages
    // With 3 total pages, the shared keyword has non-zero IDF and high TF in head tokens
    const text1 = 'Memoization helps cache expensive computations. Memoization patterns improve rendering speed. Understanding memoization is key to fast applications. ';
    const text2 = 'Memoization techniques for advanced developers. Memoization strategies for production codebases. Deep dive into memoization implementation details. ';
    const text3 = 'Database indexing improves query latency. Indexing strategies for PostgreSQL tables. Database indexing fundamentals for developers. ';
    writeHtml(dir, 'memo-guide.html',
      `<!DOCTYPE html><html><head><title>Memoization Explained</title></head><body><h1>Memoization Explained</h1><p>${text1.repeat(4)}</p></body></html>`);
    writeHtml(dir, 'memo-tips.html',
      `<!DOCTYPE html><html><head><title>Memoization Tips</title></head><body><h1>Memoization Tips</h1><p>${text2.repeat(4)}</p></body></html>`);
    writeHtml(dir, 'db-index.html',
      `<!DOCTYPE html><html><head><title>Database Indexing</title></head><body><h1>Database Indexing</h1><p>${text3.repeat(4)}</p></body></html>`);
    try {
      const result = analyzeKeywords(dir);
      assert.ok(result.cannibalization.length > 0, 'should detect cannibalization');
      const issue = result.cannibalization.find(c => c.keyword === 'memoization');
      assert.ok(issue, 'should detect memoization cannibalization');
      assert.ok(issue.pages.length >= 2, 'cannibalization should involve 2+ pages');
      assert.ok(issue.recommendation, 'should have a recommendation');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('summary counts match actual data', () => {
    const result = analyzeKeywords(fixtureDir);
    assert.equal(result.summary.totalClusters, result.clusters.length);
    assert.equal(result.summary.cannibalizationIssues, result.cannibalization.length);
    assert.equal(result.summary.contentGaps, result.contentGaps.length);
  });

  it('cluster suggests pillar page when 3+ pages share a theme', () => {
    const dir = makeTmpDir();
    // Create 3 pages sharing 4+ keywords: javascript, testing, framework, unit, coverage
    // Plus 1 unrelated page so keywords don't appear in every doc (keeping IDF > 0)
    const text1 = 'JavaScript testing framework for unit coverage. Testing JavaScript applications with unit coverage tools. JavaScript unit testing framework with Jest coverage reports. Testing coverage across JavaScript framework modules. ';
    const text2 = 'JavaScript testing framework selection guide. Testing JavaScript framework performance with unit benchmarks. JavaScript unit testing framework coverage analysis. Testing framework coverage metrics for JavaScript applications. ';
    const text3 = 'JavaScript testing framework automation setup. Testing JavaScript framework integrations for unit suites. JavaScript unit testing framework coverage pipelines. Testing framework coverage deployment for JavaScript projects. ';
    const text4 = 'Python machine learning pipelines for data science. Machine learning model training with scikit-learn. Python data preprocessing and feature engineering. Machine learning deployment strategies for production systems. ';
    writeHtml(dir, 'js-test-1.html',
      `<!DOCTYPE html><html><head><title>JavaScript Testing Framework Guide</title></head><body><h1>JavaScript Testing Framework</h1><p>${text1.repeat(4)}</p></body></html>`);
    writeHtml(dir, 'js-test-2.html',
      `<!DOCTYPE html><html><head><title>JavaScript Testing Framework Selection</title></head><body><h1>JavaScript Testing Framework</h1><p>${text2.repeat(4)}</p></body></html>`);
    writeHtml(dir, 'js-test-3.html',
      `<!DOCTYPE html><html><head><title>JavaScript Testing Framework Automation</title></head><body><h1>JavaScript Testing Framework</h1><p>${text3.repeat(4)}</p></body></html>`);
    writeHtml(dir, 'python-ml.html',
      `<!DOCTYPE html><html><head><title>Python Machine Learning</title></head><body><h1>Python Machine Learning</h1><p>${text4.repeat(4)}</p></body></html>`);
    try {
      const result = analyzeKeywords(dir);
      assert.ok(result.clusters.length > 0, 'should have clusters');
      const bigCluster = result.clusters.find(cl => cl.pages.length >= 3);
      assert.ok(bigCluster, 'should have a cluster with 3+ pages');
      assert.ok(bigCluster.suggestedPillar, 'cluster with 3+ pages should suggest pillar page');
      assert.ok(bigCluster.suggestedPillar.includes('pillar'), 'suggestion should mention pillar');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('top keywords include TF-IDF scores', () => {
    const result = analyzeKeywords(fixtureDir);
    const pk = result.primaryKeywords[0];
    assert.ok(pk.topKeywords.length > 0, 'should have top keywords');
    for (const tk of pk.topKeywords) {
      assert.ok(typeof tk.keyword === 'string', 'keyword should be a string');
      assert.ok(typeof tk.score === 'number', 'score should be a number');
      assert.ok(tk.score > 0, 'TF-IDF score should be positive');
    }
  });
});
