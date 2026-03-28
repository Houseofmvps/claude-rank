/**
 * lighthouse-scanner.mjs — Core Web Vitals scanner using Lighthouse.
 * Optional dependency: works when `lighthouse` and Chrome are available.
 * Gracefully returns unavailable status when not installed.
 *
 * Usage:
 *   node tools/lighthouse-scanner.mjs <url>
 *   node tools/lighthouse-scanner.mjs <url> --json
 */

// ---------------------------------------------------------------------------
// Try to import lighthouse (optional dependency)
// ---------------------------------------------------------------------------

let lighthouse = null;
let chromeLauncher = null;

try {
  lighthouse = (await import('lighthouse')).default;
  chromeLauncher = await import('chrome-launcher');
} catch {
  // lighthouse not installed — will return unavailable status
}

// ---------------------------------------------------------------------------
// CWV thresholds (Google's current thresholds as of 2026)
// ---------------------------------------------------------------------------

const CWV_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },    // Largest Contentful Paint (ms)
  CLS: { good: 0.1, poor: 0.25 },     // Cumulative Layout Shift
  INP: { good: 200, poor: 500 },       // Interaction to Next Paint (ms)
  FCP: { good: 1800, poor: 3000 },     // First Contentful Paint (ms)
  TBT: { good: 200, poor: 600 },       // Total Blocking Time (ms)
  SI:  { good: 3400, poor: 5800 },     // Speed Index (ms)
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
// isAvailable — check if Lighthouse can run
// ---------------------------------------------------------------------------

/**
 * Check if Lighthouse is available (installed + Chrome present).
 * @returns {{ available: boolean, reason?: string }}
 */
export function isAvailable() {
  if (!lighthouse || !chromeLauncher) {
    return {
      available: false,
      reason: 'Lighthouse not installed. Run: npm install -g lighthouse chrome-launcher',
    };
  }
  return { available: true };
}

// ---------------------------------------------------------------------------
// runLighthouse — run audit and extract CWV metrics
// ---------------------------------------------------------------------------

/**
 * Run Lighthouse audit on a URL and return Core Web Vitals metrics.
 * @param {string} url — the URL to audit
 * @returns {Promise<object>} { url, available, metrics, findings, scores, summary }
 */
