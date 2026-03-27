/**
 * security.mjs — SSRF protection, file size limits, response accumulation, secret redaction.
 * Used by all claude-rank tools that fetch external URLs or read files.
 */

import path from 'node:path';

// ---------------------------------------------------------------------------
// 1. validateUrl
// ---------------------------------------------------------------------------

const PRIVATE_IP_PATTERNS = [
  /^127\./,                          // 127.x loopback
  /^10\./,                           // 10.x private
  /^192\.168\./,                     // 192.168.x private
  /^169\.254\./,                     // 169.254.x link-local / AWS metadata
  /^0\./,                            // 0.x reserved
  /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16–31.x private
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64–127.x shared address space
];

const CLOUD_METADATA_HOSTS = new Set([
  'metadata.google.internal',
  'metadata.google.com',
]);

const METADATA_PATHS = [
  '/computeMetadata',
  '/openstack',
  '/latest/meta-data',
  '/latest/user-data',
];

/**
 * Validates a URL is safe to fetch.
 * @param {string} urlString
 * @returns {{ valid: true, url: URL } | { valid: false, reason: string }}
 */
export function validateUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Invalid URL' };
  }

  // Only HTTP/HTTPS allowed
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { valid: false, reason: `Scheme "${url.protocol}" is not allowed. Only http/https.` };
  }

  const hostname = url.hostname.toLowerCase();

  // Block cloud metadata hosts
  if (CLOUD_METADATA_HOSTS.has(hostname)) {
    return { valid: false, reason: `Cloud metadata endpoint blocked: ${hostname}` };
  }

  // Block IPv6 loopback, link-local, unique local
  if (hostname === '::1' || hostname === '[::1]') {
    return { valid: false, reason: 'IPv6 loopback blocked' };
  }
  if (hostname.startsWith('fe80:') || hostname.startsWith('[fe80:')) {
    return { valid: false, reason: 'IPv6 link-local blocked' };
  }
  if (hostname.startsWith('fc') || hostname.startsWith('fd') ||
      hostname.startsWith('[fc') || hostname.startsWith('[fd')) {
    return { valid: false, reason: 'IPv6 unique local blocked' };
  }

  // Allow localhost for dev server testing, but block metadata paths
  if (hostname === 'localhost') {
    const pathStr = url.pathname || '/';
    for (const metaPath of METADATA_PATHS) {
      if (pathStr.startsWith(metaPath)) {
        return { valid: false, reason: `Metadata path blocked on localhost: ${pathStr}` };
      }
    }
    return { valid: true, url };
  }

  // Block private IP ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: `Private IP address blocked: ${hostname}` };
    }
  }

  return { valid: true, url };
}

// ---------------------------------------------------------------------------
// 2. validateDirPath
// ---------------------------------------------------------------------------

/**
 * Resolves and returns an absolute path, or null if input is falsy.
 * @param {string} dir
 * @returns {string|null}
 */
export function validateDirPath(dir) {
  if (!dir) return null;
  return path.resolve(dir);
}

// ---------------------------------------------------------------------------
// 3. checkFileSize
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Checks a file is within the allowed size limit before reading.
 * @param {string} filePath
 * @param {Function} statSync — injectable for testing (defaults to fs.statSync)
 * @returns {{ ok: boolean, size: number, reason?: string }}
 */
export function checkFileSize(filePath, statSync) {
  let stat;
  try {
    stat = statSync(filePath);
  } catch (err) {
    return { ok: false, size: 0, reason: `Cannot stat file: ${err.message}` };
  }
  const size = stat.size;
  if (size > MAX_FILE_SIZE) {
    return { ok: false, size, reason: `File too large: ${(size / 1024 / 1024).toFixed(1)}MB (limit 10MB)` };
  }
  return { ok: true, size };
}

// ---------------------------------------------------------------------------
// 4. createResponseAccumulator
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RESPONSE = 5 * 1024 * 1024; // 5 MB

/**
 * Creates a size-limited response accumulator for streaming HTTP responses.
 * @param {number} maxSize — byte limit (default 5MB)
 * @returns {{ onData: Function, getBody: Function, isTruncated: Function, getTotalSize: Function }}
 */
export function createResponseAccumulator(maxSize = DEFAULT_MAX_RESPONSE) {
  const chunks = [];
  let total = 0;
  let truncated = false;

  function onData(chunk) {
    if (truncated) return;
    const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    const remaining = maxSize - total;
    if (chunkStr.length <= remaining) {
      chunks.push(chunkStr);
      total += chunkStr.length;
    } else {
      // Take only what fits
      chunks.push(chunkStr.slice(0, remaining));
      total = maxSize;
      truncated = true;
    }
  }

  function getBody() {
    return chunks.join('');
  }

  function isTruncated() {
    return truncated;
  }

  function getTotalSize() {
    return total;
  }

  return { onData, getBody, isTruncated, getTotalSize };
}

// ---------------------------------------------------------------------------
// 5. redactSensitiveValue
// ---------------------------------------------------------------------------

const SENSITIVE_KEY_PATTERNS = [
  'password', 'secret', 'token', 'key', 'credential', 'auth', 'api_key', 'apikey', 'private',
];

/**
 * Redacts a value if its key name suggests it is sensitive.
 * Shows first 4 chars + ***REDACTED*** for values longer than 4 chars.
 * @param {string} key
 * @param {*} value
 * @returns {*}
 */
export function redactSensitiveValue(key, value) {
  if (value === null || value === undefined) return value;
  const lowerKey = String(key).toLowerCase();
  const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => lowerKey.includes(pattern));
  if (!isSensitive) return value;

  const strValue = String(value);
  if (strValue.length <= 4) {
    return '***REDACTED***';
  }
  return strValue.slice(0, 4) + '***REDACTED***';
}
