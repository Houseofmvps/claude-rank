import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHtml } from '../tools/lib/html-parser.mjs';

describe('parseHtml', () => {
  it('extracts title', () => {
    const state = parseHtml('<html><head><title>Hello World</title></head></html>');
    assert.equal(state.titleText, 'Hello World');
    assert.equal(state.hasTitle, true);
  });

  it('extracts meta description', () => {
    const state = parseHtml('<html><head><meta name="description" content="Test desc"></head></html>');
    assert.equal(state.hasMetaDescription, true);
    assert.equal(state.metaDescriptionText, 'Test desc');
  });

  it('counts headings', () => {
    const state = parseHtml('<html><body><h1>Title</h1><h2>Sub</h2><h2>Sub2</h2></body></html>');
    assert.equal(state.h1Count, 1);
    assert.equal(state.h2Texts.length, 2);
  });

  it('detects JSON-LD structured data', () => {
    const html = '<html><head><script type="application/ld+json">{"@type":"Organization"}</script></head></html>';
    const state = parseHtml(html);
    assert.equal(state.jsonLdScripts, 1);
    assert.ok(state.jsonLdContent[0].includes('Organization'));
  });

  it('detects OG tags', () => {
    const html = '<html><head><meta property="og:title" content="OG Title"><meta property="og:image" content="https://example.com/img.jpg"></head></html>';
    const state = parseHtml(html);
    assert.equal(state.hasOgTitle, true);
    assert.equal(state.hasOgImage, true);
  });

  it('counts words in body', () => {
    const html = '<html><body><p>One two three four five</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.wordCount, 5);
  });

  it('detects analytics providers', () => {
    const html = '<html><head><script src="https://www.googletagmanager.com/gtag/js"></script></head></html>';
    const state = parseHtml(html);
    assert.equal(state.hasAnalytics, true);
    assert.equal(state.analyticsProvider, 'google-analytics');
  });

  it('tracks internal and external links', () => {
    const html = '<html><body><a href="/about">About</a><a href="https://ext.com">Ext</a></body></html>';
    const state = parseHtml(html);
    assert.equal(state.internalLinks.length, 1);
    assert.equal(state.externalLinks.length, 1);
  });

  it('detects noindex', () => {
    const html = '<html><head><meta name="robots" content="noindex, nofollow"></head></html>';
    const state = parseHtml(html);
    assert.equal(state.hasNoindex, true);
  });

  it('detects semantic HTML elements', () => {
    const html = '<html><body><main><nav></nav><article></article></main><footer></footer></body></html>';
    const state = parseHtml(html);
    assert.equal(state.hasMain, true);
    assert.equal(state.hasNav, true);
    assert.equal(state.hasFooter, true);
    assert.equal(state.hasArticle, true);
  });

  // --- Main-content word count ---

  it('tracks mainContentWordCount separately from total wordCount', () => {
    const html = `<html><body>
      <nav>Home About Contact Blog Products Services</nav>
      <main><p>This is the actual main content of the page with enough words to test.</p></main>
      <footer>Footer text copyright 2026 all rights reserved company name address</footer>
    </body></html>`;
    const state = parseHtml(html);
    assert.ok(state.wordCount > state.mainContentWordCount,
      `Total (${state.wordCount}) should exceed main (${state.mainContentWordCount})`);
    assert.ok(state.mainContentWordCount > 0, 'mainContentWordCount should be > 0');
  });

  it('falls back to total wordCount when no <main> element exists', () => {
    const html = '<html><body><p>Some content without main element here today now.</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.mainContentWordCount, state.wordCount);
  });

  it('counts words only inside <main> for mainContentWordCount', () => {
    const html = `<html><body>
      <header>Long header navigation with many words that should not count at all</header>
      <main><p>Short main content.</p></main>
      <aside>Sidebar content here too</aside>
    </body></html>`;
    const state = parseHtml(html);
    assert.equal(state.mainContentWordCount, 3); // "Short main content."
  });

  // --- Viewport content capture ---

  it('captures viewport content attribute', () => {
    const html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head></html>';
    const state = parseHtml(html);
    assert.equal(state.hasViewport, true);
    assert.equal(state.viewportContent, 'width=device-width, initial-scale=1');
  });

  it('captures fixed-width viewport', () => {
    const html = '<html><head><meta name="viewport" content="width=1024"></head></html>';
    const state = parseHtml(html);
    assert.equal(state.viewportContent, 'width=1024');
  });

  // --- Body text capture ---

  it('exposes bodyText for keyword analysis', () => {
    const html = '<html><body><p>keyword optimization content here</p></body></html>';
    const state = parseHtml(html);
    assert.ok(state.bodyText.includes('keyword'));
    assert.ok(state.bodyText.includes('optimization'));
  });

  // --- Expanded analytics detection ---

  it('detects Heap analytics', () => {
    const html = '<html><body><script src="https://cdn.heapanalytics.com/js/heap-123.js"></script><p>Content</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.hasAnalytics, true);
    assert.equal(state.analyticsProvider, 'heap');
  });

  it('detects Snowplow analytics', () => {
    const html = '<html><body><script>snowplow("newTracker", "sp", "collector.example.com")</script><p>Content</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.hasAnalytics, true);
    assert.equal(state.analyticsProvider, 'snowplow');
  });

  it('detects Intercom', () => {
    const html = '<html><body><script src="https://widget.intercom.io/widget/abc123"></script><p>Content</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.hasAnalytics, true);
    assert.equal(state.analyticsProvider, 'intercom');
  });

  it('detects Rudderstack', () => {
    const html = '<html><body><script src="https://cdn.rudderlabs.com/v1.1/rudder-analytics.min.js"></script><p>Content</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.hasAnalytics, true);
    assert.equal(state.analyticsProvider, 'rudderstack');
  });

  it('detects Matomo', () => {
    const html = '<html><body><script src="https://cdn.matomo.cloud/example.matomo.cloud/matomo.js"></script><p>Content</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.hasAnalytics, true);
    assert.equal(state.analyticsProvider, 'matomo');
  });

  it('detects Vercel Analytics', () => {
    const html = '<html><body><script src="https://va.vercel-scripts.com/v1/script.js"></script><p>Content</p></body></html>';
    const state = parseHtml(html);
    assert.equal(state.hasAnalytics, true);
    assert.equal(state.analyticsProvider, 'vercel-analytics');
  });

  // --- Image optimization tracking ---

  it('tracks alt="" as decorativeImages, not imagesWithoutAlt', () => {
    const html = `<html><body>
      <img src="divider.png" alt="" width="100" height="2">
      <img src="spacer.gif" alt="" width="1" height="1">
      <img src="hero.jpg" alt="Hero image" width="800" height="600">
      <img src="broken.jpg" width="200" height="200">
    </body></html>`;
    const state = parseHtml(html);
    // alt="" is decorative, not missing
    assert.equal(state.decorativeImages, 2, 'Should count 2 decorative images with alt=""');
    // Only the last image (no alt attribute at all) counts as missing
    assert.equal(state.imagesWithoutAlt, 1, 'Only truly missing alt should be counted');
  });
});
