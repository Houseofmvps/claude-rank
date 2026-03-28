/**
 * formatter.mjs — Professional terminal output for claude-rank CLI reports.
 * No external dependencies — uses raw ANSI escape codes.
 */

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const c = {
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  blue: s => `\x1b[34m${s}\x1b[0m`,
  magenta: s => `\x1b[35m${s}\x1b[0m`,
  cyan: s => `\x1b[36m${s}\x1b[0m`,
  white: s => `\x1b[37m${s}\x1b[0m`,
  bold: s => `\x1b[1m${s}\x1b[0m`,
  dim: s => `\x1b[2m${s}\x1b[0m`,
  underline: s => `\x1b[4m${s}\x1b[0m`,
  bgRed: s => `\x1b[41m\x1b[37m${s}\x1b[0m`,
  bgYellow: s => `\x1b[43m\x1b[30m${s}\x1b[0m`,
  bgGreen: s => `\x1b[42m\x1b[30m${s}\x1b[0m`,
  bgBlue: s => `\x1b[44m\x1b[37m${s}\x1b[0m`,
  bgCyan: s => `\x1b[46m\x1b[30m${s}\x1b[0m`,
};

/** Strip ANSI codes for accurate length measurement */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Pad string to exact visual width (ANSI-aware) */
function pad(str, len) {
  const visible = stripAnsi(str).length;
  return str + ' '.repeat(Math.max(0, len - visible));
}


// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

function gradeFor(score) {
  if (score >= 90) return { letter: 'A', color: c.bgGreen };
  if (score >= 80) return { letter: 'B', color: c.bgGreen };
  if (score >= 70) return { letter: 'C', color: c.bgYellow };
  if (score >= 60) return { letter: 'D', color: c.bgYellow };
  return { letter: 'F', color: c.bgRed };
}

function scoreLabel(score) {
  if (score >= 90) return c.green('Excellent');
  if (score >= 80) return c.green('Good');
  if (score >= 70) return c.yellow('Needs Work');
  if (score >= 60) return c.yellow('Below Average');
  return c.red('Poor');
}

