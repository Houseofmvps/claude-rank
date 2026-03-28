/**
 * formatter.mjs — Pretty terminal output for claude-rank CLI reports.
 * No external dependencies — uses raw ANSI escape codes.
 */

const c = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
};

const BAR_WIDTH = 15;

function scoreLabel(score) {
  if (score >= 90) return c.green('EXCELLENT');
  if (score >= 80) return c.green('GOOD');
  if (score >= 60) return c.yellow('NEEDS WORK');
  return c.red('POOR');
}

function scoreBar(score) {
  const filled = Math.round((score / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

function severityColor(severity) {
  if (severity === 'critical' || severity === 'high') return c.red;
  if (severity === 'medium') return c.yellow;
  return c.dim;
}

function pad(str, len) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  return str + ' '.repeat(Math.max(0, len - stripped.length));
}

/**
 * Group findings by rule, aggregating affected files and using the first message.
 */
function groupFindings(findings) {
  const groups = new Map();
  for (const f of findings) {
    if (!groups.has(f.rule)) {
      groups.set(f.rule, {
        rule: f.rule,
        severity: f.severity,
        message: f.message,
        files: [],
      });
    }
    const g = groups.get(f.rule);
    if (f.file && !g.files.includes(f.file)) {
      g.files.push(f.file);
    }
  }
  return [...groups.values()];
}

function formatFileList(files, max = 3) {
  if (files.length === 0) return '';
  const shown = files.slice(0, max);
  const rest = files.length - max;
  let out = shown.join(', ');
  if (rest > 0) out += `, +${rest} more`;
  return out;
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/**
 * Format a scanner report (SEO, GEO, or AEO) with a box header and grouped findings.
 */
function formatReport(result, title, scoreKey) {
  if (result.skipped) {
    return c.yellow(`Skipped: ${result.reason}`);
  }

  const score = result.scores[scoreKey];
  const { findings, summary } = result;
  const files_scanned = result.files_scanned ?? result.pages_scanned ?? 1;
  const groups = groupFindings(findings);
  groups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const W = 48;
  const hr = '\u2550'.repeat(W);
  const lines = [];

  lines.push(`\u2554${hr}\u2557`);
  lines.push(`\u2551${pad(c.bold(`          ${title}`), W + 9)}\u2551`);
  lines.push(`\u2560${hr}\u2563`);

  const barStr = `  Score:  ${score}/100  ${scoreBar(score)}  ${scoreLabel(score)}`;
  lines.push(`\u2551${pad(barStr, W + 22)}\u2551`);
  lines.push(`\u2560${hr}\u2563`);

  lines.push(`\u2551${pad(`  Files scanned: ${files_scanned}`, W)}\u2551`);
  lines.push(`\u2551${pad(`  Findings: ${findings.length}`, W)}\u2551`);
  const countsLine = `    Critical: ${summary.critical}  High: ${summary.high}  Medium: ${summary.medium}  Low: ${summary.low}`;
  lines.push(`\u2551${pad(countsLine, W)}\u2551`);
  lines.push(`\u255A${hr}\u255D`);
  lines.push('');

  if (groups.length === 0) {
    lines.push(c.green('No findings — looking great!'));
    return lines.join('\n');
  }

  lines.push(c.bold('Findings:'));
  {
    for (const g of groups) {
      const colorFn = severityColor(g.severity);
      const tag = pad(colorFn(g.severity.toUpperCase()), 10 + 9);
      const countSuffix = g.files.length > 1 ? ` (${g.files.length} pages)` : '';
      lines.push(`  ${tag}${c.bold(g.rule)}${c.dim(countSuffix)}`);
      lines.push(`           ${g.message}`);
      if (g.files.length > 0) {
        lines.push(`           ${c.dim('Files: ' + formatFileList(g.files))}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function formatSeoReport(result) {
  return formatReport(result, 'claude-rank SEO Audit', 'seo');
}

export function formatGeoReport(result) {
  return formatReport(result, 'claude-rank GEO Audit', 'geo');
}

export function formatAeoReport(result) {
  return formatReport(result, 'claude-rank AEO Audit', 'aeo');
}

/**
 * Format schema detection results.
 */
export function formatSchemaReport(results) {
  if (!results || results.length === 0) {
    return c.yellow('No structured data (JSON-LD, Microdata, RDFa) detected.');
  }

  const lines = [];
  const W = 48;
  const hr = '\u2550'.repeat(W);

  lines.push(`\u2554${hr}\u2557`);
  lines.push(`\u2551${pad(c.bold('       claude-rank Schema Report'), W + 9)}\u2551`);
  lines.push(`\u2560${hr}\u2563`);
  lines.push(`\u2551${pad(`  Files with schemas: ${results.length}`, W)}\u2551`);
  const totalSchemas = results.reduce((n, r) => n + r.schemas.length, 0);
  lines.push(`\u2551${pad(`  Total schemas found: ${totalSchemas}`, W)}\u2551`);
  lines.push(`\u255A${hr}\u255D`);
  lines.push('');

  for (const r of results) {
    lines.push(c.bold(r.file));
    for (const s of r.schemas) {
      const type = s.type || s['@type'] || 'Unknown';
      const format = s.format || 'JSON-LD';
      lines.push(`  ${c.cyan(type)} ${c.dim(`(${format})`)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