export async function runLighthouse(url) {
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

  // Launch Chrome headless
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  });

  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance'],
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
      },
    });

    const lhr = result.lhr;
    const audits = lhr.audits;

    // Extract metrics
    const metrics = {
      performanceScore: Math.round((lhr.categories.performance?.score || 0) * 100),
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
    if (metrics.performanceScore < 50) {
      addFinding('perf-score-poor', `Lighthouse performance score is ${metrics.performanceScore}/100 (poor, target: 90+)`);
    } else if (metrics.performanceScore < 90) {
      addFinding('perf-score-needs-work', `Lighthouse performance score is ${metrics.performanceScore}/100 (target: 90+)`);
    }

    // LCP
    if (metrics.LCP !== null) {
      const rating = rateMetric(metrics.LCP, CWV_THRESHOLDS.LCP);
      const lcpSec = (metrics.LCP / 1000).toFixed(1);
      if (rating === 'poor') {
        addFinding('cwv-lcp-poor', `LCP is ${lcpSec}s (poor — should be under ${CWV_THRESHOLDS.LCP.good / 1000}s)`);
      } else if (rating === 'needs-improvement') {
        addFinding('cwv-lcp-needs-work', `LCP is ${lcpSec}s (needs improvement — target: under ${CWV_THRESHOLDS.LCP.good / 1000}s)`);
      }
      metrics.LCP_rating = rating;
    }

    // CLS
    if (metrics.CLS !== null) {
      const rating = rateMetric(metrics.CLS, CWV_THRESHOLDS.CLS);
      if (rating === 'poor') {
        addFinding('cwv-cls-poor', `CLS is ${metrics.CLS.toFixed(3)} (poor — should be under ${CWV_THRESHOLDS.CLS.good})`);
      } else if (rating === 'needs-improvement') {
        addFinding('cwv-cls-needs-work', `CLS is ${metrics.CLS.toFixed(3)} (needs improvement — target: under ${CWV_THRESHOLDS.CLS.good})`);
      }
      metrics.CLS_rating = rating;
    }

    // FCP
    if (metrics.FCP !== null) {
      const rating = rateMetric(metrics.FCP, CWV_THRESHOLDS.FCP);
      const fcpSec = (metrics.FCP / 1000).toFixed(1);
      if (rating === 'poor') {
        addFinding('cwv-fcp-poor', `FCP is ${fcpSec}s (poor — should be under ${CWV_THRESHOLDS.FCP.good / 1000}s)`);
      } else if (rating === 'needs-improvement') {
        addFinding('cwv-fcp-needs-work', `FCP is ${fcpSec}s (needs improvement — target: under ${CWV_THRESHOLDS.FCP.good / 1000}s)`);
      }
      metrics.FCP_rating = rating;
    }

    // TBT (proxy for INP in lab data)
    if (metrics.TBT !== null) {
      const rating = rateMetric(metrics.TBT, CWV_THRESHOLDS.TBT);
      if (rating === 'poor') {
        addFinding('cwv-tbt-poor', `TBT is ${Math.round(metrics.TBT)}ms (poor — should be under ${CWV_THRESHOLDS.TBT.good}ms)`);
      } else if (rating === 'needs-improvement') {
        addFinding('cwv-tbt-needs-work', `TBT is ${Math.round(metrics.TBT)}ms (needs improvement — target: under ${CWV_THRESHOLDS.TBT.good}ms)`);
      }
      metrics.TBT_rating = rating;
    }

    // Speed Index
    if (metrics.SI !== null) {
      const rating = rateMetric(metrics.SI, CWV_THRESHOLDS.SI);
      const siSec = (metrics.SI / 1000).toFixed(1);
      if (rating === 'poor') {
        addFinding('cwv-si-poor', `Speed Index is ${siSec}s (poor — should be under ${CWV_THRESHOLDS.SI.good / 1000}s)`);
      } else if (rating === 'needs-improvement') {
        addFinding('cwv-si-needs-work', `Speed Index is ${siSec}s (needs improvement — target: under ${CWV_THRESHOLDS.SI.good / 1000}s)`);
      }
      metrics.SI_rating = rating;
    }

    // Calculate CWV score
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
      findings,
      scores: { performance: score, lighthouseScore: metrics.performanceScore },
      summary,
    };
  } finally {
    await chrome.kill();
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.length > 0 && args[0] !== 'detect' && args[0] !== 'generate') {
  const url = args[0];
  const jsonFlag = args.includes('--json');

  const result = await runLighthouse(url);

  if (jsonFlag || !process.stdout.isTTY) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (!result.available) {
      console.log(`\n  Lighthouse not available: ${result.reason}\n`);
      process.exit(0);
    }

    const m = result.metrics;
    console.log('');
    console.log('  Core Web Vitals Report');
    console.log('  ═══════════════════════');
    console.log(`  Performance Score: ${m.performanceScore}/100`);
    console.log('');
    console.log(`  LCP  (Largest Contentful Paint):  ${(m.LCP / 1000).toFixed(1)}s  [${m.LCP_rating}]`);
    console.log(`  CLS  (Cumulative Layout Shift):   ${m.CLS.toFixed(3)}   [${m.CLS_rating}]`);
    console.log(`  FCP  (First Contentful Paint):    ${(m.FCP / 1000).toFixed(1)}s  [${m.FCP_rating}]`);
    console.log(`  TBT  (Total Blocking Time):       ${Math.round(m.TBT)}ms  [${m.TBT_rating}]`);
    console.log(`  SI   (Speed Index):               ${(m.SI / 1000).toFixed(1)}s  [${m.SI_rating}]`);
    console.log('');

    if (result.findings.length > 0) {
      console.log('  Findings:');
      for (const f of result.findings) {
        console.log(`    ${f.severity.toUpperCase().padEnd(8)} ${f.message}`);
      }
    } else {
      console.log('  All Core Web Vitals are good!');
    }
    console.log('');
  }
}