function scoreBar(score) {
  const width = 20;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const barChar = '\u2501'; // heavy horizontal line
  const emptyChar = '\u2500'; // light horizontal line

  let bar;
  if (score >= 80) {
    bar = c.green(barChar.repeat(filled)) + c.dim(emptyChar.repeat(empty));
  } else if (score >= 60) {
    bar = c.yellow(barChar.repeat(filled)) + c.dim(emptyChar.repeat(empty));
  } else {
    bar = c.red(barChar.repeat(filled)) + c.dim(emptyChar.repeat(empty));
  }
  return bar;
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function severityBadge(severity) {
  switch (severity) {
    case 'critical': return c.bgRed(' CRITICAL ');
    case 'high':     return c.bgRed('   HIGH   ');
    case 'medium':   return c.bgYellow(' MEDIUM  ');
    case 'low':      return c.dim('   LOW    ');
    default:         return c.dim(`  ${severity.toUpperCase()}  `);
  }
}

function severityIcon(severity) {
  switch (severity) {
    case 'critical': return c.red('\u2718'); // heavy X
    case 'high':     return c.red('\u2716'); // heavy X
    case 'medium':   return c.yellow('\u25CB'); // circle
    case 'low':      return c.dim('\u2022'); // bullet
    default:         return ' ';
  }
}

// ---------------------------------------------------------------------------
// Fix suggestions for common rules
// ---------------------------------------------------------------------------

const FIX_HINTS = {
  // SEO
  'missing-title':             'Add <title>Your Page Title</title> in <head>',
  'missing-meta-description':  'Add <meta name="description" content="..."> in <head>',
  'missing-h1':                'Add one <h1> heading per page',
  'thin-content':              'Expand main content to 300+ words',
  'missing-viewport':          'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
  'missing-og-title':          'Add <meta property="og:title" content="...">',
  'missing-og-description':    'Add <meta property="og:description" content="...">',
  'missing-og-image':          'Add <meta property="og:image" content="https://...">',
  'missing-og-url':            'Add <meta property="og:url" content="https://...">',
  'missing-canonical':         'Add <link rel="canonical" href="...">',
  'missing-json-ld':           'Add JSON-LD structured data — run /claude-rank:rank-schema',
  'missing-favicon':           'Add <link rel="icon" href="/favicon.ico">',
  'no-analytics':              'Add Google Analytics, Plausible, or PostHog',
  'missing-twitter-card':      'Add <meta name="twitter:card" content="summary_large_image">',
  'missing-twitter-image':     'Add <meta name="twitter:image" content="https://...">',
  'missing-lang':              'Add lang="en" to your <html> tag',
  'missing-charset':           'Add <meta charset="utf-8"> in <head>',
  'no-manifest':               'Add <link rel="manifest" href="/manifest.json">',
  'missing-main-landmark':     'Wrap main content in <main>...</main>',
  'missing-nav-landmark':      'Wrap navigation in <nav>...</nav>',
  'missing-footer-landmark':   'Wrap footer in <footer>...</footer>',
  'images-missing-alt':        'Add descriptive alt="" to all <img> tags',
  'images-missing-dimensions': 'Add width/height to <img> tags (prevents CLS)',
  'viewport-not-responsive':   'Use width=device-width in viewport meta',
  'has-noindex':               'Remove noindex from robots meta (unless intentional)',
  'schema-invalid':            'Fix JSON-LD schema — run /claude-rank:rank-schema',
  'multiple-h1':               'Use only one <h1> per page',
  'title-too-long':            'Shorten title to under 60 characters',
  'title-too-short':           'Expand title to at least 20 characters',
  'all-scripts-blocking':      'Add async or defer to <script> tags',
  'title-content-mismatch':    'Align page content with title keywords',
  'meta-content-mismatch':     'Align page content with meta description keywords',
  'duplicate-title':           'Make each page title unique',
  'duplicate-meta-description':'Make each meta description unique',

  // GEO
  'missing-robots-txt':        'Create robots.txt allowing AI crawlers',
  'missing-sitemap':           'Create sitemap.xml and reference in robots.txt',
  'missing-llms-txt':          'Create llms.txt for AI discoverability',
  'bot-blocked':               'Unblock AI bots in robots.txt (GPTBot, ClaudeBot, etc.)',
  'no-ai-bot-rules':           'Add explicit Allow rules for AI bots in robots.txt',
  'missing-org-schema':        'Add Organization JSON-LD schema',
  'missing-author-schema':     'Add author attribution to article content',
  'thin-content-ai':           'Expand content to 300+ words per page for AI citation',
  'no-question-headers':       'Add question-format H2 headings (What is...? How to...?)',
  'no-definition-patterns':    'Add clear definition patterns for AI extraction',
  'no-data-tables':            'Add data tables to support AI citation',
  'content-not-citation-ready':'Write 120-167 word passages for AI citation fitness',
  'no-direct-answer':          'Start with a direct answer in the first 40-60 words',
  'no-statistics':             'Add statistics and data points to support claims',

  // AEO
  'missing-faq-schema':        'Add FAQPage JSON-LD for People Also Ask',
  'missing-howto-schema':      'Add HowTo JSON-LD for step-by-step content',
  'missing-speakable-schema':  'Add speakable schema for voice search',
  'no-snippet-answers':        'Add 40-60 word answer paragraphs after H2 questions',
  'missing-content-schema':    'Add Article or WebPage JSON-LD schema',
  'missing-llms-txt-aeo':      'Create llms.txt for answer engine discovery',
  'answers-too-long':          'Trim answer paragraphs to 40-60 words',
  'no-numbered-steps':         'Add numbered/ordered lists for featured snippets',
  'no-voice-friendly-content': 'Add 20-35 word concise answers for voice search',
  'no-paa-patterns':           'Add "People Also Ask" style Q&A sections',
};

// ---------------------------------------------------------------------------
// Grouping and formatting
// ---------------------------------------------------------------------------

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
  if (files.length === 1) return files[0];
  const shown = files.slice(0, max);
  const rest = files.length - max;
  let out = shown.join(', ');
  if (rest > 0) out += c.dim(` +${rest} more`);
  return out;
}

// ---------------------------------------------------------------------------
// Main report formatter
// ---------------------------------------------------------------------------

