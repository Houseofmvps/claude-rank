/**
 * crawler.mjs — Multi-page site crawler using BFS with concurrency control.
 * Follows internal links on the same domain. Uses fetchPage() for SSRF protection.
 * No external dependencies.
 */

import { fetchPage } from './url-fetcher.mjs';

// ---------------------------------------------------------------------------
// URL helpers (exported for testing)
// ---------------------------------------------------------------------------

/** File extensions to skip (non-HTML resources) */
const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.avif',
  '.css', '.js', '.mjs', '.cjs', '.map',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm', '.ogg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.xml', '.json', '.csv', '.txt', '.rss', '.atom',
]);

/** URL path patterns to skip (non-page routes) */
const SKIP_PATTERNS = [
  /\/api\//i,
  /\/auth\//i,
  /\/login\b/i,
  /\/logout\b/i,
  /\/wp-admin/i,
  /\/cdn-cgi\//i,
  /\/wp-json\//i,
  /\/feed\/?$/i,
  /\/xmlrpc\.php/i,
  /\/wp-login/i,
  /\/admin\//i,
  /\?/,  // skip URLs with query strings to avoid crawl traps
];

/**
 * Normalize a URL: remove fragment, remove trailing slash (except root path).
 * @param {string} urlStr
 * @returns {string}
 */
export function normalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    url.hash = '';
    // Remove trailing slash unless it's just the root "/"
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.href;
  } catch {
    return urlStr;
  }
}

/**
 * Check if a URL should be skipped based on extension or path pattern.
 * @param {string} urlStr
 * @returns {boolean}
 */
export function shouldSkipUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname.toLowerCase();

    // Check file extension
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot !== -1) {
      const ext = pathname.slice(lastDot);
      if (SKIP_EXTENSIONS.has(ext)) return true;
    }

    // Check path patterns
    for (const pattern of SKIP_PATTERNS) {
      if (pattern.test(url.pathname + url.search)) return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Check if two URLs share the same hostname.
 * @param {string} urlA
 * @param {string} urlB
 * @returns {boolean}
 */
export function isSameDomain(urlA, urlB) {
  try {
    const a = new URL(urlA);
    const b = new URL(urlB);
    return a.hostname === b.hostname;
  } catch {
    return false;
  }
}

/**
 * Extract internal links from HTML content.
 * Returns an array of absolute URL strings on the same domain as baseUrl.
 * @param {string} html
 * @param {string} baseUrl
 * @returns {string[]}
 */
export function extractLinks(html, baseUrl) {
  const links = [];
  // Match <a href="..."> with both single and double quotes
  const regex = /<a\s[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1] ?? match[2];
    if (!href) continue;

    // Skip javascript:, mailto:, tel:, data: schemes
    if (/^(javascript|mailto|tel|data):/i.test(href)) continue;
    // Skip empty or fragment-only
    if (href === '' || href === '#' || href.startsWith('#')) continue;

    try {
      const resolved = new URL(href, baseUrl).href;
      const normalized = normalizeUrl(resolved);

      if (isSameDomain(normalized, baseUrl) && !shouldSkipUrl(normalized)) {
        links.push(normalized);
      }
    } catch {
      // Invalid URL — skip
    }
  }

  // Deduplicate
  return [...new Set(links)];
}

// ---------------------------------------------------------------------------
// Semaphore for concurrency control
// ---------------------------------------------------------------------------

class Semaphore {
  constructor(max) {
    this._max = max;
    this._active = 0;
    this._queue = [];
  }

  async acquire() {
    if (this._active < this._max) {
      this._active++;
      return;
    }
    return new Promise(resolve => {
      this._queue.push(resolve);
    });
  }

  release() {
    this._active--;
    if (this._queue.length > 0) {
      this._active++;
      const next = this._queue.shift();
      next();
    }
  }
}

// ---------------------------------------------------------------------------
// Main crawler
// ---------------------------------------------------------------------------

/**
 * Crawl a site starting from startUrl, following internal links (BFS).
 * @param {string} startUrl — starting URL
 * @param {object} options
 * @param {number} [options.maxPages=50] — max pages to crawl
 * @param {number} [options.concurrency=3] — concurrent fetches
 * @param {function} [options.onPage] — callback(url, html) called per page
 * @returns {Promise<{ pages: Array<{url: string, html: string, statusCode: number}>, errors: Array<{url: string, error: string}> }>}
 */
export async function crawlSite(startUrl, options = {}) {
  const {
    maxPages = 50,
    concurrency = 3,
    onPage,
  } = options;

  const normalizedStart = normalizeUrl(startUrl);
  const visited = new Set();
  const queue = [normalizedStart]; // BFS queue
  const pages = [];
  const errors = [];
  const semaphore = new Semaphore(concurrency);

  let queued = new Set([normalizedStart]);
  let pagesProcessed = 0;

  // Process BFS in waves for concurrency
  while (queue.length > 0 && pagesProcessed < maxPages) {
    // Take a batch from the queue (up to concurrency size)
    const batchSize = Math.min(queue.length, maxPages - pagesProcessed, concurrency);
    const batch = queue.splice(0, batchSize);

    const promises = batch.map(async (url) => {
      if (visited.has(url) || pagesProcessed >= maxPages) return;
      visited.add(url);

      await semaphore.acquire();
      try {
        pagesProcessed++;
        const num = pagesProcessed;
        process.stderr.write(`Crawling [${num}/${maxPages}] ${url}\n`);

        const result = await fetchPage(url);
        pages.push({
          url: result.finalUrl,
          html: result.html,
          statusCode: result.statusCode,
        });

        if (onPage) {
          onPage(result.finalUrl, result.html);
        }

        // Extract links and add new ones to queue
        const links = extractLinks(result.html, result.finalUrl);
        for (const link of links) {
          if (!queued.has(link) && !visited.has(link) && pagesProcessed + queue.length < maxPages) {
            queued.add(link);
            queue.push(link);
          }
        }
      } catch (err) {
        errors.push({ url, error: err.message });
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);
  }

  return { pages, errors };
}
