import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanDirectory } from '../tools/perf-scanner.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'perf-test-'));
}

function writeHtml(dir, filename, html) {
  fs.writeFileSync(path.join(dir, filename), html, 'utf8');
}

describe('perf-scanner', () => {
  it('returns skipped when no HTML files found', () => {
    const dir = makeTmpDir();
    try {
      const result = scanDirectory(dir);
      assert.equal(result.skipped, true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects images without width/height dimensions', () => {
    const dir = makeTmpDir();
    // All images missing dimensions (> 50% threshold)
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>No Dims</title></head><body>
        <img src="a.jpg" alt="A">
        <img src="b.jpg" alt="B">
        <img src="c.jpg" alt="C">
        <img src="d.jpg" alt="D">
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'images-no-dimensions');
      assert.ok(finding, 'Should detect images without dimensions');
      assert.equal(finding.severity, 'high');
      assert.ok(result.metrics.imagesWithoutDimensions > 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects excessive blocking scripts (>5 without async/defer)', () => {
    const dir = makeTmpDir();
    const scripts = Array(8).fill('<script src="https://cdn.example.com/lib.js"></script>').join('\n');
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Blocking</title>${scripts}</head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'excessive-blocking-scripts');
      assert.ok(finding, 'Should detect excessive blocking scripts');
      assert.equal(finding.severity, 'high');
      assert.ok(result.metrics.blockingScripts > 5);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects large inline CSS (>50KB)', () => {
    const dir = makeTmpDir();
    const bigCss = 'body { color: red; } '.repeat(3000); // ~60KB
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Big CSS</title><style>${bigCss}</style></head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'large-inline-css');
      assert.ok(finding, 'Should detect large inline CSS');
      assert.equal(finding.severity, 'medium');
      assert.ok(result.metrics.inlineCssKB > 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects large inline JS (>50KB)', () => {
    const dir = makeTmpDir();
    const bigJs = 'var x = "hello"; '.repeat(4000); // ~68KB
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Big JS</title><script>${bigJs}</script></head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'large-inline-js');
      assert.ok(finding, 'Should detect large inline JS');
      assert.equal(finding.severity, 'medium');
      assert.ok(result.metrics.inlineJsKB > 0);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects no-lazy-loading when >5 images lack loading=lazy', () => {
    const dir = makeTmpDir();
    const imgs = Array(8).fill('<img src="photo.jpg" width="100" height="100" alt="Photo">').join('\n');
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>No Lazy</title></head><body>${imgs}</body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'no-lazy-loading');
      assert.ok(finding, 'Should detect missing lazy loading');
      assert.equal(finding.severity, 'medium');
      assert.equal(result.metrics.hasLazyLoading, false);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects no-fetchpriority when images present without fetchpriority=high', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>No FP</title></head><body>
        <img src="hero.jpg" width="800" height="600" alt="Hero">
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'no-fetchpriority');
      assert.ok(finding, 'Should detect missing fetchpriority');
      assert.equal(finding.severity, 'medium');
      assert.equal(result.metrics.hasFetchPriority, false);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects mixed content risk with HTTP resources', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Mixed</title>
        <script src="http://cdn.example.com/analytics.js"></script>
      </head><body>
        <img src="http://images.example.com/photo.jpg" width="100" height="100" alt="Photo">
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'mixed-content-risk');
      assert.ok(finding, 'Should detect mixed content');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('detects no-resource-hints when external domains present but no preload/prefetch', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>No Hints</title>
        <script src="https://cdn.example.com/lib.js" defer></script>
        <script src="https://analytics.example.com/track.js" defer></script>
      </head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'no-resource-hints');
      assert.ok(finding, 'Should detect missing resource hints');
      assert.equal(finding.severity, 'medium');
      assert.equal(result.metrics.hasResourceHints, false);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns high score for well-optimized page', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Optimized</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preload" href="/hero.jpg" as="image">
        <script src="https://cdn.example.com/app.js" defer></script>
      </head><body>
        <img src="/hero.jpg" width="1200" height="630" alt="Hero" fetchpriority="high">
        <img src="/thumb1.jpg" width="300" height="200" alt="Thumb 1" loading="lazy">
        <img src="/thumb2.jpg" width="300" height="200" alt="Thumb 2" loading="lazy">
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.scores.performance >= 80,
        `Expected high perf score but got ${result.scores.performance}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('returns correct structure with files_scanned, findings, scores, metrics, summary', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Structure</title></head><body><p>Hello</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok('files_scanned' in result);
      assert.ok('findings' in result);
      assert.ok('scores' in result);
      assert.ok('metrics' in result);
      assert.ok('summary' in result);
      assert.ok('performance' in result.scores);
      assert.equal(result.files_scanned, 1);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('score equals 100 minus sum of deductions', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Deduction</title></head><body>
        <img src="a.jpg" alt="A"><img src="b.jpg" alt="B">
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const DEDUCTIONS = { critical: 20, high: 10, medium: 5, low: 2 };
      let expectedDeduction = 0;
      for (const f of result.findings) {
        expectedDeduction += DEDUCTIONS[f.severity];
      }
      const expectedScore = Math.max(0, 100 - expectedDeduction);
      assert.equal(result.scores.performance, expectedScore,
        `Score (${result.scores.performance}) should equal max(0, 100 - ${expectedDeduction}) = ${expectedScore}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it('all findings have valid severity, rule, and message', () => {
    const dir = makeTmpDir();
    const scripts = Array(8).fill('<script src="https://cdn.example.com/x.js"></script>').join('');
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Validate</title>${scripts}</head><body>
        <img src="a.jpg" alt="A"><img src="b.jpg" alt="B">
      </body></html>`);
    try {
      const result = scanDirectory(dir);
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
});