function formatReport(result, title, scoreKey, scannerType) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const score = result.scores[scoreKey];
  const { findings, summary } = result;
  const filesScanned = result.files_scanned ?? result.pages_scanned ?? 1;
  const groups = groupFindings(findings);
  groups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const grade = gradeFor(score);
  const lines = [];

  // ── Header ──────────────────────────────────────────────
  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold(title)}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));

  // ── Score ───────────────────────────────────────────────
  lines.push('');
  lines.push(`  ${grade.color(` ${score} `)}  ${scoreBar(score)}  ${scoreLabel(score)}`);
  lines.push('');
  lines.push(`  ${c.dim('Files scanned:')} ${filesScanned}    ${c.dim('Findings:')} ${findings.length}    ${summary.critical > 0 ? c.red(`Critical: ${summary.critical}`) : c.dim(`Critical: ${summary.critical}`)}  ${summary.high > 0 ? c.red(`High: ${summary.high}`) : c.dim(`High: ${summary.high}`)}  ${summary.medium > 0 ? c.yellow(`Medium: ${summary.medium}`) : c.dim(`Medium: ${summary.medium}`)}  ${c.dim(`Low: ${summary.low}`)}`);

  // ── No findings ─────────────────────────────────────────
  if (groups.length === 0) {
    lines.push('');
    lines.push(`  ${c.green('\u2714')} ${c.bold(c.green('All checks passed!'))} No issues found.`);
    lines.push('');
    return lines.join('\n');
  }

  // ── Critical & High (must fix) ──────────────────────────
  const critical = groups.filter(g => g.severity === 'critical' || g.severity === 'high');
  const medium = groups.filter(g => g.severity === 'medium');
  const low = groups.filter(g => g.severity === 'low');

  if (critical.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.red('\u2718 Must Fix'))} ${c.dim(`(${critical.length} issues)`)}`);
    lines.push('');
    for (const g of critical) {
      const badge = severityBadge(g.severity);
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${badge}  ${c.bold(g.rule)}${pageCount}`);
      lines.push(`              ${g.message}`);
      if (hint) {
        lines.push(`              ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      }
      if (g.files.length > 0) {
        lines.push(`              ${c.dim(formatFileList(g.files))}`);
      }
      lines.push('');
    }
  }

  // ── Medium (should fix) ─────────────────────────────────
  if (medium.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.yellow('\u25CB Should Fix'))} ${c.dim(`(${medium.length} issues)`)}`);
    lines.push('');
    for (const g of medium) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.bold(g.rule)}${pageCount}`);
      lines.push(`     ${g.message}`);
      if (hint) {
        lines.push(`     ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      }
      if (g.files.length > 1) {
        lines.push(`     ${c.dim(formatFileList(g.files))}`);
      }
      lines.push('');
    }
  }

  // ── Low (nice to have) ─────────────────────────────────
  if (low.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.dim('\u2022 Nice to Have')} ${c.dim(`(${low.length} issues)`)}`);
    lines.push('');
    for (const g of low) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.dim(g.rule)}${pageCount}`);
      lines.push(`     ${c.dim(g.message)}`);
      if (hint) {
        lines.push(`     ${c.dim('\u2192 ' + hint)}`);
      }
      lines.push('');
    }
  }

  // ── Next steps ──────────────────────────────────────────
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  if (critical.length > 0) {
    lines.push(`  ${c.red('1.')} Fix ${c.bold(`${critical.length} critical/high`)} issues first — they have the biggest impact`);
  }
  if (medium.length > 0) {
    const step = critical.length > 0 ? '2.' : '1.';
    lines.push(`  ${c.yellow(step)} Address ${c.bold(`${medium.length} medium`)} issues for a solid foundation`);
  }
  if (scannerType === 'seo') {
    lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank geo .')} to check AI search readiness`);
    lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank compete <url> .')} to compare vs competitors`);
  } else if (scannerType === 'geo') {
    lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank aeo .')} to optimize for featured snippets`);
  } else if (scannerType === 'aeo') {
    lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('/claude-rank:rank-fix')} to auto-fix all findings`);
  }
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public exports — scanner reports
// ---------------------------------------------------------------------------

export function formatSeoReport(result) {
  return formatReport(result, 'SEO Audit', 'seo', 'seo');
}

export function formatGeoReport(result) {
  return formatReport(result, 'GEO Audit', 'geo', 'geo');
}

export function formatAeoReport(result) {
  return formatReport(result, 'AEO Audit', 'aeo', 'aeo');
}

// ---------------------------------------------------------------------------
// Competitive X-Ray report
// ---------------------------------------------------------------------------

export function formatCompeteReport(result) {
  if (result.error) {
    return `\n  ${c.red('\u2718')} ${result.error}\n`;
  }

  const lines = [];
  const { youWins, themWins, ties } = result.summary;

  // ── Header ──────────────────────────────────────────────
  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Competitive X-Ray')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(56)));
  lines.push('');
  lines.push(`  ${c.bold('You:')}   ${result.you.title || result.you.directory}`);
  lines.push(`  ${c.bold('Them:')}  ${result.competitor.title || result.competitor.url}`);

  // ── Score ───────────────────────────────────────────────
  lines.push('');
  const youColor = youWins >= themWins ? c.green : c.red;
  const themColor = themWins >= youWins ? c.red : c.green;
  lines.push(`  ${youColor(`You ${youWins}`)}  ${c.dim('vs')}  ${themColor(`Them ${themWins}`)}  ${c.dim(`(${ties} ties)`)}`);
  lines.push('');
  lines.push(`  ${c.bold(result.headline)}`);

  // ── Signal comparison table ─────────────────────────────
  lines.push('');
  lines.push(c.dim('  ' + '\u2500'.repeat(56)));
  lines.push(`  ${pad(c.bold('Signal'), 26)} ${pad(c.bold('You'), 12)} ${pad(c.bold('Them'), 12)} ${c.bold('Result')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(56)));

  for (const v of result.verdicts) {
    const icon = v.winner === 'you'  ? c.green('\u2714') :
                 v.winner === 'them' ? c.red('\u2718') :
                 c.dim('\u2500');
    const label = v.winner === 'you'  ? c.green('You') :
                  v.winner === 'them' ? c.red('Them') :
                  c.dim('Tie');
    lines.push(`  ${pad(v.area, 24)} ${pad(String(v.you), 10)} ${pad(String(v.them), 10)} ${icon} ${label}`);
  }
  lines.push(c.dim('  ' + '\u2500'.repeat(56)));

  // ── Tech stack ──────────────────────────────────────────
  if (result.competitor.techStack.length > 0 || result.you.techStack.length > 0) {
    lines.push('');
    lines.push(`  ${c.bold('Tech Stack')}`);
    lines.push('');
    if (result.you.techStack.length > 0) {
      for (const t of result.you.techStack) {
        lines.push(`  ${c.green('\u2022')} ${t.tech} ${c.dim(`(${t.category})`)}`);
      }
    } else {
      lines.push(`  ${c.dim('  No technologies detected in your project')}`);
    }
    lines.push('');
    lines.push(`  ${c.bold('Competitor:')}`);
    if (result.competitor.techStack.length > 0) {
      for (const t of result.competitor.techStack) {
        lines.push(`  ${c.red('\u2022')} ${t.tech} ${c.dim(`(${t.category})`)}`);
      }
    } else {
      lines.push(`  ${c.dim('  No technologies detected')}`);
    }
  }

  // ── Conversion signals ──────────────────────────────────
  if (result.competitor.conversionSignals.length > 0 || result.you.conversionSignals.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(56)));
    lines.push(`  ${c.bold('Conversion Signals')}`);
    lines.push('');
    if (result.you.conversionSignals.length > 0) {
      lines.push(`  ${c.green('You:')}  ${result.you.conversionSignals.join(' \u2022 ')}`);
    } else {
      lines.push(`  ${c.green('You:')}  ${c.dim('None detected')}`);
    }
    if (result.competitor.conversionSignals.length > 0) {
      lines.push(`  ${c.red('Them:')} ${result.competitor.conversionSignals.join(' \u2022 ')}`);
    } else {
      lines.push(`  ${c.red('Them:')} ${c.dim('None detected')}`);
    }
  }

  // ── Action items ────────────────────────────────────────
  if (result.summary.theirAdvantages.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(56)));
    lines.push(`  ${c.bold(c.yellow('Gaps to Close'))}`);
    lines.push('');
    for (const gap of result.summary.theirAdvantages) {
      lines.push(`  ${c.yellow('\u2192')} ${gap}`);
    }
  }

  if (result.summary.yourAdvantages.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(56)));
    lines.push(`  ${c.bold(c.green('Your Advantages'))}`);
    lines.push('');
    for (const adv of result.summary.yourAdvantages) {
      lines.push(`  ${c.green('\u2714')} ${adv}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Schema report
// ---------------------------------------------------------------------------

export function formatSchemaReport(results) {
  if (!results || results.length === 0) {
    return `\n  ${c.yellow('\u26A0')} No structured data (JSON-LD) detected.\n  ${c.cyan('\u2192')} Run ${c.bold('/claude-rank:rank-schema')} to generate schema.\n`;
  }

  const lines = [];
  const totalSchemas = results.reduce((n, r) => n + r.schemas.length, 0);

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Schema Report')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${c.dim('Files with schemas:')} ${results.length}    ${c.dim('Total schemas:')} ${totalSchemas}`);
  lines.push('');

  for (const r of results) {
    lines.push(`  ${c.bold(r.file)}`);
    for (const s of r.schemas) {
      const type = s.type || s['@type'] || 'Unknown';
      const format = s.format || 'JSON-LD';
      lines.push(`    ${c.green('\u2714')} ${c.cyan(type)} ${c.dim(`(${format})`)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
