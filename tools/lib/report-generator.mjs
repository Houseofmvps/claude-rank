/**
 * report-generator.mjs — Generate self-contained HTML audit reports.
 * No external dependencies. All CSS is inline.
 */

/**
 * Generate a self-contained HTML report from scan results.
 * @param {object} options
 * @param {object} options.seo — SEO scan result (optional)
 * @param {object} options.geo — GEO scan result (optional)
 * @param {object} options.aeo — AEO scan result (optional)
 * @param {string} options.target — directory or URL that was scanned
 * @param {string} options.timestamp — ISO timestamp
 * @returns {string} — complete HTML document
 */
export function generateHtmlReport({ seo, geo, aeo, target, timestamp }) {
  const scanners = [];
  if (seo && !seo.skipped) scanners.push({ label: 'SEO', key: 'seo', data: seo });
  if (geo && !geo.skipped) scanners.push({ label: 'GEO', key: 'geo', data: geo });
  if (aeo && !aeo.skipped) scanners.push({ label: 'AEO', key: 'aeo', data: aeo });

  const scoreCards = scanners.map(s => {
    const score = s.data.scores[s.key];
    const { color, label } = scoreStyle(score);
    return `
      <div class="score-card">
        <div class="score-ring" style="--score: ${score}; --color: ${color}">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" class="ring-bg"/>
            <circle cx="60" cy="60" r="52" class="ring-fill" style="stroke-dashoffset: calc(327 - (327 * ${score} / 100))"/>
          </svg>
          <span class="score-value">${score}</span>
        </div>
        <div class="score-label" style="color: ${color}">${label}</div>
        <div class="score-type">${s.label}</div>
        <div class="score-meta">${s.data.files_scanned} files &middot; ${s.data.findings.length} findings</div>
      </div>`;
  }).join('\n');

  const allFindings = [];
  for (const s of scanners) {
    for (const f of s.data.findings) {
      allFindings.push({ ...f, scanner: s.label });
    }
  }

  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  allFindings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  // Group by rule
  const groups = new Map();
  for (const f of allFindings) {
    const key = `${f.scanner}:${f.rule}`;
    if (!groups.has(key)) {
      groups.set(key, { rule: f.rule, severity: f.severity, message: f.message, scanner: f.scanner, files: [] });
    }
    if (f.file && !groups.get(key).files.includes(f.file)) {
      groups.get(key).files.push(f.file);
    }
  }

  const findingsRows = [...groups.values()].map(g => {
    const badgeColor = severityBadgeColor(g.severity);
    const filesStr = g.files.length > 0
      ? g.files.slice(0, 3).map(f => esc(f)).join(', ') + (g.files.length > 3 ? `, +${g.files.length - 3} more` : '')
      : '—';
    return `
      <tr>
        <td><span class="badge" style="background: ${badgeColor}">${esc(g.severity.toUpperCase())}</span></td>
        <td class="rule-name">${esc(g.rule)}<span class="scanner-tag">${esc(g.scanner)}</span></td>
        <td>${esc(g.message)}</td>
        <td class="files-cell">${filesStr}</td>
      </tr>`;
  }).join('\n');

  const displayDate = timestamp ? new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'long', timeStyle: 'short',
  }) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>claude-rank Audit Report — ${esc(target)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6;padding:2rem}
.container{max-width:960px;margin:0 auto}
header{text-align:center;margin-bottom:2.5rem;padding-bottom:1.5rem;border-bottom:1px solid #1e293b}
header h1{font-size:1.75rem;color:#f8fafc;margin-bottom:.25rem}
header p{color:#94a3b8;font-size:.875rem}
.scores{display:flex;gap:2rem;justify-content:center;flex-wrap:wrap;margin-bottom:2.5rem}
.score-card{text-align:center;background:#1e293b;border-radius:12px;padding:1.5rem 2rem;min-width:180px}
.score-ring{position:relative;width:100px;height:100px;margin:0 auto .75rem}
.score-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:#334155;stroke-width:8}
.ring-fill{fill:none;stroke:var(--color);stroke-width:8;stroke-linecap:round;stroke-dasharray:327;transition:stroke-dashoffset .5s}
.score-value{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:#f8fafc}
.score-label{font-weight:600;font-size:.875rem;text-transform:uppercase;letter-spacing:.05em}
.score-type{font-size:1.125rem;font-weight:600;color:#f8fafc;margin-top:.25rem}
.score-meta{color:#64748b;font-size:.75rem;margin-top:.25rem}
h2{font-size:1.25rem;color:#f8fafc;margin-bottom:1rem}
table{width:100%;border-collapse:collapse;font-size:.85rem;margin-bottom:2rem}
th{text-align:left;color:#94a3b8;font-weight:600;padding:.75rem .5rem;border-bottom:2px solid #1e293b}
td{padding:.65rem .5rem;border-bottom:1px solid #1e293b;vertical-align:top}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.7rem;font-weight:700;color:#fff;text-transform:uppercase}
.rule-name{font-weight:600;color:#f8fafc}
.scanner-tag{margin-left:.5rem;font-size:.65rem;color:#64748b;font-weight:400}
.files-cell{color:#94a3b8;font-size:.8rem;max-width:200px;word-break:break-all}
footer{text-align:center;color:#475569;font-size:.75rem;margin-top:2rem;padding-top:1rem;border-top:1px solid #1e293b}
footer a{color:#64748b}
.empty{text-align:center;color:#22c55e;padding:2rem;font-size:1rem}
@media print{body{background:#fff;color:#1e293b;padding:1rem}.score-card{background:#f1f5f9}th{color:#475569;border-color:#cbd5e1}td{border-color:#e2e8f0}.rule-name{color:#0f172a}header{border-color:#cbd5e1}footer{border-color:#cbd5e1;color:#94a3b8}}
</style>
</head>
<body>
<div class="container">
<header>
  <h1>claude-rank Audit Report</h1>
  <p>${esc(target)} &mdash; ${esc(displayDate)}</p>
</header>

<section class="scores">
${scoreCards || '<p style="color:#94a3b8">No scan results available.</p>'}
</section>

<h2>Findings</h2>
${groups.size > 0 ? `
<table>
<thead><tr><th>Severity</th><th>Rule</th><th>Message</th><th>Files</th></tr></thead>
<tbody>
${findingsRows}
</tbody>
</table>` : '<div class="empty">No findings — looking great!</div>'}

<footer>Generated by claude-rank v1.2.1 &mdash; <a href="https://github.com/Houseofmvps/claude-rank">github.com/Houseofmvps/claude-rank</a></footer>
</div>
</body>
</html>`;
}

function scoreStyle(score) {
  if (score >= 90) return { color: '#22c55e', label: 'Excellent' };
  if (score >= 80) return { color: '#3b82f6', label: 'Good' };
  if (score >= 60) return { color: '#eab308', label: 'Needs Work' };
  return { color: '#ef4444', label: 'Poor' };
}

function severityBadgeColor(severity) {
  if (severity === 'critical') return '#dc2626';
  if (severity === 'high') return '#ef4444';
  if (severity === 'medium') return '#eab308';
  return '#64748b';
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
