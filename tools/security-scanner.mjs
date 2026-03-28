/**
 * security-scanner.mjs — Security & Headers scanner for claude-rank.
 *
 * Analyzes static HTML files for security headers and HTTPS compliance that
 * affect SEO rankings. Google confirmed HTTPS as a ranking signal in 2014.
 *
 * This is a STATIC HTML scanner — it cannot inspect live server response
 * headers. All header checks look for the <meta http-equiv="..."> or
 * <meta name="..."> equivalents that browsers honour in the document.
 *
 * 15 rules across 4 severity tiers:
 *   critical (-20): http-only-links
 *   high     (-10): no-https-redirect-hint, mixed-content-scripts, mixed-content-resources
 *   medium    (-5): no-csp-meta, no-x-content-type-meta, no-referrer-policy,
 *                   external-scripts-no-integrity, inline-event-handlers,
 *                   form-no-action-https, password-autocomplete
 *   low       (-2): no-permissions-policy, external-links-no-noopener,
 *                   iframe-no-sandbox, no-x-frame-meta
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

const RULES = {
  // Critical (-20)
  'http-only-links':                { severity: 'critical', deduction: 20 },

  // High (-10)
  'no-https-redirect-hint':        { severity: 'high', deduction: 10 },
  'mixed-content-scripts':         { severity: 'high', deduction: 10 },
  'mixed-content-resources':       { severity: 'high', deduction: 10 },

  // Medium (-5)
  'no-csp-meta':                   { severity: 'medium', deduction: 5 },
  'no-x-content-type-meta':        { severity: 'medium', deduction: 5 },
  'no-referrer-policy':            { severity: 'medium', deduction: 5 },
  'external-scripts-no-integrity': { severity: 'medium', deduction: 5 },
  'inline-event-handlers':         { severity: 'medium', deduction: 5 },
  'form-no-action-https':          { severity: 'medium', deduction: 5 },
  'password-autocomplete':         { severity: 'medium', deduction: 5 },

  // Low (-2)
  'no-permissions-policy':         { severity: 'low', deduction: 2 },
  'external-links-no-noopener':    { severity: 'low', deduction: 2 },
  'iframe-no-sandbox':             { severity: 'low', deduction: 2 },
  'no-x-frame-meta':               { severity: 'low', deduction: 2 },
};

// ---------------------------------------------------------------------------
// Regex patterns for raw HTML scanning
// ---------------------------------------------------------------------------

/** Matches <meta http-equiv="..."> tags and captures the http-equiv value. */
const META_HTTP_EQUIV_RE = /<meta\s+[^>]*http-equiv\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** Matches <meta name="..."> tags and captures the name value. */
const META_NAME_RE = /<meta\s+[^>]*name\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** Matches <meta> with content attribute, captures both http-equiv and content. */
const META_HTTP_EQUIV_CONTENT_RE = /<meta\s+[^>]*http-equiv\s*=\s*["']([^"']+)["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>|<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*http-equiv\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** Matches canonical link tags and captures the href. */
const CANONICAL_RE = /<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>|<link\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/gi;

/** Matches og:url meta tags and captures the content. */
const OG_URL_RE = /<meta\s+[^>]*property\s*=\s*["']og:url["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>|<meta\s+[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:url["'][^>]*>/gi;

/** Matches external <script src="..."> tags. */
const EXTERNAL_SCRIPT_RE = /<script\s+[^>]*src\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;

/** Checks whether a tag contains an integrity= attribute. */
const INTEGRITY_RE = /\bintegrity\s*=\s*["'][^"']+["']/i;

/** Matches inline event handler attributes (onclick, onload, onerror, etc.). */
const INLINE_EVENT_RE = /\s(on(?:click|dblclick|mousedown|mouseup|mouseover|mouseout|mousemove|mouseenter|mouseleave|keydown|keyup|keypress|submit|change|focus|blur|load|unload|error|resize|scroll|beforeunload|hashchange|popstate|input|invalid|reset|select|contextmenu|drag|dragstart|dragend|dragover|dragenter|dragleave|drop|copy|cut|paste|abort|canplay|ended|pause|play|playing|progress|ratechange|seeked|seeking|stalled|suspend|timeupdate|volumechange|waiting|toggle|wheel|pointerdown|pointerup|pointermove|pointerenter|pointerleave|pointerover|pointerout|touchstart|touchend|touchmove|touchcancel|animationstart|animationend|animationiteration|transitionend))\s*=/gi;

/** Matches <form> tags with action="http://...". */
const FORM_HTTP_ACTION_RE = /<form\s+[^>]*action\s*=\s*["'](http:\/\/[^"']+)["'][^>]*>/gi;

/** Matches <input type="password"> tags. */
const PASSWORD_INPUT_RE = /<input\s+[^>]*type\s*=\s*["']password["'][^>]*>/gi;

/** Matches autocomplete attribute and captures its value. */
const AUTOCOMPLETE_RE = /\bautocomplete\s*=\s*["']([^"']*)["']/i;

/** Matches <a target="_blank"> tags. */
const TARGET_BLANK_RE = /<a\s+[^>]*target\s*=\s*["']_blank["'][^>]*>/gi;

/** Matches rel attribute and captures its value. */
const REL_ATTR_RE = /\brel\s*=\s*["']([^"']*)["']/i;

/** Matches <iframe> tags. */
const IFRAME_RE = /<iframe\s+[^>]*>/gi;

/** Checks whether a tag contains a sandbox= attribute. */
const SANDBOX_RE = /\bsandbox\b/i;

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

/**
 * Scan a directory of HTML files for security and HTTPS compliance issues.
 *
 * @param {string} rootDir — Path to the directory to scan.
 * @returns {{ files_scanned: number, findings: Array<{ rule: string, severity: string, message: string }>, scores: { security: number }, summary: { critical: number, high: number, medium: number, low: number } }}
 */
export function scanDirectory(rootDir) {
  const absRoot = path.resolve(rootDir);
  const htmlFiles = findHtmlFiles(absRoot);

  if (htmlFiles.length === 0) {
    return { skipped: true, reason: 'No HTML files found' };
  }

  const findings = [];
  const firedRules = new Set();
  let filesScanned = 0;

  // ---- Aggregate flags across all files ----
  let hasHttpOnlyMetaUrls = false;
  let httpOnlyDetail = '';
  let hasUpgradeInsecure = false;
  let hasMixedContentScripts = false;
  let hasMixedContentResources = false;
  let hasCspMeta = false;
  let hasXContentTypeMeta = false;
  let hasReferrerPolicy = false;
  let hasExternalScriptsNoIntegrity = false;
  let hasInlineEventHandlers = false;
  let hasFormHttpAction = false;
  let hasPasswordNoAutocomplete = false;
  let hasPermissionsPolicy = false;
  let hasExternalLinksNoNoopener = false;
  let hasIframeNoSandbox = false;
  let hasXFrameMeta = false;

  /**
   * Record a finding. Each rule fires at most once across all files.
   * @param {string} rule — Rule id from RULES.
   * @param {string} message — Human-readable explanation.
   */
  function add(rule, message) {
    if (firedRules.has(rule)) return;
    firedRules.add(rule);
    findings.push({ rule, severity: RULES[rule].severity, message });
  }

  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const state = parseHtml(content);
    filesScanned++;

    // ------------------------------------------------------------------
    // 1. http-only-links (critical)
    //    Canonical, og:url, or other key meta URLs using http:// not https://
    // ------------------------------------------------------------------
    const reCanonical = new RegExp(CANONICAL_RE.source, CANONICAL_RE.flags);
    let match;
    while ((match = reCanonical.exec(content)) !== null) {
      const url = match[1] || match[2];
      if (url && url.startsWith('http://')) {
        hasHttpOnlyMetaUrls = true;
        httpOnlyDetail = `canonical URL uses http:// (${url})`;
      }
    }

    const reOgUrl = new RegExp(OG_URL_RE.source, OG_URL_RE.flags);
    while ((match = reOgUrl.exec(content)) !== null) {
      const url = match[1] || match[2];
      if (url && url.startsWith('http://')) {
        hasHttpOnlyMetaUrls = true;
        httpOnlyDetail = httpOnlyDetail || `og:url uses http:// (${url})`;
      }
    }

    // ------------------------------------------------------------------
    // 2. Collect http-equiv meta tags present in this file
    // ------------------------------------------------------------------
    const httpEquivFound = new Set();
    const reHttpEquiv = new RegExp(META_HTTP_EQUIV_RE.source, META_HTTP_EQUIV_RE.flags);
    while ((match = reHttpEquiv.exec(content)) !== null) {
      httpEquivFound.add(match[1].toLowerCase());
    }

    // Check for upgrade-insecure-requests inside CSP
    const reHttpEquivContent = new RegExp(META_HTTP_EQUIV_CONTENT_RE.source, META_HTTP_EQUIV_CONTENT_RE.flags);
    while ((match = reHttpEquivContent.exec(content)) !== null) {
      const equiv = (match[1] || match[4] || '').toLowerCase();
      const contentVal = (match[2] || match[3] || '').toLowerCase();
      if (equiv === 'content-security-policy' && contentVal.includes('upgrade-insecure-requests')) {
        hasUpgradeInsecure = true;
      }
    }

    if (httpEquivFound.has('content-security-policy')) hasCspMeta = true;
    if (httpEquivFound.has('x-content-type-options')) hasXContentTypeMeta = true;
    if (httpEquivFound.has('x-frame-options')) hasXFrameMeta = true;
    if (httpEquivFound.has('permissions-policy') || httpEquivFound.has('feature-policy')) hasPermissionsPolicy = true;
    if (httpEquivFound.has('referrer-policy')) hasReferrerPolicy = true;

    // ------------------------------------------------------------------
    // 3. Referrer policy via <meta name="referrer">
    // ------------------------------------------------------------------
    const reMetaName = new RegExp(META_NAME_RE.source, META_NAME_RE.flags);
    while ((match = reMetaName.exec(content)) !== null) {
      const name = match[1].toLowerCase();
      if (name === 'referrer') hasReferrerPolicy = true;
    }

    // ------------------------------------------------------------------
    // 4. Mixed content — separate scripts from other resources
    // ------------------------------------------------------------------
    if (state.httpResources && state.httpResources.length > 0) {
      for (const url of state.httpResources) {
        const lower = url.toLowerCase();
        if (lower.endsWith('.js') || lower.includes('.js?')) {
          hasMixedContentScripts = true;
        } else {
          hasMixedContentResources = true;
        }
      }
    }

    // Also check <script src="http://..."> directly for scripts missed by parseHtml
    const reScriptHttp = /<script\s+[^>]*src\s*=\s*["'](http:\/\/[^"']+)["'][^>]*>/gi;
    while ((match = reScriptHttp.exec(content)) !== null) {
      hasMixedContentScripts = true;
    }

    // ------------------------------------------------------------------
    // 5. External scripts without integrity (SRI)
    // ------------------------------------------------------------------
    const reExtScript = new RegExp(EXTERNAL_SCRIPT_RE.source, EXTERNAL_SCRIPT_RE.flags);
    while ((match = reExtScript.exec(content)) !== null) {
      const fullTag = match[0];
      if (!INTEGRITY_RE.test(fullTag)) {
        hasExternalScriptsNoIntegrity = true;
      }
    }

    // ------------------------------------------------------------------
    // 6. Inline event handlers
    // ------------------------------------------------------------------
    const reInlineEvent = new RegExp(INLINE_EVENT_RE.source, INLINE_EVENT_RE.flags);
    if (reInlineEvent.test(content)) {
      hasInlineEventHandlers = true;
    }

    // ------------------------------------------------------------------
    // 7. Form with action="http://..."
    // ------------------------------------------------------------------
    const reFormHttp = new RegExp(FORM_HTTP_ACTION_RE.source, FORM_HTTP_ACTION_RE.flags);
    if (reFormHttp.test(content)) {
      hasFormHttpAction = true;
    }

    // ------------------------------------------------------------------
    // 8. Password inputs without proper autocomplete
    // ------------------------------------------------------------------
    const rePwdInput = new RegExp(PASSWORD_INPUT_RE.source, PASSWORD_INPUT_RE.flags);
    while ((match = rePwdInput.exec(content)) !== null) {
      const tag = match[0];
      const acMatch = AUTOCOMPLETE_RE.exec(tag);
      if (!acMatch) {
        // No autocomplete attribute at all
        hasPasswordNoAutocomplete = true;
      } else {
        const val = acMatch[1].toLowerCase().trim();
        // Acceptable values: "off", "current-password", "new-password"
        if (val !== 'off' && val !== 'current-password' && val !== 'new-password') {
          hasPasswordNoAutocomplete = true;
        }
      }
    }

    // ------------------------------------------------------------------
    // 9. External links with target="_blank" missing rel="noopener"
    // ------------------------------------------------------------------
    const reTargetBlank = new RegExp(TARGET_BLANK_RE.source, TARGET_BLANK_RE.flags);
    while ((match = reTargetBlank.exec(content)) !== null) {
      const tag = match[0];
      const relMatch = REL_ATTR_RE.exec(tag);
      if (!relMatch || !relMatch[1].includes('noopener')) {
        hasExternalLinksNoNoopener = true;
      }
    }

    // ------------------------------------------------------------------
    // 10. Iframes without sandbox attribute
    // ------------------------------------------------------------------
    const reIframe = new RegExp(IFRAME_RE.source, IFRAME_RE.flags);
    while ((match = reIframe.exec(content)) !== null) {
      const tag = match[0];
      if (!SANDBOX_RE.test(tag)) {
        hasIframeNoSandbox = true;
      }
    }
  }

  // ====================================================================
  // Apply rules — each fires at most once
  // ====================================================================

  // Critical
  if (hasHttpOnlyMetaUrls) {
    add('http-only-links',
      `Canonical or og:url meta tags use http:// instead of https:// — ${httpOnlyDetail}. ` +
      'Google treats HTTP and HTTPS as different URLs; this splits ranking signals and triggers mixed-content warnings');
  }

  // High
  if (!hasUpgradeInsecure) {
    add('no-https-redirect-hint',
      'No <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests"> found — ' +
      'browsers will not auto-upgrade http:// sub-resource requests to https://. Set via server headers or meta tag');
  }

  if (hasMixedContentScripts) {
    add('mixed-content-scripts',
      'Script resources loaded over http:// on an https:// page — browsers block mixed active content entirely, ' +
      'breaking functionality and harming SEO trust signals');
  }

  if (hasMixedContentResources) {
    add('mixed-content-resources',
      'Images, stylesheets, or other resources loaded over http:// — browsers may block or show "Not Secure" warnings, ' +
      'degrading user trust and Core Web Vitals');
  }

  // Medium
  if (!hasCspMeta) {
    add('no-csp-meta',
      'No Content-Security-Policy meta tag found — CSP prevents XSS and data injection attacks. ' +
      'Set via server headers or meta tag');
  }

  if (!hasXContentTypeMeta) {
    add('no-x-content-type-meta',
      'No X-Content-Type-Options meta tag found — without "nosniff", browsers may MIME-sniff responses, ' +
      'enabling XSS vectors. Set via server headers or meta tag');
  }

  if (!hasReferrerPolicy) {
    add('no-referrer-policy',
      'No referrer policy found — browser sends full referrer URL by default, potentially leaking page paths ' +
      'to third parties. Add <meta name="referrer" content="strict-origin-when-cross-origin"> or set via server headers');
  }

  if (hasExternalScriptsNoIntegrity) {
    add('external-scripts-no-integrity',
      'External <script> tags loaded without integrity attribute (Subresource Integrity) — ' +
      'vulnerable to supply-chain attacks if the CDN is compromised');
  }

  if (hasInlineEventHandlers) {
    add('inline-event-handlers',
      'Inline event handlers detected (onclick, onload, onerror, etc.) — these violate strict CSP policies ' +
      'and make XSS mitigation harder. Move handlers to external scripts');
  }

  if (hasFormHttpAction) {
    add('form-no-action-https',
      '<form> action attribute points to an http:// URL — form data will be sent unencrypted. ' +
      'Browsers show prominent warnings and may block the submission');
  }

  if (hasPasswordNoAutocomplete) {
    add('password-autocomplete',
      '<input type="password"> without autocomplete="current-password", "new-password", or "off" — ' +
      'set an explicit autocomplete value to help browsers and password managers handle credentials safely');
  }

  // Low
  if (!hasPermissionsPolicy) {
    add('no-permissions-policy',
      'No Permissions-Policy or Feature-Policy meta tag found — browser APIs (camera, microphone, geolocation) ' +
      'are not explicitly restricted. Set via server headers or meta tag');
  }

  if (hasExternalLinksNoNoopener) {
    add('external-links-no-noopener',
      'Links with target="_blank" missing rel="noopener" — the opened page can access window.opener, ' +
      'enabling phishing via reverse tabnabbing');
  }

  if (hasIframeNoSandbox) {
    add('iframe-no-sandbox',
      '<iframe> tags without sandbox attribute — embedded content has full privileges including script execution ' +
      'and form submission. Add sandbox="" with only the permissions needed');
  }

  if (!hasXFrameMeta) {
    add('no-x-frame-meta',
      'No X-Frame-Options meta tag found — page can be embedded in iframes on any domain, enabling clickjacking. ' +
      'Set via server headers or meta tag');
  }

  // ====================================================================
  // Compute score
  // ====================================================================

  let score = 100;
  for (const f of findings) {
    score -= RULES[f.rule].deduction;
  }

  return {
    files_scanned: filesScanned,
    findings,
    scores: { security: Math.max(0, score) },
    summary: {
      critical: findings.filter(f => f.severity === 'critical').length,
      high:     findings.filter(f => f.severity === 'high').length,
      medium:   findings.filter(f => f.severity === 'medium').length,
      low:      findings.filter(f => f.severity === 'low').length,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0) {
  const result = scanDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
