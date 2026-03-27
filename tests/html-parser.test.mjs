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
});
