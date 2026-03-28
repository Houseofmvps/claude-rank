import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanDirectory } from '../tools/security-scanner.mjs';

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sec-test-'));
}

function writeHtml(dir, filename, html) {
  fs.writeFileSync(path.join(dir, filename), html, 'utf8');
}

/** Minimal secure HTML that passes most checks. */
function secureHtml(body = '<p>Hello</p>') {
  return `<!DOCTYPE html><html><head>
    <title>Secure Page</title>
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; upgrade-insecure-requests">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="Permissions-Policy" content="camera=(), microphone=()">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <link rel="canonical" href="https://example.com/">
  </head><body>${body}</body></html>`;
}

describe('security-scanner', () => {
  // 1. Returns skipped when no HTML files found
  it('returns skipped when no HTML files found', () => {
    const dir = makeTmpDir();
    try {
      const result = scanDirectory(dir);
      assert.equal(result.skipped, true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 2. Detects http-only canonical URL (critical)
  it('detects http-only canonical URL (critical)', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head>
        <title>HTTP Canonical</title>
        <link rel="canonical" href="http://example.com/page">
      </head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'http-only-links');
      assert.ok(finding, 'Should detect http-only canonical URL');
      assert.equal(finding.severity, 'critical');
      assert.ok(finding.message.includes('http://'), 'Message should mention http://');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 3. Detects http-only og:url (critical)
  it('detects http-only og:url (critical)', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head>
        <title>HTTP OG URL</title>
        <meta property="og:url" content="http://example.com/page">
      </head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'http-only-links');
      assert.ok(finding, 'Should detect http-only og:url');
      assert.equal(finding.severity, 'critical');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 4. Detects no CSP meta tag
  it('detects no CSP meta tag', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>No CSP</title></head><body><p>Hello</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'no-csp-meta');
      assert.ok(finding, 'Should detect missing CSP meta');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 5. Detects inline event handlers (onclick)
  it('detects inline event handlers (onclick)', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Inline Events</title></head><body>
        <button onclick="alert('xss')">Click me</button>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'inline-event-handlers');
      assert.ok(finding, 'Should detect inline event handlers');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 6. Detects external scripts without integrity attribute
  it('detects external scripts without integrity attribute', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head>
        <title>No SRI</title>
        <script src="https://cdn.example.com/lib.js"></script>
      </head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'external-scripts-no-integrity');
      assert.ok(finding, 'Should detect external scripts without integrity');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 7. Detects target="_blank" without rel="noopener"
  it('detects target="_blank" without rel="noopener"', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>No Noopener</title></head><body>
        <a href="https://example.com" target="_blank">Open</a>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'external-links-no-noopener');
      assert.ok(finding, 'Should detect target="_blank" without rel="noopener"');
      assert.equal(finding.severity, 'low');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 8. Detects iframe without sandbox
  it('detects iframe without sandbox', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>No Sandbox</title></head><body>
        <iframe src="https://example.com/embed"></iframe>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'iframe-no-sandbox');
      assert.ok(finding, 'Should detect iframe without sandbox');
      assert.equal(finding.severity, 'low');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 9. Detects form with http:// action
  it('detects form with http:// action', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>HTTP Form</title></head><body>
        <form action="http://example.com/submit" method="POST">
          <input type="text" name="name">
          <button type="submit">Submit</button>
        </form>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'form-no-action-https');
      assert.ok(finding, 'Should detect form with http:// action');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 10. Detects password input without autocomplete
  it('detects password input without autocomplete', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Password</title></head><body>
        <form action="https://example.com/login" method="POST">
          <input type="password" name="pass">
          <button type="submit">Login</button>
        </form>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'password-autocomplete');
      assert.ok(finding, 'Should detect password input without autocomplete');
      assert.equal(finding.severity, 'medium');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 11. Returns high score for secure page with CSP, referrer policy, etc.
  it('returns high score for secure page with all security headers', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html', secureHtml());
    try {
      const result = scanDirectory(dir);
      assert.ok(result.scores.security >= 80,
        `Expected high security score but got ${result.scores.security}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 12. Returns correct structure with files_scanned, findings, scores, summary
  it('returns correct structure with files_scanned, findings, scores, summary', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Structure</title></head><body><p>Hello</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok('files_scanned' in result, 'Should have files_scanned');
      assert.ok('findings' in result, 'Should have findings');
      assert.ok('scores' in result, 'Should have scores');
      assert.ok('summary' in result, 'Should have summary');
      assert.ok('security' in result.scores, 'scores should contain security');
      assert.equal(result.files_scanned, 1);
      assert.ok(Array.isArray(result.findings), 'findings should be an array');
      assert.ok(typeof result.summary.critical === 'number', 'summary should have critical count');
      assert.ok(typeof result.summary.high === 'number', 'summary should have high count');
      assert.ok(typeof result.summary.medium === 'number', 'summary should have medium count');
      assert.ok(typeof result.summary.low === 'number', 'summary should have low count');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 13. Score deducts correctly per rule
  it('score equals 100 minus sum of deductions', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Deductions</title></head><body>
        <button onclick="doSomething()">Click</button>
        <a href="https://evil.com" target="_blank">Evil</a>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const DEDUCTIONS = { critical: 20, high: 10, medium: 5, low: 2 };
      let expectedDeduction = 0;
      for (const f of result.findings) {
        expectedDeduction += DEDUCTIONS[f.severity];
      }
      const expectedScore = Math.max(0, 100 - expectedDeduction);
      assert.equal(result.scores.security, expectedScore,
        `Score (${result.scores.security}) should equal max(0, 100 - ${expectedDeduction}) = ${expectedScore}`);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 14. All findings have valid severity, rule, and message
  it('all findings have valid severity, rule, and message', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Validate</title></head><body>
        <button onclick="alert(1)">X</button>
        <iframe src="https://embed.example.com"></iframe>
        <a href="https://link.example.com" target="_blank">Link</a>
        <script src="https://cdn.example.com/app.js"></script>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      assert.ok(result.findings.length > 0, 'Should have at least one finding');
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

  // 15. Does NOT fire http-only-links when canonical uses https
  it('does not flag http-only-links when canonical uses https', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head>
        <title>HTTPS Canonical</title>
        <link rel="canonical" href="https://example.com/page">
        <meta property="og:url" content="https://example.com/page">
      </head><body><p>Content</p></body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'http-only-links');
      assert.equal(finding, undefined, 'Should NOT detect http-only-links for https URLs');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 16. Does NOT flag iframe-no-sandbox when sandbox is present
  it('does not flag iframe-no-sandbox when sandbox attribute is present', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Sandboxed</title></head><body>
        <iframe src="https://example.com/embed" sandbox="allow-scripts"></iframe>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'iframe-no-sandbox');
      assert.equal(finding, undefined, 'Should NOT flag iframe with sandbox');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 17. Does NOT flag external-links-no-noopener when rel="noopener" is present
  it('does not flag target="_blank" when rel="noopener" is present', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Noopener</title></head><body>
        <a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'external-links-no-noopener');
      assert.equal(finding, undefined, 'Should NOT flag link with rel="noopener"');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 18. Password input with autocomplete="current-password" does NOT fire
  it('does not flag password input with autocomplete="current-password"', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Good Password</title></head><body>
        <form action="https://example.com/login" method="POST">
          <input type="password" name="pass" autocomplete="current-password">
        </form>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const finding = result.findings.find(f => f.rule === 'password-autocomplete');
      assert.equal(finding, undefined, 'Should NOT flag password with autocomplete="current-password"');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  // 19. Summary counts match findings array
  it('summary counts match findings array', () => {
    const dir = makeTmpDir();
    writeHtml(dir, 'index.html',
      `<!DOCTYPE html><html><head><title>Counts</title></head><body>
        <link rel="canonical" href="http://example.com/">
        <button onclick="alert(1)">X</button>
        <iframe src="https://embed.example.com"></iframe>
      </body></html>`);
    try {
      const result = scanDirectory(dir);
      const criticalCount = result.findings.filter(f => f.severity === 'critical').length;
      const highCount = result.findings.filter(f => f.severity === 'high').length;
      const mediumCount = result.findings.filter(f => f.severity === 'medium').length;
      const lowCount = result.findings.filter(f => f.severity === 'low').length;
      assert.equal(result.summary.critical, criticalCount);
      assert.equal(result.summary.high, highCount);
      assert.equal(result.summary.medium, mediumCount);
      assert.equal(result.summary.low, lowCount);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
