/**
 * url-fetcher.mjs — Fetch a live URL with SSRF protection and size limits.
 * Uses Node.js built-in fetch() (Node 18+). No external dependencies.
 */

import { validateUrl, createResponseAccumulator } from './security.mjs';

const USER_AGENT = 'claude-rank/1.3.1 (https://github.com/Houseofmvps/claude-rank)';
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 10;

/**
 * Fetch a page by URL with SSRF protection and response size limits.
 * @param {string} url — the URL to fetch
 * @returns {Promise<{ html: string, url: string, statusCode: number, redirected: boolean, finalUrl: string }>}
 */
export async function fetchPage(url) {
  // 1. SSRF validation
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(`URL blocked: ${validation.reason}`);
  }

  // 2. Follow redirects manually to detect chains
  const redirectChain = [];
  let currentUrl = url;
  let response;

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,*/*',
        },
        redirect: 'manual',
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s: ${currentUrl}`);
      }
      throw new Error(`Fetch failed for ${currentUrl}: ${err.message}`);
    }

    clearTimeout(timeoutId);

    // Check for redirect (3xx status)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;

      // Resolve relative redirects
      const nextUrl = new URL(location, currentUrl).href;
      redirectChain.push({ from: currentUrl, to: nextUrl, statusCode: response.status });

      // SSRF check the redirect target
      const nextValidation = validateUrl(nextUrl);
      if (!nextValidation.valid) {
        throw new Error(`Redirect target blocked: ${nextValidation.reason}`);
      }

      currentUrl = nextUrl;

      if (i === MAX_REDIRECTS) {
        throw new Error(`Too many redirects (>${MAX_REDIRECTS}): ${url}`);
      }
      continue;
    }

    break;
  }

  const finalUrl = currentUrl;
  const redirected = redirectChain.length > 0;

  // 3. Check Content-Type — only scan HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error(`Not an HTML page (Content-Type: ${contentType}): ${finalUrl}`);
  }

  // 4. Read body with size limits using response accumulator
  const accumulator = createResponseAccumulator();

  // Use response.body (ReadableStream) for streaming size control
  // Fallback: if body is not a readable stream, use response.text()
  if (response.body && typeof response.body[Symbol.asyncIterator] === 'function') {
    const decoder = new TextDecoder();
    for await (const chunk of response.body) {
      accumulator.onData(decoder.decode(chunk, { stream: true }));
      if (accumulator.isTruncated()) break;
    }
  } else {
    // Fallback for environments where body isn't async-iterable
    const text = await response.text();
    accumulator.onData(text);
  }

  const html = accumulator.getBody();

  return {
    html,
    url,
    statusCode: response.status,
    redirected,
    finalUrl,
    redirectChain,
  };
}
