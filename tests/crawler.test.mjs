/**
 * crawler.test.mjs — Tests for the multi-page crawler helper functions.
 * Tests link extraction, URL normalization, domain filtering, skip patterns,
 * and max pages logic. No real HTTP requests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeUrl,
  shouldSkipUrl,
  isSameDomain,
  extractLinks,
} from '../tools/lib/crawler.mjs';

// ---------------------------------------------------------------------------
// normalizeUrl
// ---------------------------------------------------------------------------

describe('normalizeUrl', () => {
  it('removes fragment from URL', () => {
    assert.equal(
      normalizeUrl('https://example.com/about#team'),
      'https://example.com/about'
    );
  });

  it('removes trailing slash from non-root path', () => {
    assert.equal(
      normalizeUrl('https://example.com/about/'),
      'https://example.com/about'
    );
  });

  it('keeps trailing slash for root path', () => {
    assert.equal(
      normalizeUrl('https://example.com/'),
      'https://example.com/'
    );
  });

  it('removes both fragment and trailing slash', () => {
    assert.equal(
      normalizeUrl('https://example.com/page/#section'),
      'https://example.com/page'
    );
  });

  it('returns input for invalid URL', () => {
    assert.equal(normalizeUrl('not-a-url'), 'not-a-url');
  });

  it('normalizes URL with port', () => {
    assert.equal(
      normalizeUrl('https://example.com:8080/page/#top'),
      'https://example.com:8080/page'
    );
  });
});

// ---------------------------------------------------------------------------
// shouldSkipUrl
// ---------------------------------------------------------------------------

describe('shouldSkipUrl', () => {
  it('skips image URLs', () => {
    assert.equal(shouldSkipUrl('https://example.com/logo.png'), true);
    assert.equal(shouldSkipUrl('https://example.com/photo.jpg'), true);
    assert.equal(shouldSkipUrl('https://example.com/icon.svg'), true);
    assert.equal(shouldSkipUrl('https://example.com/pic.webp'), true);
  });

  it('skips CSS and JS URLs', () => {
    assert.equal(shouldSkipUrl('https://example.com/style.css'), true);
    assert.equal(shouldSkipUrl('https://example.com/app.js'), true);
    assert.equal(shouldSkipUrl('https://example.com/bundle.mjs'), true);
  });

  it('skips PDF and document URLs', () => {
    assert.equal(shouldSkipUrl('https://example.com/doc.pdf'), true);
    assert.equal(shouldSkipUrl('https://example.com/report.xlsx'), true);
  });

  it('skips font files', () => {
    assert.equal(shouldSkipUrl('https://example.com/font.woff2'), true);
    assert.equal(shouldSkipUrl('https://example.com/font.ttf'), true);
  });

  it('skips API paths', () => {
    assert.equal(shouldSkipUrl('https://example.com/api/users'), true);
  });

  it('skips auth paths', () => {
    assert.equal(shouldSkipUrl('https://example.com/auth/callback'), true);
    assert.equal(shouldSkipUrl('https://example.com/login'), true);
    assert.equal(shouldSkipUrl('https://example.com/logout'), true);
  });

  it('skips WordPress admin paths', () => {
    assert.equal(shouldSkipUrl('https://example.com/wp-admin/edit.php'), true);
    assert.equal(shouldSkipUrl('https://example.com/wp-json/wp/v2/posts'), true);
    assert.equal(shouldSkipUrl('https://example.com/wp-login.php'), true);
  });

  it('skips Cloudflare CDN paths', () => {
    assert.equal(shouldSkipUrl('https://example.com/cdn-cgi/l/email-protection'), true);
  });

  it('skips URLs with query strings', () => {
    assert.equal(shouldSkipUrl('https://example.com/page?sort=asc'), true);
  });

  it('allows normal page URLs', () => {
    assert.equal(shouldSkipUrl('https://example.com/about'), false);
    assert.equal(shouldSkipUrl('https://example.com/blog/my-post'), false);
    assert.equal(shouldSkipUrl('https://example.com/'), false);
    assert.equal(shouldSkipUrl('https://example.com/pricing'), false);
  });

  it('returns true for invalid URLs', () => {
    assert.equal(shouldSkipUrl('not-a-url'), true);
  });
});

// ---------------------------------------------------------------------------
// isSameDomain
// ---------------------------------------------------------------------------

describe('isSameDomain', () => {
  it('returns true for same domain', () => {
    assert.equal(
      isSameDomain('https://example.com/a', 'https://example.com/b'),
      true
    );
  });

  it('returns true for same domain different protocols', () => {
    assert.equal(
      isSameDomain('http://example.com/a', 'https://example.com/b'),
      true
    );
  });

  it('returns false for different domains', () => {
    assert.equal(
      isSameDomain('https://example.com/a', 'https://other.com/b'),
      false
    );
  });

  it('returns false for subdomains', () => {
    assert.equal(
      isSameDomain('https://blog.example.com', 'https://example.com'),
      false
    );
  });

  it('returns false for invalid URLs', () => {
    assert.equal(isSameDomain('not-valid', 'https://example.com'), false);
  });
});

// ---------------------------------------------------------------------------
// extractLinks
// ---------------------------------------------------------------------------

describe('extractLinks', () => {
  const baseUrl = 'https://example.com';

  it('extracts absolute internal links', () => {
    const html = '<a href="https://example.com/about">About</a>';
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/about']);
  });

  it('resolves relative links', () => {
    const html = '<a href="/pricing">Pricing</a>';
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/pricing']);
  });

  it('resolves relative links from subpages', () => {
    const html = '<a href="details">Details</a>';
    const links = extractLinks(html, 'https://example.com/products/');
    assert.deepEqual(links, ['https://example.com/products/details']);
  });

  it('filters out external links', () => {
    const html = `
      <a href="https://example.com/about">Internal</a>
      <a href="https://google.com">External</a>
      <a href="https://other.com/page">External2</a>
    `;
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/about']);
  });

  it('skips mailto, javascript, tel links', () => {
    const html = `
      <a href="mailto:test@example.com">Email</a>
      <a href="javascript:void(0)">JS</a>
      <a href="tel:+1234567890">Phone</a>
      <a href="/real-page">Real</a>
    `;
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/real-page']);
  });

  it('skips fragment-only links', () => {
    const html = '<a href="#">Top</a><a href="#section">Section</a>';
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, []);
  });

  it('removes fragments from extracted links', () => {
    const html = '<a href="/about#team">About Team</a>';
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/about']);
  });

  it('deduplicates links', () => {
    const html = `
      <a href="/about">About 1</a>
      <a href="/about">About 2</a>
      <a href="/about#team">About 3</a>
    `;
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/about']);
  });

  it('skips image and asset links', () => {
    const html = `
      <a href="/page">Page</a>
      <a href="/logo.png">Logo</a>
      <a href="/style.css">CSS</a>
      <a href="/doc.pdf">PDF</a>
    `;
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/page']);
  });

  it('skips API and auth paths', () => {
    const html = `
      <a href="/about">About</a>
      <a href="/api/data">API</a>
      <a href="/auth/login">Auth</a>
      <a href="/login">Login</a>
    `;
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/about']);
  });

  it('handles single-quoted href attributes', () => {
    const html = "<a href='/contact'>Contact</a>";
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/contact']);
  });

  it('handles href with extra attributes', () => {
    const html = '<a class="btn" href="/page" target="_blank">Link</a>';
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/page']);
  });

  it('returns empty array for HTML with no links', () => {
    const html = '<p>No links here</p>';
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, []);
  });

  it('normalizes trailing slashes in extracted links', () => {
    const html = '<a href="/about/">About</a>';
    const links = extractLinks(html, baseUrl);
    assert.deepEqual(links, ['https://example.com/about']);
  });
});
