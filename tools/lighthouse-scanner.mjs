#!/usr/bin/env node
/**
 * lighthouse-scanner.mjs — Core Web Vitals scanner using Lighthouse.
 * Uses `npx -y lighthouse@12` — no separate install needed. Just needs Chrome.
 * Pinned version prevents supply chain attacks.
 *
 * Usage:
 *   node tools/lighthouse-scanner.mjs <url>
 *   node tools/lighthouse-scanner.mjs <url> --json
 */

import { execFileSync } from 'child_process';
import { readFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateUrl } from './lib/security.mjs';

// Pin lighthouse version to prevent supply chain attacks
const LIGHTHOUSE_VERSION = 'lighthouse@12';

// ---------------------------------------------------------------------------
// Chrome detection (same as Ultraship)
// ---------------------------------------------------------------------------

const CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    try {
      execFileSync('test', ['-f', p]);
      return p;
    } catch {
      // not found at this path
    }
  }

  const candidates = ['google-chrome', 'chromium-browser', 'chromium', 'chrome'];
  for (const name of candidates) {
    try {
      const result = execFileSync('which', [name], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const found = result.trim();
      if (found) return found;
    } catch {
      // not in PATH
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// CWV thresholds (Google's current thresholds as of 2026)
// ---------------------------------------------------------------------------

const CWV_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TBT: { good: 200, poor: 600 },
  SI:  { good: 3400, poor: 5800 },
};

function rateMetric(value, thresholds) {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

const RULES = {
  'cwv-lcp-poor':       { severity: 'high', deduction: 10 },
  'cwv-lcp-needs-work': { severity: 'medium', deduction: 5 },
  'cwv-cls-poor':       { severity: 'high', deduction: 10 },
  'cwv-cls-needs-work': { severity: 'medium', deduction: 5 },
  'cwv-fcp-poor':       { severity: 'medium', deduction: 5 },
  'cwv-fcp-needs-work': { severity: 'low', deduction: 2 },
  'cwv-tbt-poor':       { severity: 'high', deduction: 10 },
  'cwv-tbt-needs-work': { severity: 'medium', deduction: 5 },
  'cwv-si-poor':        { severity: 'medium', deduction: 5 },
  'cwv-si-needs-work':  { severity: 'low', deduction: 2 },
  'perf-score-poor':    { severity: 'high', deduction: 10 },
  'perf-score-needs-work': { severity: 'medium', deduction: 5 },
};

// ---------------------------------------------------------------------------
// isAvailable — check if Chrome is present (Lighthouse downloads via npx)
// ---------------------------------------------------------------------------

/**
 * Check if CWV scanning is available (just needs Chrome — Lighthouse auto-downloads).
 * @returns {{ available: boolean, reason?: string, chromePath?: string }}
 */
export function isAvailable() {
  const chromePath = findChrome();
  if (!chromePath) {
    return {
      available: false,
      reason: 'Chrome or Chromium not found. Install Google Chrome to enable Core Web Vitals scanning.',
    };
  }
  return { available: true, chromePath };
}

// ---------------------------------------------------------------------------
// runLighthouse — run via npx (no install needed)
// ---------------------------------------------------------------------------

/**
 * Run Lighthouse audit on a URL and return Core Web Vitals metrics.
 * Uses `npx -y lighthouse@12` — downloads automatically, no global install.
 * @param {string} url — the URL to audit
 * @returns {object} { url, available, metrics, findings, scores, summary }
 */
export function runLighthouse(url) {
  // Validate URL
  const urlCheck = validateUrl(url);
  if (!urlCheck.valid) {
    return {
      url,
      available: false,
      reason: `URL blocked: ${urlCheck.reason}`,
      metrics: null,
      findings: [],
      scores: { performance: null },
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }

  const check = isAvailable();
  if (!check.available) {
    return {
      url,
      available: false,
      reason: check.reason,
      metrics: null,
      findings: [],
      scores: { performance: null },
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'claude-rank-lh-'));
  const outputFile = join(tmpDir, 'report.json');

  try {
    // Run Lighthouse via npx — auto-downloads if not cached
    execFileSync(
      'npx',
      [
        '-y',
        LIGHTHOUSE_VERSION,
        url,
        '--output=json',
        `--output-path=${outputFile}`,
        '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
        '--quiet',
        '--only-categories=performance',
      ],
      {
        env: { ...process.env, CHROME_PATH: check.chromePath },
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let report;
    try {
      report = JSON.parse(readFileSync(outputFile, 'utf8'));
    } catch {
      return {
        url,
        available: true,
        reason: 'Failed to parse Lighthouse output',
        metrics: null,
        findings: [],
        scores: { performance: null },
        summary: { critical: 0, high: 0, medium: 0, low: 0 },
      };
    }

    const cats = report.categories || {};
    const audits = report.audits || {};

    // Extract metrics
    const metrics = {
      performanceScore: cats.performance ? Math.round(cats.performance.score * 100) : null,
      LCP: audits['largest-contentful-paint']?.numericValue || null,
      CLS: audits['cumulative-layout-shift']?.numericValue || null,
      FCP: audits['first-contentful-paint']?.numericValue || null,
      TBT: audits['total-blocking-time']?.numericValue || null,
      SI: audits['speed-index']?.numericValue || null,
    };

    // Generate findings
    const findings = [];

    function addFinding(rule, message) {
      const def = RULES[rule];
      if (def) {
        findings.push({ rule, severity: def.severity, file: url, message });
      }
    }

    // Performance score
    if (metrics.performanceScore !== null) {
      if (metrics.performanceScore < 50) {
        addFinding('perf-score-poor', `Lighthouse performance score is ${metrics.performanceScore}/100 (poor, target: 90+)`);
      } else if (metrics.performanceScore < 90) {
        addFinding('perf-score-needs-work', `Lighthouse performance score is ${metrics.performanceScore}/100 (target: 90+)`);
      }
    }

    // LCP
    if (metrics.LCP !== null) {
      const rating = rateMetric(metrics.LCP, CWV_THRESHOLDS.LCP);
      const val = (metrics.LCP / 1000).toFixed(1);
      if (rating === 'poor') addFinding('cwv-lcp-poor', `LCP is ${val}s (poor — should be under 2.5s)`);
      else if (rating === 'needs-improvement') addFinding('cwv-lcp-needs-work', `LCP is ${val}s (needs improvement — target: under 2.5s)`);
      metrics.LCP_rating = rating;
    }

    // CLS
    if (metrics.CLS !== null) {
      const rating = rateMetric(metrics.CLS, CWV_THRESHOLDS.CLS);
      if (rating === 'poor') addFinding('cwv-cls-poor', `CLS is ${metrics.CLS.toFixed(3)} (poor — should be under 0.1)`);
      else if (rating === 'needs-improvement') addFinding('cwv-cls-needs-work', `CLS is ${metrics.CLS.toFixed(3)} (needs improvement — target: under 0.1)`);
      metrics.CLS_rating = rating;
    }

    // FCP
    if (metrics.FCP !== null) {
      const rating = rateMetric(metrics.FCP, CWV_THRESHOLDS.FCP);
      const val = (metrics.FCP / 1000).toFixed(1);
      if (rating === 'poor') addFinding('cwv-fcp-poor', `FCP is ${val}s (poor — should be under 1.8s)`);
      else if (rating === 'needs-improvement') addFinding('cwv-fcp-needs-work', `FCP is ${val}s (needs improvement — target: under 1.8s)`);
      metrics.FCP_rating = rating;
    }

    // TBT
    if (metrics.TBT !== null) {
      const rating = rateMetric(metrics.TBT, CWV_THRESHOLDS.TBT);
      if (rating === 'poor') addFinding('cwv-tbt-poor', `TBT is ${Math.round(metrics.TBT)}ms (poor — should be under 200ms)`);
      else if (rating === 'needs-improvement') addFinding('cwv-tbt-needs-work', `TBT is ${Math.round(metrics.TBT)}ms (needs improvement — target: under 200ms)`);
      metrics.TBT_rating = rating;
    }

    // Speed Index
    if (metrics.SI !== null) {
      const rating = rateMetric(metrics.SI, CWV_THRESHOLDS.SI);
      const val = (metrics.SI / 1000).toFixed(1);
      if (rating === 'poor') addFinding('cwv-si-poor', `Speed Index is ${val}s (poor — should be under 3.4s)`);
      else if (rating === 'needs-improvement') addFinding('cwv-si-needs-work', `Speed Index is ${val}s (needs improvement — target: under 3.4s)`);
      metrics.SI_rating = rating;
    }

    // Extract top opportunities for actionable advice
    const opportunities = Object.values(audits)
      .filter(a => a.score !== null && a.score < 1 && a.details?.type === 'opportunity')
      .map(a => ({
        id: a.id,
        savings_ms: Math.round(a.details.overallSavingsMs || 0),
        message: a.title,
      }))
      .sort((a, b) => b.savings_ms - a.savings_ms)
      .slice(0, 5);

    // Calculate score
    const triggeredRules = new Set(findings.map(f => f.rule));
    let score = 100;
    for (const rule of triggeredRules) {
      const def = RULES[rule];
      if (def) score -= def.deduction;
    }
    score = Math.max(0, score);

    const summary = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      if (summary[f.severity] !== undefined) summary[f.severity]++;
    }

    return {
      url,
      available: true,
      metrics,
      opportunities,
      findings,
      scores: { performance: score, lighthouseScore: metrics.performanceScore },
      summary,
    };
  } catch (err) {
    return {
      url,
      available: true,
      reason: err.message || 'Lighthouse run failed',
      metrics: null,
      findings: [],
      scores: { performance: null },
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  } finally {
    try { unlinkSync(outputFile); } catch { /* ignore */ }
    try { unlinkSync(tmpDir); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0 && !args[0].startsWith('-')) {
  const url = args[0];
  const result = runLighthouse(url);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
