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
export function generateHtmlReport({ seo, geo, aeo, citability, content, perf, vertical, security, brief, target, timestamp }) {
  const scanners = [];
  if (seo && !seo.skipped) scanners.push({ label: 'SEO', key: 'seo', data: seo });
  if (geo && !geo.skipped) scanners.push({ label: 'GEO', key: 'geo', data: geo });
  if (aeo && !aeo.skipped) scanners.push({ label: 'AEO', key: 'aeo', data: aeo });
  if (citability && !citability.skipped) scanners.push({ label: 'Citability', key: 'citability', data: citability });
  if (perf && !perf.skipped) scanners.push({ label: 'Performance', key: 'performance', data: perf });
  if (security && !security.skipped) scanners.push({ label: 'Security', key: 'security', data: security });

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
.section{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid #1e293b}
.section h2{margin-bottom:1rem}
.detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1.5rem}
.detail-card{background:#1e293b;border-radius:8px;padding:1rem}
.detail-card .label{color:#94a3b8;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.25rem}
.detail-card .value{font-size:1.25rem;font-weight:700;color:#f8fafc}
.detail-card .sub{color:#64748b;font-size:.75rem;margin-top:.25rem}
.dim-bar{background:#334155;border-radius:4px;height:8px;margin-top:.35rem;overflow:hidden}
.dim-fill{height:100%;border-radius:4px}
.type-badge{display:inline-block;padding:4px 12px;border-radius:6px;font-size:.8rem;font-weight:600;color:#fff;margin-right:.5rem}
.metric-row{display:flex;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid #1e293b;font-size:.85rem}
.metric-row:last-child{border:none}
.metric-label{color:#94a3b8}
.metric-value{color:#f8fafc;font-weight:600}
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

${buildCitabilitySection(citability)}
${buildContentSection(content)}
${buildPerfSection(perf)}
${buildVerticalSection(vertical)}
${buildSecuritySection(security)}
${buildBriefSection(brief)}

<footer>Generated by claude-rank v1.2.1 &mdash; <a href="https://github.com/Houseofmvps/claude-rank">github.com/Houseofmvps/claude-rank</a></footer>
</div>
</body>
</html>`;
}

function buildCitabilitySection(data) {
  if (!data || data.skipped) return '';
  const score = data.scores?.citability ?? 0;
  const { color } = scoreStyle(score);
  const bd = data.avgBreakdown || {};
  const dims = [
    { label: 'Statistic Density', value: bd.statisticDensity ?? 0, max: 15 },
    { label: 'Source Authority', value: bd.sourceAuthority ?? 0, max: 15 },
    { label: 'Unique Insights', value: bd.uniqueInsight ?? 0, max: 15 },
    { label: 'Quotable Hooks', value: bd.quotableHooks ?? 0, max: 15 },
    { label: 'Structured Clarity', value: bd.structuredClarity ?? 0, max: 15 },
    { label: 'Freshness Signals', value: bd.freshnessSignals ?? 0, max: 10 },
    { label: 'Content Structure', value: bd.contentStructure ?? 0, max: 15 },
  ];
  const dimRows = dims.map(d => {
    const pct = d.max > 0 ? Math.round((d.value / d.max) * 100) : 0;
    const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#eab308' : '#ef4444';
    return `
      <div class="detail-card">
        <div class="label">${esc(d.label)}</div>
        <div class="value">${d.value}<span style="color:#64748b;font-size:.75rem">/${d.max}</span></div>
        <div class="dim-bar"><div class="dim-fill" style="width:${pct}%;background:${barColor}"></div></div>
      </div>`;
  }).join('');

  const findingsHtml = buildFindingsTable(data.findings);

  return `
  <div class="section">
    <h2>Citability Analysis <span class="badge" style="background:${color}">${score}/100</span></h2>
    <div class="detail-grid">${dimRows}</div>
    ${findingsHtml}
  </div>`;
}

function buildContentSection(data) {
  if (!data || data.skipped) return '';
  const readability = data.avgReadability || {};
  const summary = data.summary || {};
  const totalFindings = (summary.high || 0) + (summary.medium || 0) + (summary.low || 0);

  return `
  <div class="section">
    <h2>Content Quality</h2>
    <div class="detail-grid">
      <div class="detail-card">
        <div class="label">Avg. Readability (Flesch-Kincaid)</div>
        <div class="value">${readability.fleschKincaid ?? 'N/A'}</div>
        <div class="sub">${esc(readability.label || '')}</div>
      </div>
      <div class="detail-card">
        <div class="label">Files Scanned</div>
        <div class="value">${data.files_scanned || 0}</div>
      </div>
      <div class="detail-card">
        <div class="label">Duplicates Found</div>
        <div class="value">${(data.duplicates || []).length}</div>
      </div>
      <div class="detail-card">
        <div class="label">Total Findings</div>
        <div class="value">${totalFindings}</div>
        <div class="sub">${summary.high || 0} high &middot; ${summary.medium || 0} medium &middot; ${summary.low || 0} low</div>
      </div>
    </div>
    ${data.linkSuggestions && data.linkSuggestions.length > 0 ? `
    <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">Internal Link Suggestions</h3>
    <table>
      <thead><tr><th>From</th><th>To</th><th>Anchor Topic</th></tr></thead>
      <tbody>${data.linkSuggestions.slice(0, 10).map(s => `
        <tr><td class="files-cell">${esc(s.from)}</td><td class="files-cell">${esc(s.to)}</td><td>${esc(s.topic)}</td></tr>`).join('')}
      </tbody>
    </table>` : ''}
    ${buildFindingsTable(data.findings)}
  </div>`;
}

function buildPerfSection(data) {
  if (!data || data.skipped) return '';
  const score = data.scores?.performance ?? 0;
  const { color } = scoreStyle(score);
  const m = data.metrics || {};

  const metrics = [
    ['Total Images', m.totalImages ?? 0],
    ['Images Without Dimensions', m.imagesWithoutDimensions ?? 0],
    ['Inline CSS (KB)', m.inlineCssKB ?? 0],
    ['Inline JS (KB)', m.inlineJsKB ?? 0],
    ['Blocking Scripts', m.blockingScripts ?? 0],
    ['External Script Domains', m.externalScriptDomains ?? 0],
    ['Lazy Loading', m.hasLazyLoading ? 'Yes' : 'No'],
    ['Fetch Priority', m.hasFetchPriority ? 'Yes' : 'No'],
    ['Font Display Swap', m.hasFontDisplaySwap ? 'Yes' : 'No'],
    ['Resource Hints', m.hasResourceHints ? 'Yes' : 'No'],
  ];

  const metricRows = metrics.map(([label, value]) => `
    <div class="metric-row"><span class="metric-label">${esc(label)}</span><span class="metric-value">${value}</span></div>`).join('');

  return `
  <div class="section">
    <h2>Performance <span class="badge" style="background:${color}">${score}/100</span></h2>
    <div style="background:#1e293b;border-radius:8px;padding:1rem;margin-bottom:1.5rem">
      ${metricRows}
    </div>
    ${buildFindingsTable(data.findings)}
  </div>`;
}

function buildVerticalSection(data) {
  if (!data || data.skipped) return '';
  const types = data.detected_types || [];

  if (types.length === 0) {
    return `
    <div class="section">
      <h2>Vertical Analysis</h2>
      <div class="empty" style="color:#94a3b8">No e-commerce or local business signals detected.</div>
    </div>`;
  }

  const typeBadges = types.map(t => `<span class="type-badge" style="background:${t === 'ecommerce' ? '#8b5cf6' : '#3b82f6'}">${esc(t)}</span>`).join('');

  let sections = '';

  if (data.ecommerce) {
    const ecom = data.ecommerce;
    const eScore = ecom.score ?? 0;
    const { color: eColor } = scoreStyle(eScore);
    sections += `
    <div style="margin-top:1rem">
      <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">E-commerce <span class="badge" style="background:${eColor}">${eScore}/100</span>
        <span style="color:#64748b;font-size:.75rem;margin-left:.5rem">${ecom.productPageCount ?? 0} product pages</span>
      </h3>
      ${buildFindingsTable(ecom.findings)}
    </div>`;
  }

  if (data.local) {
    const loc = data.local;
    const lScore = loc.score ?? 0;
    const { color: lColor } = scoreStyle(lScore);
    sections += `
    <div style="margin-top:1rem">
      <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">Local Business <span class="badge" style="background:${lColor}">${lScore}/100</span></h3>
      ${buildFindingsTable(loc.findings)}
    </div>`;
  }

  return `
  <div class="section">
    <h2>Vertical Analysis</h2>
    <p style="margin-bottom:1rem">Detected: ${typeBadges}</p>
    ${sections}
  </div>`;
}

function buildSecuritySection(data) {
  if (!data || data.skipped) return '';
  const score = data.scores?.security ?? 0;
  const { color } = scoreStyle(score);
  const summary = data.summary || {};

  return `
  <div class="section">
    <h2>Security <span class="badge" style="background:${color}">${score}/100</span></h2>
    <div class="detail-grid">
      <div class="detail-card">
        <div class="label">Files Scanned</div>
        <div class="value">${data.files_scanned || 0}</div>
      </div>
      <div class="detail-card">
        <div class="label">Critical</div>
        <div class="value" style="color:#dc2626">${summary.critical || 0}</div>
      </div>
      <div class="detail-card">
        <div class="label">High</div>
        <div class="value" style="color:#ef4444">${summary.high || 0}</div>
      </div>
      <div class="detail-card">
        <div class="label">Medium</div>
        <div class="value" style="color:#eab308">${summary.medium || 0}</div>
      </div>
      <div class="detail-card">
        <div class="label">Low</div>
        <div class="value" style="color:#64748b">${summary.low || 0}</div>
      </div>
    </div>
    ${buildFindingsTable(data.findings)}
  </div>`;
}

function buildBriefSection(data) {
  if (!data || data.skipped) return '';

  const outlineRows = (data.suggestedOutline || []).map((h2, i) =>
    `<tr><td>${i + 1}</td><td>${esc(h2)}</td></tr>`
  ).join('');

  const questionsRows = (data.questionsToAnswer || []).map(q =>
    `<tr><td>${esc(q)}</td></tr>`
  ).join('');

  const linkRows = (data.internalLinkingOpportunities || []).slice(0, 10).map(l =>
    `<tr><td class="files-cell">${esc(l.file)}</td><td>${esc(l.direction)}</td><td>${esc(l.reason)}</td></tr>`
  ).join('');

  const kwList = (data.relatedKeywords || []).slice(0, 15).map(k =>
    `<span class="type-badge" style="background:#334155">${esc(k.word)} (${k.frequency})</span>`
  ).join(' ');

  const gapRows = (data.contentGaps || []).slice(0, 8).map(g =>
    `<tr><td>${esc(g.topic)}</td><td>${esc(g.coverageRatio)}</td></tr>`
  ).join('');

  const geoRows = (data.geoOptimizationTips || []).map(t => {
    const badgeColor = t.priority === 'high' ? '#ef4444' : '#eab308';
    return `<tr><td><span class="badge" style="background:${badgeColor}">${esc(t.priority.toUpperCase())}</span></td><td>${esc(t.tip)}</td><td style="color:#94a3b8">${esc(t.reason)}</td></tr>`;
  }).join('');

  return `
  <div class="section">
    <h2>Content Brief: ${esc(data.targetKeyword)}</h2>
    <div class="detail-grid">
      <div class="detail-card">
        <div class="label">Suggested Title</div>
        <div class="value" style="font-size:1rem">${esc(data.suggestedTitle)}</div>
      </div>
      <div class="detail-card">
        <div class="label">Target Word Count</div>
        <div class="value">${data.targetWordCount}</div>
        <div class="sub">Avg competitor: ${data.avgCompetitorWordCount}</div>
      </div>
      <div class="detail-card">
        <div class="label">Pages Scanned</div>
        <div class="value">${data.analysis?.totalPagesScanned || 0}</div>
      </div>
      <div class="detail-card">
        <div class="label">Related Pages Found</div>
        <div class="value">${data.analysis?.relatedPagesFound || 0}</div>
      </div>
    </div>

    ${outlineRows ? `
    <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">Suggested H2 Outline</h3>
    <table><thead><tr><th>#</th><th>Heading</th></tr></thead><tbody>${outlineRows}</tbody></table>` : ''}

    ${questionsRows ? `
    <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">Questions to Answer</h3>
    <table><thead><tr><th>Question</th></tr></thead><tbody>${questionsRows}</tbody></table>` : ''}

    ${linkRows ? `
    <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">Internal Linking Opportunities</h3>
    <table><thead><tr><th>File</th><th>Direction</th><th>Reason</th></tr></thead><tbody>${linkRows}</tbody></table>` : ''}

    ${kwList ? `
    <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">Related Keywords</h3>
    <p>${kwList}</p>` : ''}

    ${gapRows ? `
    <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">Content Gaps</h3>
    <table><thead><tr><th>Topic</th><th>Coverage</th></tr></thead><tbody>${gapRows}</tbody></table>` : ''}

    ${geoRows ? `
    <h3 style="color:#f8fafc;font-size:1rem;margin-bottom:.75rem">GEO Optimization Tips</h3>
    <table><thead><tr><th>Priority</th><th>Tip</th><th>Reason</th></tr></thead><tbody>${geoRows}</tbody></table>` : ''}
  </div>`;
}

function buildFindingsTable(findings) {
  if (!findings || findings.length === 0) {
    return '<div class="empty" style="padding:1rem">No findings.</div>';
  }
  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...findings].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  const rows = sorted.map(f => {
    const badgeColor = severityBadgeColor(f.severity);
    const fileStr = f.file ? esc(f.file) : '';
    return `
      <tr>
        <td><span class="badge" style="background:${badgeColor}">${esc((f.severity || '').toUpperCase())}</span></td>
        <td class="rule-name">${esc(f.rule)}</td>
        <td>${esc(f.message)}</td>
        <td class="files-cell">${fileStr}</td>
      </tr>`;
  }).join('');
  return `
  <table>
    <thead><tr><th>Severity</th><th>Rule</th><th>Message</th><th>File</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
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
