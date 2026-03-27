/**
 * url-fetcher.mjs — Fetch a live URL with SSRF protection and size limits.
 * Uses Node.js built-in fetch() (Node 18+). No external dependencies.
 */

import { validateUrl, createResponseAccumulator } from './security.mjs';

const USER_AGENT = 'claude-rank/1.1.0 (https://github.com/Houseofmvps/claude-rank)';
const TIMEOUT_MS = 15_000;

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

  // 2. Abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s: ${url}`);
    }
    throw new Error(`Fetch failed for ${url}: ${err.message}`);
  }

  clearTimeout(timeoutId);

  // 3. Check Content-Type — only scan HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new Error(`Not an HTML page (Content-Type: ${contentType}): ${url}`);
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
    redirected: response.redirected,
    finalUrl: response.url,
  };
}
