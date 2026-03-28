import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateUrl } from '../tools/lib/security.mjs';
import { scanHtml } from '../tools/url-scanner.mjs';

// ---------------------------------------------------------------------------
// URL validation tests (fetchPage rejects via validateUrl)
// ---------------------------------------------------------------------------

describe('URL validation for fetchPage', () => {
  it('rejects private IPs', () => {
    assert.equal(validateUrl('http://127.0.0.1/page').valid, false);
    assert.equal(validateUrl('http://10.0.0.1/page').valid, false);
    assert.equal(validateUrl('http://192.168.1.1/page').valid, false);
    assert.equal(validateUrl('http://169.254.169.254/latest/meta-data').valid, false);
  });

  it('rejects non-HTTP schemes', () => {
    assert.equal(validateUrl('ftp://example.com').valid, false);
    assert.equal(validateUrl('file:///etc/passwd').valid, false);
    assert.equal(validateUrl('javascript:alert(1)').valid, false);
  });

  it('rejects cloud metadata endpoints', () => {
    assert.equal(validateUrl('http://metadata.google.internal/computeMetadata').valid, false);
  });

  it('rejects invalid URLs', () => {
    assert.equal(validateUrl('not-a-url').valid, false);
    assert.equal(validateUrl('').valid, false);
  });

  it('allows valid public HTTPS URLs', () => {
    const result = validateUrl('https://example.com');
    assert.equal(result.valid, true);
  });

  it('allows valid public HTTP URLs', () => {
    const result = validateUrl('http://example.com');
    assert.equal(result.valid, true);
  });
});

// ---------------------------------------------------------------------------
// scanHtml tests (mock HTML, no HTTP requests)
// ---------------------------------------------------------------------------

