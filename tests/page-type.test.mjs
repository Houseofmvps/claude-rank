/**
 * page-type.test.mjs — Tests for page-type detection and false-positive suppression.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHtml, detectPageType } from '../tools/lib/html-parser.mjs';
import { scanDirectory } from '../tools/seo-scanner.mjs';
import { scanHtml } from '../tools/url-scanner.mjs';

// ---------------------------------------------------------------------------
// Helper: build a minimal parsed state with overrides
// ---------------------------------------------------------------------------

function makeState(overrides = {}) {
  const state = parseHtml('<html><head><title></title></head><body></body></html>');
  return { ...state, ...overrides };
}

// ---------------------------------------------------------------------------
// detectPageType — file path detection
// ---------------------------------------------------------------------------

describe('detectPageType — file path detection', () => {
  it('detects contact page from path', () => {
    const state = makeState();
    assert.equal(detectPageType('/contact/index.html', state), 'contact');
  });

  it('detects terms page from path', () => {
    const state = makeState();
    assert.equal(detectPageType('/terms-of-service/index.html', state), 'terms');
  });

  it('detects privacy page from path', () => {
    const state = makeState();
    assert.equal(detectPageType('/privacy/index.html', state), 'privacy');
  });

  it('detects legal page from path', () => {
    const state = makeState();
    assert.equal(detectPageType('/legal/index.html', state), 'legal');
  });

  it('detects login page from path', () => {
    const state = makeState();
    assert.equal(detectPageType('/login/index.html', state), 'login');
  });

  it('detects sitemap page from path', () => {
    const state = makeState();
    assert.equal(detectPageType('/sitemap.html', state), 'sitemap');
  });

  it('returns content for normal pages', () => {
    const state = makeState();
    assert.equal(detectPageType('/blog/my-post.html', state), 'content');
  });

  it('detects from URL path for url-scanner', () => {
    const state = makeState();
    assert.equal(detectPageType('https://example.com/contact', state), 'contact');
  });
});

// ---------------------------------------------------------------------------
// detectPageType — title detection
// ---------------------------------------------------------------------------

describe('detectPageType — title detection', () => {
  it('detects privacy from title', () => {
    const state = makeState({ titleText: 'Privacy Policy - MyApp' });
    assert.equal(detectPageType('/some-page.html', state), 'privacy');
  });

  it('detects 404 from title', () => {
    const state = makeState({ titleText: 'Page Not Found' });
    assert.equal(detectPageType('/random.html', state), '404');
  });

  it('detects contact from title "Get in Touch"', () => {
    const state = makeState({ titleText: 'Get in Touch - MyApp' });
    assert.equal(detectPageType('/reach-out.html', state), 'contact');
  });

  it('detects terms from title containing "conditions"', () => {
    const state = makeState({ titleText: 'Terms and Conditions' });
    assert.equal(detectPageType('/page.html', state), 'terms');
  });
});

// ---------------------------------------------------------------------------
// detectPageType — h1 detection
// ---------------------------------------------------------------------------

describe('detectPageType — h1 detection', () => {
  it('detects contact from h1', () => {
    const state = makeState({ h1Text: 'Contact Us' });
    assert.equal(detectPageType('/page.html', state), 'contact');
  });

  it('detects disclaimer from h1', () => {
    const state = makeState({ h1Text: 'Disclaimer' });
    assert.equal(detectPageType('/page.html', state), 'legal');
  });
});

// ---------------------------------------------------------------------------
// Edge case: multiple signals — first match wins
// ---------------------------------------------------------------------------

describe('detectPageType — edge cases', () => {
  it('picks first match when title has both contact and terms', () => {
    const state = makeState({ titleText: 'Contact Us About Our Terms' });
    // 'contact' comes before 'terms' in the rules
    assert.equal(detectPageType('/page.html', state), 'contact');
  });

  it('handles null/undefined filePath gracefully', () => {
    const state = makeState({ titleText: 'Privacy Policy' });
    assert.equal(detectPageType(null, state), 'privacy');
    assert.equal(detectPageType(undefined, state), 'privacy');
  });

  it('returns content when no signals match', () => {
    const state = makeState({ titleText: 'Best Widgets for Sale', h1Text: 'Buy Our Widgets' });
    assert.equal(detectPageType('/products/widgets.html', state), 'content');
  });
});

// ---------------------------------------------------------------------------
// Suppression: thin-content NOT flagged for exempt page types
// ---------------------------------------------------------------------------

describe('thin-content suppression', () => {
  const thinContactHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Contact Us</title>
  <meta name="description" content="Get in touch with our team for any questions or support needs.">
  <link rel="canonical" href="/contact">
  <meta property="og:title" content="Contact Us">
  <meta property="og:description" content="Get in touch">
  <meta property="og:image" content="/img/og.png">
  <meta property="og:url" content="/contact">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:image" content="/img/og.png">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.json">
  <script async src="https://www.googletagmanager.com/gtag/js"></script>
</head>
<body>
  <nav><a href="/">Home</a></nav>
  <main>
    <h1>Contact Us</h1>
    <p>Email us at hello@example.com or call 555-1234.</p>
  </main>
  <footer>Copyright 2024</footer>
</body>
</html>`;

  it('does NOT flag thin-content on a contact page (url-scanner)', () => {
    const result = scanHtml(thinContactHtml, 'https://example.com/contact');
    const thinFinding = result.findings.find(f => f.rule === 'thin-content');
    assert.equal(thinFinding, undefined, 'thin-content should be suppressed for contact pages');
  });

  it('DOES flag thin-content on a regular content page (url-scanner)', () => {
    // Same HTML but with a generic title/h1/url
    const contentHtml = thinContactHtml
      .replace(/<title>Contact Us<\/title>/, '<title>Our Amazing Product</title>')
      .replace(/<h1>Contact Us<\/h1>/, '<h1>Our Amazing Product</h1>')
      .replace(/contact/g, 'product');
    const result = scanHtml(contentHtml, 'https://example.com/product');
    const thinFinding = result.findings.find(f => f.rule === 'thin-content');
    assert.ok(thinFinding, 'thin-content should be flagged for content pages with < 300 words');
  });
});

// ---------------------------------------------------------------------------
// Suppression: no-analytics NOT flagged for legal pages
// ---------------------------------------------------------------------------

describe('no-analytics suppression', () => {
  const legalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Privacy Policy</title>
  <meta name="description" content="Our privacy policy explains how we handle your data.">
</head>
<body>
  <main>
    <h1>Privacy Policy</h1>
    <p>We respect your privacy. ${'Lorem ipsum dolor sit amet. '.repeat(20)}</p>
  </main>
</body>
</html>`;

  it('does NOT flag no-analytics on a privacy page (url-scanner)', () => {
    const result = scanHtml(legalHtml, 'https://example.com/privacy');
    const analyticsFinding = result.findings.find(f => f.rule === 'no-analytics');
    assert.equal(analyticsFinding, undefined, 'no-analytics should be suppressed for privacy pages');
  });
});

// ---------------------------------------------------------------------------
// Suppression: missing-og-image NOT flagged for legal pages
// ---------------------------------------------------------------------------

describe('missing-og-image suppression', () => {
  it('does NOT flag missing-og-image on a terms page (url-scanner)', () => {
    const termsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Terms of Service</title>
  <meta name="description" content="Terms and conditions for using our service.">
</head>
<body>
  <main>
    <h1>Terms of Service</h1>
    <p>${'These terms govern your use of our service. '.repeat(20)}</p>
  </main>
</body>
</html>`;
    const result = scanHtml(termsHtml, 'https://example.com/terms');
    const ogFinding = result.findings.find(f => f.rule === 'missing-og-image');
    assert.equal(ogFinding, undefined, 'missing-og-image should be suppressed for terms pages');
  });
});

// ---------------------------------------------------------------------------
// pageType is included in findings
// ---------------------------------------------------------------------------

describe('pageType in findings', () => {
  it('includes pageType in url-scanner findings', () => {
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Contact</title></head><body><h1>Contact</h1></body></html>`;
    const result = scanHtml(html, 'https://example.com/contact');
    // Every finding should have pageType
    for (const finding of result.findings) {
      assert.equal(finding.pageType, 'contact', `finding ${finding.rule} should have pageType 'contact'`);
    }
  });
});
