import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSitemap } from '../tools/sitemap-analyzer.mjs';

describe('sitemap-analyzer', () => {
  it('generates valid sitemap XML', () => {
    const xml = generateSitemap('https://example.com', ['/about', '/blog']);
    assert.ok(xml.includes('<?xml'));
    assert.ok(xml.includes('<urlset'));
    assert.ok(xml.includes('https://example.com/about'));
    assert.ok(xml.includes('https://example.com/blog'));
  });

  it('deduplicates URLs', () => {
    const xml = generateSitemap('https://example.com', ['/about', '/about']);
    const matches = xml.match(/example\.com\/about/g);
    assert.equal(matches.length, 1);
  });

  it('includes root URL', () => {
    const xml = generateSitemap('https://example.com', ['/about']);
    assert.ok(xml.includes('https://example.com/'));
  });

  it('handles trailing slashes consistently', () => {
    const xml = generateSitemap('https://example.com/', ['/about/']);
    assert.ok(xml.includes('<loc>'));
  });
});
