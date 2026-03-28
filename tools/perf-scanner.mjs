/**
 * perf-scanner.mjs — Performance risk assessment from HTML analysis.
 * Detects CLS risks, render-blocking resources, LCP candidates, font loading issues.
 * No Chrome or Lighthouse needed — pure HTML analysis.
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseHtml, findHtmlFiles } from './lib/html-parser.mjs';
import { checkFileSize } from './lib/security.mjs';

const RULES = {
  // High (-10)
  'images-no-dimensions':     { severity: 'high', deduction: 10 },
  'no-font-display-swap':     { severity: 'high', deduction: 10 },
  'excessive-blocking-scripts':{ severity: 'high', deduction: 10 },

  // Medium (-5)
  'large-inline-css':         { severity: 'medium', deduction: 5 },
  'large-inline-js':          { severity: 'medium', deduction: 5 },
  'no-resource-hints':        { severity: 'medium', deduction: 5 },
  'too-many-external-scripts':{ severity: 'medium', deduction: 5 },
  'no-lazy-loading':          { severity: 'medium', deduction: 5 },
  'no-fetchpriority':         { severity: 'medium', deduction: 5 },
  'mixed-content-risk':       { severity: 'medium', deduction: 5 },

  // Low (-2)
  'no-preconnect':            { severity: 'low', deduction: 2 },
  'missing-meta-viewport':    { severity: 'low', deduction: 2 },
  'excessive-dom-depth':      { severity: 'low', deduction: 2 },
};

export function scanDirectory(rootDir) {
  const absRoot = path.resolve(rootDir);
  const htmlFiles = findHtmlFiles(absRoot);

  if (htmlFiles.length === 0) {
    return { skipped: true, reason: 'No HTML files found' };
  }

  const findings = [];
  const firedRules = new Set();
  let filesScanned = 0;

  // Aggregate metrics
  let totalImagesNoDim = 0;
  let totalImages = 0;
  let totalInlineCss = 0;
  let totalInlineJs = 0;
  let totalBlockingScripts = 0;
  let totalExternalDomains = new Set();
  let hasAnyLazyLoad = false;
  let hasAnyFetchPriority = false;
  let hasAnyFontSwap = false;
  let hasAnyPreconnect = false;
  let hasAnyResourceHints = false;
  let hasAnyMixedContent = false;
  let hasViewport = false;

  function add(rule, message) {
    if (firedRules.has(rule)) return;
    firedRules.add(rule);
    findings.push({ rule, severity: RULES[rule].severity, message });
  }

  for (const filePath of htmlFiles) {
    const sizeCheck = checkFileSize(filePath, fs.statSync);
    if (!sizeCheck.ok) continue;

    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }

    const state = parseHtml(content);
    filesScanned++;

    totalImagesNoDim += state.imagesWithoutDimensions;
    totalImages += state.imageCount || 0;
    totalInlineCss += state.inlineCssSize || 0;
    totalInlineJs += state.inlineJsSize || 0;
    totalBlockingScripts += (state.totalScripts - state.deferredScripts);

    if (state.externalScriptDomains) {
      for (const d of state.externalScriptDomains) totalExternalDomains.add(d);
    }

    if (state.hasLazyImages) hasAnyLazyLoad = true;
    if (state.hasFetchPriority) hasAnyFetchPriority = true;
    if (state.fontDisplaySwap) hasAnyFontSwap = true;
    if (state.preconnectLinks && state.preconnectLinks.length > 0) hasAnyPreconnect = true;
    if (state.preloadLinks && state.preloadLinks.length > 0) hasAnyResourceHints = true;
    if (state.prefetchLinks && state.prefetchLinks.length > 0) hasAnyResourceHints = true;
    if (state.httpResources && state.httpResources.length > 0) hasAnyMixedContent = true;
    if (state.hasViewport) hasViewport = true;
  }

  // Apply rules
  if (totalImagesNoDim > 0 && totalImages > 0 && totalImagesNoDim / totalImages > 0.5) {
    add('images-no-dimensions', `${totalImagesNoDim}/${totalImages} images missing width/height — causes CLS (Cumulative Layout Shift)`);
  }

  if (!hasAnyFontSwap) {
    // Check if Google Fonts or other web fonts are used
    const usesWebFonts = totalExternalDomains.has('fonts.googleapis.com') || totalExternalDomains.has('use.typekit.net');
    if (usesWebFonts) {
      add('no-font-display-swap', 'Web fonts detected without font-display: swap — text will flash/hide while fonts load (FOIT/FOUT)');
    }
  }

  if (totalBlockingScripts > 5) {
    add('excessive-blocking-scripts', `${totalBlockingScripts} render-blocking scripts detected — add async/defer to prevent slow first paint`);
  }

  if (totalInlineCss > 50000) {
    add('large-inline-css', `${Math.round(totalInlineCss / 1024)}KB of inline CSS — extract to external stylesheet for caching`);
  }

  if (totalInlineJs > 50000) {
    add('large-inline-js', `${Math.round(totalInlineJs / 1024)}KB of inline JavaScript — extract to external file with async/defer`);
  }

  if (!hasAnyResourceHints && totalExternalDomains.size > 0) {
    add('no-resource-hints', 'No preload/prefetch resource hints — add preload for critical assets (LCP image, key fonts)');
  }

  if (totalExternalDomains.size > 10) {
    add('too-many-external-scripts', `Scripts loaded from ${totalExternalDomains.size} external domains — each domain adds DNS lookup + connection time`);
  }

  if (!hasAnyLazyLoad && totalImages > 5) {
    add('no-lazy-loading', `${totalImages} images found but none use loading="lazy" — below-fold images should be lazy-loaded`);
  }

  if (!hasAnyFetchPriority && totalImages > 0) {
    add('no-fetchpriority', 'No fetchpriority="high" found — use it on your LCP image for faster largest contentful paint');
  }

  if (hasAnyMixedContent) {
    add('mixed-content-risk', 'HTTP resources loaded on HTTPS pages — mixed content causes security warnings and blocks in modern browsers');
  }

  if (!hasAnyPreconnect && totalExternalDomains.size > 3) {
    add('no-preconnect', 'No <link rel="preconnect"> found — preconnect to critical third-party domains (fonts, CDN, analytics)');
  }

  if (!hasViewport) {
    add('missing-meta-viewport', 'No viewport meta tag — page will not render correctly on mobile devices');
  }

  // Score
  let score = 100;
  for (const f of findings) {
    score -= RULES[f.rule].deduction;
  }

  return {
    files_scanned: filesScanned,
    findings,
    scores: { performance: Math.max(0, score) },
    metrics: {
      totalImages,
      imagesWithoutDimensions: totalImagesNoDim,
      inlineCssKB: Math.round(totalInlineCss / 1024),
      inlineJsKB: Math.round(totalInlineJs / 1024),
      blockingScripts: totalBlockingScripts,
      externalScriptDomains: totalExternalDomains.size,
      hasLazyLoading: hasAnyLazyLoad,
      hasFetchPriority: hasAnyFetchPriority,
      hasFontDisplaySwap: hasAnyFontSwap,
      hasResourceHints: hasAnyResourceHints,
    },
    summary: {
      critical: 0,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    },
  };
}

// CLI
const args = process.argv.slice(2);
if (args.length > 0) {
  const result = scanDirectory(args[0]);
  console.log(JSON.stringify(result, null, 2));
}
