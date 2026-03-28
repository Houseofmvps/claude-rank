import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanDirectory } from '../tools/citability-scorer.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'citability-test-'));
}

function writeHtml(dir, filename, html) {
  fs.writeFileSync(path.join(dir, filename), html, 'utf8');
}

const PADDING_WORDS = 'word '.repeat(60); // 60 words to pass the 50-word minimum

describe('citability-scorer', () => {
  it('returns skipped when no HTML files found', () => {
    const dir = makeTmpDir();
    try {
      const result = scanDirectory(dir);
      assert.equal(result.skipped, true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns low score for minimal content page', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Test</title></head><body><p>${PADDING_WORDS}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(!result.skipped);
      assert.ok(result.scores.citability < 30,
        `Expected low citability score but got ${result.scores.citability}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('scores high on statisticDensity for stats-rich content', () => {
    const dir = makeTmpDir();
    const statsContent = 'Revenue grew 45.2% to $12,500 in Q1. Retention is 92%. ' +
      'Churn dropped to 3.1%. Customer count hit 1,500. ARR is $150,000. ' +
      'NPS score reached 78%. Growth rate is 2.3x year over year. ' + PADDING_WORDS;
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Stats Page</title></head><body><p>${statsContent}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.breakdown.statisticDensity >= 10,
        `Expected high statisticDensity but got ${page.breakdown.statisticDensity}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects front-loading with direct answer in first 30%', () => {
    const dir = makeTmpDir();
    const content = 'Claude Rank is a comprehensive SEO audit tool that provides actionable insights. ' +
      'It scores 95% of pages correctly. ' + PADDING_WORDS;
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Front Load</title></head><body><p>${content}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.breakdown.frontLoading >= 8,
        `Expected front-loading score >= 8 but got ${page.breakdown.frontLoading}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('scores high on sourceCitations with .edu/.gov links', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Research</title></head><body>
        <p>${PADDING_WORDS}</p>
        <a href="https://www.harvard.edu/research">Harvard Study</a>
        <a href="https://www.cdc.gov/data">CDC Data</a>
        <a href="https://arxiv.org/abs/1234.5678">ArXiv Paper</a>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.breakdown.sourceCitations >= 15,
        `Expected high sourceCitations but got ${page.breakdown.sourceCitations}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('scores high on expertAttribution with Person schema', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Expert</title>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Dr. Smith","jobTitle":"Data Scientist","credentials":"PhD"}</script>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","author":{"@type":"Person","name":"Dr. Smith"}}</script>
      </head><body>
        <p>${PADDING_WORDS}</p>
        <blockquote>According to our research, the results are significant.</blockquote>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.breakdown.expertAttribution >= 10,
        `Expected high expertAttribution but got ${page.breakdown.expertAttribution}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('scores on definitionClarity with "X is a" patterns', () => {
    const dir = makeTmpDir();
    const defs = 'SEO is a practice of optimizing websites. ' +
      'GEO refers to generative engine optimization. ' +
      'AEO means answer engine optimization. ' +
      'Content marketing is the strategy of creating valuable content. ' +
      'A backlink is a link from another website. ' + PADDING_WORDS;
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Definitions</title></head><body><p>${defs}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.breakdown.definitionClarity >= 6,
        `Expected definitionClarity >= 6 but got ${page.breakdown.definitionClarity}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('scores on schemaCompleteness with multiple schema types', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Schema Rich</title>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Test Co"}</script>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Author"}</script>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Test"}</script>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>
        <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}</script>
      </head><body><p>${PADDING_WORDS}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const page = result.pages[0];
      assert.equal(page.breakdown.schemaCompleteness, 15,
        `Expected schemaCompleteness 15 but got ${page.breakdown.schemaCompleteness}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('scores on contentStructure with headings, lists, paragraphs', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Structured</title></head><body>
        <h1>Main Title</h1>
        <h2>Section One</h2><p>${PADDING_WORDS}</p>
        <h2>Section Two</h2><p>${PADDING_WORDS}</p>
        <h2>Section Three</h2><p>${PADDING_WORDS}</p>
        <h3>Sub Section</h3><p>${PADDING_WORDS}</p>
        <ul><li>Item one</li><li>Item two</li></ul>
        <ol><li>Step one</li><li>Step two</li></ol>
        <p>Final paragraph here.</p>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const page = result.pages[0];
      assert.ok(page.breakdown.contentStructure >= 12,
        `Expected contentStructure >= 12 but got ${page.breakdown.contentStructure}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('generates findings for low-scoring pages', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Bare</title></head><body><p>${PADDING_WORDS}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.findings.length > 0, 'Should have findings for a bare page');
      for (const f of result.findings) {
        assert.ok(['critical', 'high', 'medium', 'low'].includes(f.severity),
          `Invalid severity: ${f.severity}`);
        assert.ok(f.rule && f.rule.length > 0, 'Finding must have a rule');
        assert.ok(f.message && f.message.length > 0, 'Finding must have a message');
      }
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns correct files_scanned count', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'a.html',
      `<!DOCTYPE html><html><head><title>A</title></head><body><p>${PADDING_WORDS}</p></body></html>`);
    writeHtml(dir, 'b.html',
      `<!DOCTYPE html><html><head><title>B</title></head><body><p>${PADDING_WORDS}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.equal(result.files_scanned, 2);
      assert.equal(result.pages.length, 2);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('summary counts match findings', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Summary</title></head><body><p>${PADDING_WORDS}</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const total = result.summary.critical + result.summary.high + result.summary.medium + result.summary.low;
      assert.equal(total, result.findings.length,
        `Summary total (${total}) should match findings count (${result.findings.length})`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
