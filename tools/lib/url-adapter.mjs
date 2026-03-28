/**
 * url-adapter.mjs — Fetch URL(s) to a temp directory so existing directory-based
 * scanners can process them without modification.
 *
 * Writes fetched HTML files into a temporary directory structure, returning
 * the path so callers can pass it straight to scanDirectory() / analyzeDirectory().
 *
 * Uses Node.js built-ins only (plus the project's own fetchPage / crawlSite).
 */

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fetchPage } from './url-fetcher.mjs';
import { crawlSite } from './crawler.mjs';

/** Track temp dirs so we can clean up on process exit. */
const tempDirs = new Set();

function registerCleanup() {
  if (registerCleanup._done) return;
  registerCleanup._done = true;

  const cleanup = () => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });
}

/**
 * Turn a URL pathname into a safe filename for the temp directory.
 * e.g. "/about/team" -> "about-team.html"
 * @param {string} urlStr
 * @returns {string}
 */
function urlToFilename(urlStr) {
  try {
    const url = new URL(urlStr);
    let name = url.pathname
      .replace(/^\/|\/$/g, '')       // strip leading/trailing slashes
      .replace(/\//g, '-')            // slashes -> hyphens
      .replace(/[^a-zA-Z0-9._-]/g, '_'); // sanitize
    if (!name) name = 'index';
    if (!name.endsWith('.html')) name += '.html';
    return name;
  } catch {
    return `page-${randomUUID().slice(0, 8)}.html`;
  }
}

/**
 * Fetch one or more pages from a URL and write the HTML into a temporary
 * directory. Returns the temp directory path so existing scanners can
 * process the files with their normal directory-based flow.
 *
 * @param {string} url - The starting URL to fetch.
 * @param {object} [options]
 * @param {boolean} [options.single=false] - Fetch only the given URL (no crawl).
 * @param {number}  [options.maxPages=50]  - Max pages when crawling.
 * @returns {Promise<{ tmpDir: string, pageCount: number }>}
 */
export async function fetchToTempDir(url, { single = false, maxPages = 50 } = {}) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'claude-rank-'));
  tempDirs.add(tmpDir);
  registerCleanup();

  const usedNames = new Set();

  /**
   * Write an HTML string to the temp dir with a unique filename.
   * @param {string} pageUrl
   * @param {string} html
   */
  function writePage(pageUrl, html) {
    let name = urlToFilename(pageUrl);
    // Ensure uniqueness
    if (usedNames.has(name)) {
      const base = name.replace(/\.html$/, '');
      name = `${base}-${randomUUID().slice(0, 6)}.html`;
    }
    usedNames.add(name);
    writeFileSync(join(tmpDir, name), html, 'utf-8');
  }

  if (single) {
    const result = await fetchPage(url);
    writePage(result.finalUrl, result.html);
    return { tmpDir, pageCount: 1 };
  }

  // Multi-page crawl
  const { pages } = await crawlSite(url, { maxPages });

  if (pages.length === 0) {
    // Fallback: try single fetch if crawl returned nothing
    const result = await fetchPage(url);
    writePage(result.finalUrl, result.html);
    return { tmpDir, pageCount: 1 };
  }

  for (const page of pages) {
    writePage(page.url, page.html);
  }

  return { tmpDir, pageCount: pages.length };
}

/**
 * Remove a temp directory created by fetchToTempDir.
 * Call this after the scanner finishes to free disk space immediately
 * rather than waiting for process exit.
 *
 * @param {string} tmpDir - Path returned by fetchToTempDir.
 */
export function cleanupTempDir(tmpDir) {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
    tempDirs.delete(tmpDir);
  } catch {
    // best-effort
  }
}