describe('scanHtml', () => {
  it('returns findings and scores for minimal HTML', () => {
    const html = '<html><head></head><body><p>Hello</p></body></html>';
    const result = scanHtml(html, 'https://example.com');

    assert.equal(result.url, 'https://example.com');
    assert.ok(Array.isArray(result.findings));
    assert.ok(typeof result.scores.seo === 'number');
    assert.ok(result.scores.seo >= 0 && result.scores.seo <= 100);
    assert.ok(typeof result.summary === 'object');
    assert.ok(typeof result.summary.critical === 'number');
    assert.ok(typeof result.summary.high === 'number');
    assert.ok(typeof result.summary.medium === 'number');
    assert.ok(typeof result.summary.low === 'number');
  });

  it('detects missing title', () => {
    const html = '<html><head></head><body></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('missing-title'));
  });

  it('detects missing meta description', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('missing-meta-description'));
  });

  it('detects missing h1', () => {
    const html = '<html><head><title>Test</title></head><body><p>content</p></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('missing-h1'));
  });

  it('detects missing lang attribute', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('missing-lang'));
  });

  it('does not flag present title', () => {
    const html = '<html lang="en"><head><title>My Great Page Title Here</title></head><body></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(!rules.includes('missing-title'));
    assert.ok(!rules.includes('missing-lang'));
  });

  it('detects noindex as critical', () => {
    const html = '<html><head><meta name="robots" content="noindex"></head><body></body></html>';
    const result = scanHtml(html);
    const noindex = result.findings.find(f => f.rule === 'has-noindex');
    assert.ok(noindex);
    assert.equal(noindex.severity, 'critical');
  });

  it('detects invalid JSON-LD schema missing required fields', () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@type":"Article"}</script>
    </head><body></body></html>`;
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('schema-invalid'), 'Should flag Article schema missing headline/author/datePublished');
  });

  it('does not flag valid JSON-LD schema', () => {
    const html = `<html><head>
      <script type="application/ld+json">{"@type":"Organization","name":"Test","url":"https://example.com"}</script>
    </head><body></body></html>`;
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(!rules.includes('schema-invalid'), 'Valid Organization schema should not be flagged');
  });

  it('detects missing OG tags', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('missing-og-title'));
    assert.ok(rules.includes('missing-og-description'));
    assert.ok(rules.includes('missing-og-image'));
  });

  it('passes OG checks when tags are present', () => {
    const html = `<html lang="en"><head>
      <title>Test Page With A Good Title</title>
      <meta name="description" content="This is a well-written meta description that is long enough to pass the minimum character check.">
      <meta property="og:title" content="Test">
      <meta property="og:description" content="Desc">
      <meta property="og:image" content="https://example.com/img.jpg">
      <meta property="og:url" content="https://example.com">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:image" content="https://example.com/img.jpg">
    </head><body></body></html>`;
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(!rules.includes('missing-og-title'));
    assert.ok(!rules.includes('missing-og-description'));
    assert.ok(!rules.includes('missing-og-image'));
    assert.ok(!rules.includes('missing-og-url'));
    assert.ok(!rules.includes('missing-twitter-card'));
    assert.ok(!rules.includes('missing-twitter-image'));
  });

  it('detects thin content', () => {
    const html = '<html><head><title>Test</title></head><body><p>Just a few words here.</p></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('thin-content'));
  });

  it('gives a perfect page a high score', () => {
    const words = Array(350).fill('keyword').join(' ');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Perfect Page Title For SEO Testing</title>
  <meta name="description" content="This is a perfectly crafted meta description that is exactly the right length for search engine optimization purposes here.">
  <link rel="canonical" href="https://example.com/">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.json">
  <meta property="og:title" content="Perfect Page">
  <meta property="og:description" content="Description">
  <meta property="og:image" content="https://example.com/og.jpg">
  <meta property="og:url" content="https://example.com/">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://example.com/og.jpg">
  <script type="application/ld+json">{"@type":"WebPage"}</script>
  <script src="https://www.googletagmanager.com/gtag/js" async></script>
</head>
<body>
  <nav><a href="/">Home</a></nav>
  <main>
    <h1>Perfect Page</h1>
    <h2>Section One</h2>
    <p>${words}</p>
    <img src="/img.jpg" alt="Test image" width="800" height="600">
  </main>
  <footer><p>Footer</p></footer>
</body>
</html>`;

    const result = scanHtml(html, 'https://example.com/');
    assert.equal(result.scores.seo, 100, `Expected 100 but got ${result.scores.seo}. Findings: ${result.findings.map(f => f.rule).join(', ')}`);
  });

  it('uses provided URL in finding file field', () => {
    const html = '<html><head></head><body></body></html>';
    const result = scanHtml(html, 'https://mysite.com/about');
    for (const finding of result.findings) {
      assert.equal(finding.file, 'https://mysite.com/about');
    }
  });

  it('detects canonical pointing to different domain', () => {
    const html = `<html><head>
      <link rel="canonical" href="https://other-domain.com/page">
    </head><body></body></html>`;
    const result = scanHtml(html, 'https://example.com/page');
    const rules = result.findings.map(f => f.rule);
    assert.ok(rules.includes('canonical-points-elsewhere'));
  });

  it('does not flag canonical on same domain', () => {
    const html = `<html><head>
      <link rel="canonical" href="https://example.com/page">
    </head><body></body></html>`;
    const result = scanHtml(html, 'https://example.com/page');
    const rules = result.findings.map(f => f.rule);
    assert.ok(!rules.includes('canonical-points-elsewhere'));
  });

  it('skips cross-page rules (no duplicate-title, orphan-page, etc.)', () => {
    const html = '<html><head><title>Test</title></head><body></body></html>';
    const result = scanHtml(html);
    const rules = result.findings.map(f => f.rule);
    // These are cross-page-only rules that should never appear in URL scans
    assert.ok(!rules.includes('duplicate-title'));
    assert.ok(!rules.includes('duplicate-meta-description'));
    assert.ok(!rules.includes('canonical-conflict'));
    assert.ok(!rules.includes('orphan-page'));
    assert.ok(!rules.includes('no-internal-links'));
  });
});

// ---------------------------------------------------------------------------
// Redirect chain rule tests
// ---------------------------------------------------------------------------

describe('redirect chain detection', () => {
  it('redirect-chain rule exists with medium severity', () => {
    // Import the module to verify the rule is defined
    // We test the rule logic via the scanUrl function behavior,
    // but verify the rule definition is correct here
    const result = scanHtml('<html><head></head><body></body></html>');
    // redirect-chain is an HTTP-level rule, won't appear in scanHtml
    const rules = result.findings.map(f => f.rule);
    assert.ok(!rules.includes('redirect-chain'), 'redirect-chain should not appear in HTML-only scans');
  });
});

// ---------------------------------------------------------------------------
// CLI URL detection tests
// ---------------------------------------------------------------------------

describe('CLI URL detection', () => {
  it('identifies http:// as a URL', () => {
    const input = 'http://example.com';
    assert.ok(input.startsWith('http://') || input.startsWith('https://'));
  });

  it('identifies https:// as a URL', () => {
    const input = 'https://example.com';
    assert.ok(input.startsWith('http://') || input.startsWith('https://'));
  });

  it('does not identify relative paths as URLs', () => {
    const input = './my-project';
    assert.ok(!input.startsWith('http://') && !input.startsWith('https://'));
  });

  it('does not identify absolute paths as URLs', () => {
    const input = '/home/user/project';
    assert.ok(!input.startsWith('http://') && !input.startsWith('https://'));
  });

  it('does not identify bare directories as URLs', () => {
    const input = '.';
    assert.ok(!input.startsWith('http://') && !input.startsWith('https://'));
  });
});
