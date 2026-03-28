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
  'broken-internal-link':      'Fix or remove the broken link — check the href path',

  // Content analysis
  'no-hub-page':               'Create a hub/pillar page linking to all related content pages',
  'orphan-content':            'Add internal links to orphan pages from related content',
  'thin-pages':                'Expand content to 300+ words with relevant, useful information',
  'low-readability':           'Simplify language — shorter sentences, simpler words',
  'high-passive-voice':        'Rewrite passive sentences in active voice',
  'wall-of-text':              'Break paragraphs into 3-4 sentences max',
  'duplicate-content':         'Consolidate duplicate pages or differentiate their content',

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

  // Performance
  'images-no-dimensions':        'Add width/height to <img> tags to prevent CLS (layout shift)',
  'no-font-display-swap':        'Add font-display: swap to @font-face or Google Fonts URL (&display=swap)',
  'excessive-blocking-scripts':  'Add async or defer to <script> tags — only keep critical scripts blocking',
  'large-inline-css':            'Extract large inline <style> blocks to external CSS files for caching',
  'large-inline-js':             'Extract large inline <script> blocks to external JS files with async/defer',
  'no-resource-hints':           'Add <link rel="preload"> for critical assets (LCP image, key fonts)',
  'no-lazy-loading':             'Add loading="lazy" to below-the-fold images',
  'no-fetchpriority':            'Add fetchpriority="high" to the LCP image for faster rendering',
  'mixed-content-risk':          'Change http:// resources to https:// — mixed content is blocked by browsers',
  'no-responsive-images':        'Add srcset and sizes attributes to <img> tags for responsive images',
  'no-modern-image-format':      'Convert images to WebP or AVIF format for smaller file sizes',
  'no-image-sizes':              'Add sizes attribute alongside srcset for proper responsive behavior',

  // Security
  'http-only-links':             'Change http:// links to https:// — HTTP links leak referrer data',
  'mixed-content-scripts':       'Load all scripts over HTTPS — mixed content scripts are blocked',
  'no-csp-meta':                 'Add <meta http-equiv="Content-Security-Policy" content="...">',
  'no-referrer-policy':          'Add <meta name="referrer" content="strict-origin-when-cross-origin">',
  'external-scripts-no-integrity':'Add integrity="sha384-..." and crossorigin to external scripts (SRI)',
  'inline-event-handlers':       'Replace inline onclick/onload with addEventListener in external JS',
  'external-links-no-noopener':  'Add rel="noopener noreferrer" to external links with target="_blank"',
  'iframe-no-sandbox':           'Add sandbox attribute to <iframe> tags for security isolation',

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

  // E-E-A-T
  'no-author-bio':             'Add author bios with name, role, and expertise to content pages',
  'no-credentials':            'Include author credentials (job title, certifications, experience)',
  'no-about-author-link':      'Link to an about/team page to establish authoritativeness',
  'no-review-trust-signals':   'Add testimonials, reviews, or trust badges',
  'no-external-authority-links':'Cite authoritative sources (.edu, .gov, research papers)',
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
// Citability report
// ---------------------------------------------------------------------------

export function formatCitabilityReport(result) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const score = result.scores.citability;
  const { findings } = result;
  const filesScanned = result.files_scanned ?? 1;
  const groups = groupFindings(findings);
  groups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const grade = gradeFor(score);
  const lines = [];

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('AI Citability Score')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${grade.color(` ${score} `)}  ${scoreBar(score)}  ${scoreLabel(score)}`);
  lines.push('');
  lines.push(`  ${c.dim('Files scanned:')} ${filesScanned}    ${c.dim('Findings:')} ${findings.length}`);

  if (result.avgBreakdown) {
    const bd = result.avgBreakdown;
    const dims = [
      ['Statistic Density', bd.statisticDensity],
      ['Front-Loading', bd.frontLoading],
      ['Source Citations', bd.sourceCitations],
      ['Expert Attribution', bd.expertAttribution],
      ['Definition Clarity', bd.definitionClarity],
      ['Schema Completeness', bd.schemaCompleteness],
      ['Content Structure', bd.contentStructure],
    ];

    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('7-Dimension Breakdown')}`);
    lines.push('');

    for (const [name, val] of dims) {
      if (val == null) continue;
      const rounded = Math.round(val);
      lines.push(`  ${pad(name, 24)} ${scoreBar(rounded)}  ${rounded}/100`);
    }
  }

  if (result.pages && result.pages.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Per-Page Scores')}`);
    lines.push('');
    for (const p of result.pages.slice(0, 10)) {
      const file = p.file || p.url || 'unknown';
      const pScore = p.citability ?? p.score ?? 0;
      lines.push(`  ${scoreBar(pScore)}  ${pad(String(pScore), 4)} ${c.dim(file)}`);
    }
    if (result.pages.length > 10) {
      lines.push(`  ${c.dim(`  ... +${result.pages.length - 10} more pages`)}`);
    }
  }

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
      if (hint) lines.push(`              ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 0) lines.push(`              ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (medium.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.yellow('\u25CB Should Fix'))} ${c.dim(`(${medium.length} issues)`)}`);
    lines.push('');
    for (const g of medium) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.bold(g.rule)}${pageCount}`);
      lines.push(`     ${g.message}`);
      if (hint) lines.push(`     ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 1) lines.push(`     ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (low.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.dim('\u2022 Nice to Have')} ${c.dim(`(${low.length} issues)`)}`);
    lines.push('');
    for (const g of low) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.dim(g.rule)}${pageCount}`);
      lines.push(`     ${c.dim(g.message)}`);
      if (hint) lines.push(`     ${c.dim('\u2192 ' + hint)}`);
      lines.push('');
    }
  }

  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  if (critical.length > 0) {
    lines.push(`  ${c.red('1.')} Fix ${c.bold(`${critical.length} critical/high`)} issues first`);
  }
  if (medium.length > 0) {
    const step = critical.length > 0 ? '2.' : '1.';
    lines.push(`  ${c.yellow(step)} Address ${c.bold(`${medium.length} medium`)} issues to improve citability`);
  }
  lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank content .')} to analyze content quality`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Content analysis report
// ---------------------------------------------------------------------------

export function formatContentReport(result) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const { findings } = result;
  const filesScanned = result.files_scanned ?? 1;
  const groups = groupFindings(findings);
  groups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const lines = [];

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Content Analysis')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${c.dim('Files scanned:')} ${filesScanned}    ${c.dim('Findings:')} ${findings.length}`);

  if (result.avgReadability != null) {
    lines.push('');
    lines.push(`  ${c.bold('Average Readability')}`);
    if (result.avgReadability.fleschKincaid != null) {
      lines.push(`  ${c.dim('Flesch-Kincaid Grade:')} ${result.avgReadability.fleschKincaid}`);
    }
    if (result.avgReadability.gunningFog != null) {
      lines.push(`  ${c.dim('Gunning Fog Index:')}   ${result.avgReadability.gunningFog}`);
    }
  }

  if (result.pages && result.pages.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Per-Page Readability')}`);
    lines.push('');
    lines.push(`  ${pad(c.bold('File'), 36)} ${pad(c.bold('FK'), 6)} ${c.bold('Fog')}`);
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    for (const p of result.pages.slice(0, 10)) {
      const file = p.file || p.url || 'unknown';
      const fk = p.fleschKincaid != null ? String(p.fleschKincaid) : '-';
      const fog = p.gunningFog != null ? String(p.gunningFog) : '-';
      lines.push(`  ${pad(c.dim(file), 36)} ${pad(fk, 6)} ${fog}`);
    }
    if (result.pages.length > 10) {
      lines.push(`  ${c.dim(`  ... +${result.pages.length - 10} more pages`)}`);
    }
  }

  if (result.duplicates && result.duplicates.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.yellow('Duplicate Content'))} ${c.dim(`(${result.duplicates.length} pairs)`)}`);
    lines.push('');
    for (const dup of result.duplicates.slice(0, 5)) {
      const similarity = dup.similarity != null ? ` ${c.yellow(`${Math.round(dup.similarity * 100)}%`)}` : '';
      lines.push(`  ${c.yellow('\u25CB')} ${c.dim(dup.fileA || dup.a)} ${c.dim('\u2194')} ${c.dim(dup.fileB || dup.b)}${similarity}`);
    }
    if (result.duplicates.length > 5) {
      lines.push(`  ${c.dim(`  ... +${result.duplicates.length - 5} more pairs`)}`);
    }
  }

  if (result.linkSuggestions && result.linkSuggestions.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Internal Linking Suggestions')} ${c.dim(`(${result.linkSuggestions.length})`)}`);
    lines.push('');
    for (const sug of result.linkSuggestions.slice(0, 5)) {
      lines.push(`  ${c.cyan('\u2192')} ${c.dim(sug.from || sug.source)} ${c.dim('\u2192')} ${c.cyan(sug.to || sug.target)} ${c.dim(sug.reason || '')}`);
    }
    if (result.linkSuggestions.length > 5) {
      lines.push(`  ${c.dim(`  ... +${result.linkSuggestions.length - 5} more suggestions`)}`);
    }
  }

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
      if (hint) lines.push(`              ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 0) lines.push(`              ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (medium.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.yellow('\u25CB Should Fix'))} ${c.dim(`(${medium.length} issues)`)}`);
    lines.push('');
    for (const g of medium) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.bold(g.rule)}${pageCount}`);
      lines.push(`     ${g.message}`);
      if (hint) lines.push(`     ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 1) lines.push(`     ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (low.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.dim('\u2022 Nice to Have')} ${c.dim(`(${low.length} issues)`)}`);
    lines.push('');
    for (const g of low) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.dim(g.rule)}${pageCount}`);
      lines.push(`     ${c.dim(g.message)}`);
      if (hint) lines.push(`     ${c.dim('\u2192 ' + hint)}`);
      lines.push('');
    }
  }

  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  if (critical.length > 0) {
    lines.push(`  ${c.red('1.')} Fix ${c.bold(`${critical.length} critical/high`)} content issues first`);
  }
  if (result.duplicates && result.duplicates.length > 0) {
    lines.push(`  ${c.yellow('\u2192')} Deduplicate or canonicalize ${c.bold(`${result.duplicates.length}`)} similar page pairs`);
  }
  if (result.linkSuggestions && result.linkSuggestions.length > 0) {
    lines.push(`  ${c.cyan('\u2192')} Add ${c.bold(`${result.linkSuggestions.length}`)} internal links to improve crawlability`);
  }
  lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank citability .')} to check AI citation readiness`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Performance report
// ---------------------------------------------------------------------------

export function formatPerfReport(result) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const score = result.scores.performance;
  const { findings, summary } = result;
  const filesScanned = result.files_scanned ?? 1;
  const groups = groupFindings(findings);
  groups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const grade = gradeFor(score);
  const lines = [];

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Performance Audit')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${grade.color(` ${score} `)}  ${scoreBar(score)}  ${scoreLabel(score)}`);
  lines.push('');
  lines.push(`  ${c.dim('Files scanned:')} ${filesScanned}    ${c.dim('Findings:')} ${findings.length}    ${summary.critical > 0 ? c.red(`Critical: ${summary.critical}`) : c.dim(`Critical: ${summary.critical}`)}  ${summary.high > 0 ? c.red(`High: ${summary.high}`) : c.dim(`High: ${summary.high}`)}  ${summary.medium > 0 ? c.yellow(`Medium: ${summary.medium}`) : c.dim(`Medium: ${summary.medium}`)}  ${c.dim(`Low: ${summary.low}`)}`);

  if (result.metrics) {
    const m = result.metrics;
    const metricRows = [
      ['Total Images', m.totalImages],
      ['Inline CSS (KB)', m.inlineCssKB],
      ['Inline JS (KB)', m.inlineJsKB],
      ['Blocking Scripts', m.blockingScripts],
      ['Images w/o Dimensions', m.imagesWithoutDimensions],
      ['Images w/o Lazy Load', m.imagesWithoutLazyLoad],
      ['Unminified CSS Files', m.unminifiedCss],
      ['Unminified JS Files', m.unminifiedJs],
    ].filter(([, v]) => v != null);

    if (metricRows.length > 0) {
      lines.push('');
      lines.push(c.dim('  ' + '\u2500'.repeat(50)));
      lines.push(`  ${c.bold('Metrics')}`);
      lines.push('');
      for (const [label, value] of metricRows) {
        const valStr = typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value);
        lines.push(`  ${pad(c.dim(label), 28)} ${valStr}`);
      }
    }
  }

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
      if (hint) lines.push(`              ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 0) lines.push(`              ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (medium.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.yellow('\u25CB Should Fix'))} ${c.dim(`(${medium.length} issues)`)}`);
    lines.push('');
    for (const g of medium) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.bold(g.rule)}${pageCount}`);
      lines.push(`     ${g.message}`);
      if (hint) lines.push(`     ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 1) lines.push(`     ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (low.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.dim('\u2022 Nice to Have')} ${c.dim(`(${low.length} issues)`)}`);
    lines.push('');
    for (const g of low) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.dim(g.rule)}${pageCount}`);
      lines.push(`     ${c.dim(g.message)}`);
      if (hint) lines.push(`     ${c.dim('\u2192 ' + hint)}`);
      lines.push('');
    }
  }

  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  if (critical.length > 0) {
    lines.push(`  ${c.red('1.')} Fix ${c.bold(`${critical.length} critical/high`)} performance issues first`);
  }
  if (medium.length > 0) {
    const step = critical.length > 0 ? '2.' : '1.';
    lines.push(`  ${c.yellow(step)} Address ${c.bold(`${medium.length} medium`)} issues for faster loading`);
  }
  lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank cwv <url>')} for real-world Core Web Vitals`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Vertical scanner report
// ---------------------------------------------------------------------------

export function formatVerticalReport(result) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const filesScanned = result.files_scanned ?? 1;
  const detectedTypes = result.detected_types || [];
  const lines = [];

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Vertical Scanner')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${c.dim('Files scanned:')} ${filesScanned}`);

  if (detectedTypes.length === 0) {
    lines.push('');
    lines.push(`  ${c.dim('No vertical-specific site types detected.')}`);
    lines.push(`  ${c.dim('This scanner checks for e-commerce and local business patterns.')}`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`  ${c.dim('Detected types:')} ${detectedTypes.map(t => c.cyan(t)).join(', ')}`);

  if (result.ecommerce) {
    const ecom = result.ecommerce;
    const ecomScore = ecom.score ?? 0;
    const ecomGrade = gradeFor(ecomScore);
    const ecomFindings = ecom.findings || [];
    const ecomGroups = groupFindings(ecomFindings);
    ecomGroups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('E-Commerce')}`);
    lines.push('');
    lines.push(`  ${ecomGrade.color(` ${ecomScore} `)}  ${scoreBar(ecomScore)}  ${scoreLabel(ecomScore)}`);

    const eCritical = ecomGroups.filter(g => g.severity === 'critical' || g.severity === 'high');
    const eMedium = ecomGroups.filter(g => g.severity === 'medium');
    const eLow = ecomGroups.filter(g => g.severity === 'low');

    if (eCritical.length > 0) {
      lines.push('');
      lines.push(`  ${c.bold(c.red('\u2718 Must Fix'))} ${c.dim(`(${eCritical.length} issues)`)}`);
      lines.push('');
      for (const g of eCritical) {
        lines.push(`  ${severityBadge(g.severity)}  ${c.bold(g.rule)}`);
        lines.push(`              ${g.message}`);
        lines.push('');
      }
    }
    if (eMedium.length > 0) {
      lines.push(`  ${c.bold(c.yellow('\u25CB Should Fix'))} ${c.dim(`(${eMedium.length} issues)`)}`);
      lines.push('');
      for (const g of eMedium) {
        lines.push(`  ${severityIcon(g.severity)}  ${c.bold(g.rule)}`);
        lines.push(`     ${g.message}`);
        lines.push('');
      }
    }
    if (eLow.length > 0) {
      lines.push(`  ${c.dim('\u2022 Nice to Have')} ${c.dim(`(${eLow.length} issues)`)}`);
      lines.push('');
      for (const g of eLow) {
        lines.push(`  ${severityIcon(g.severity)}  ${c.dim(g.rule)}`);
        lines.push(`     ${c.dim(g.message)}`);
        lines.push('');
      }
    }
  }

  if (result.local) {
    const loc = result.local;
    const locScore = loc.score ?? 0;
    const locGrade = gradeFor(locScore);
    const locFindings = loc.findings || [];
    const locGroups = groupFindings(locFindings);
    locGroups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Local Business')}`);
    lines.push('');
    lines.push(`  ${locGrade.color(` ${locScore} `)}  ${scoreBar(locScore)}  ${scoreLabel(locScore)}`);

    const lCritical = locGroups.filter(g => g.severity === 'critical' || g.severity === 'high');
    const lMedium = locGroups.filter(g => g.severity === 'medium');
    const lLow = locGroups.filter(g => g.severity === 'low');

    if (lCritical.length > 0) {
      lines.push('');
      lines.push(`  ${c.bold(c.red('\u2718 Must Fix'))} ${c.dim(`(${lCritical.length} issues)`)}`);
      lines.push('');
      for (const g of lCritical) {
        lines.push(`  ${severityBadge(g.severity)}  ${c.bold(g.rule)}`);
        lines.push(`              ${g.message}`);
        lines.push('');
      }
    }
    if (lMedium.length > 0) {
      lines.push(`  ${c.bold(c.yellow('\u25CB Should Fix'))} ${c.dim(`(${lMedium.length} issues)`)}`);
      lines.push('');
      for (const g of lMedium) {
        lines.push(`  ${severityIcon(g.severity)}  ${c.bold(g.rule)}`);
        lines.push(`     ${g.message}`);
        lines.push('');
      }
    }
    if (lLow.length > 0) {
      lines.push(`  ${c.dim('\u2022 Nice to Have')} ${c.dim(`(${lLow.length} issues)`)}`);
      lines.push('');
      for (const g of lLow) {
        lines.push(`  ${severityIcon(g.severity)}  ${c.dim(g.rule)}`);
        lines.push(`     ${c.dim(g.message)}`);
        lines.push('');
      }
    }
  }

  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank schema .')} to validate structured data for your vertical`);
  lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank scan .')} for a full SEO audit`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Security report
// ---------------------------------------------------------------------------

export function formatSecurityReport(result) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const score = result.scores.security;
  const { findings, summary } = result;
  const filesScanned = result.files_scanned ?? 1;
  const groups = groupFindings(findings);
  groups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

  const grade = gradeFor(score);
  const lines = [];

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Security Audit')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${grade.color(` ${score} `)}  ${scoreBar(score)}  ${scoreLabel(score)}`);
  lines.push('');
  lines.push(`  ${c.dim('Files scanned:')} ${filesScanned}    ${c.dim('Findings:')} ${findings.length}    ${summary.critical > 0 ? c.red(`Critical: ${summary.critical}`) : c.dim(`Critical: ${summary.critical}`)}  ${summary.high > 0 ? c.red(`High: ${summary.high}`) : c.dim(`High: ${summary.high}`)}  ${summary.medium > 0 ? c.yellow(`Medium: ${summary.medium}`) : c.dim(`Medium: ${summary.medium}`)}  ${c.dim(`Low: ${summary.low}`)}`);

  if (groups.length === 0) {
    lines.push('');
    lines.push(`  ${c.green('\u2714')} ${c.bold(c.green('All checks passed!'))} No security issues found.`);
    lines.push('');
    return lines.join('\n');
  }

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
      if (hint) lines.push(`              ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 0) lines.push(`              ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (medium.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.yellow('\u25CB Should Fix'))} ${c.dim(`(${medium.length} issues)`)}`);
    lines.push('');
    for (const g of medium) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.bold(g.rule)}${pageCount}`);
      lines.push(`     ${g.message}`);
      if (hint) lines.push(`     ${c.cyan('\u2192')} ${c.cyan(hint)}`);
      if (g.files.length > 1) lines.push(`     ${c.dim(formatFileList(g.files))}`);
      lines.push('');
    }
  }

  if (low.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.dim('\u2022 Nice to Have')} ${c.dim(`(${low.length} issues)`)}`);
    lines.push('');
    for (const g of low) {
      const hint = FIX_HINTS[g.rule];
      const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
      lines.push(`  ${severityIcon(g.severity)}  ${c.dim(g.rule)}${pageCount}`);
      lines.push(`     ${c.dim(g.message)}`);
      if (hint) lines.push(`     ${c.dim('\u2192 ' + hint)}`);
      lines.push('');
    }
  }

  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  if (critical.length > 0) {
    lines.push(`  ${c.red('1.')} Fix ${c.bold(`${critical.length} critical/high`)} security issues immediately`);
  }
  if (medium.length > 0) {
    const step = critical.length > 0 ? '2.' : '1.';
    lines.push(`  ${c.yellow(step)} Address ${c.bold(`${medium.length} medium`)} issues to harden your site`);
  }
  lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank scan .')} to check overall SEO health`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Schema report
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Keyword Clustering report
// ---------------------------------------------------------------------------

export function formatKeywordReport(result) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const lines = [];

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Keyword Clustering')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${c.dim('Pages analyzed:')} ${result.summary.totalPages}    ${c.dim('Clusters:')} ${result.summary.totalClusters}    ${c.dim('Gaps:')} ${result.summary.contentGaps}`);
  lines.push('');

  // Primary keywords per page
  if (result.primaryKeywords && result.primaryKeywords.length > 0) {
    lines.push(`  ${c.bold('Primary Keywords')}`);
    lines.push('');
    lines.push(`  ${pad(c.bold('File'), 36)} ${pad(c.bold('Primary Keyword'), 22)} ${c.bold('Score')}`);
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    for (const pk of result.primaryKeywords.slice(0, 15)) {
      const file = pk.file || 'unknown';
      const kw = pk.primaryKeyword || '-';
      const score = pk.score != null ? String(pk.score) : '-';
      lines.push(`  ${pad(c.dim(file), 36)} ${pad(kw, 22)} ${score}`);
    }
    if (result.primaryKeywords.length > 15) {
      lines.push(`  ${c.dim(`  ... +${result.primaryKeywords.length - 15} more pages`)}`);
    }
  }

  // Topic clusters
  if (result.clusters && result.clusters.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.cyan('Topic Clusters'))} ${c.dim(`(${result.clusters.length})`)}`);
    lines.push('');
    for (const cluster of result.clusters.slice(0, 10)) {
      lines.push(`  ${c.cyan('\u25CF')} ${c.bold(cluster.theme)}`);
      lines.push(`    ${c.dim('Keywords:')} ${cluster.keywords.slice(0, 6).join(', ')}`);
      lines.push(`    ${c.dim('Pages:')} ${cluster.pages.join(', ')}`);
      if (cluster.suggestedPillar) {
        lines.push(`    ${c.cyan('\u2192')} ${c.cyan(cluster.suggestedPillar)}`);
      }
      lines.push('');
    }
    if (result.clusters.length > 10) {
      lines.push(`  ${c.dim(`  ... +${result.clusters.length - 10} more clusters`)}`);
    }
  }

  // Keyword cannibalization
  if (result.cannibalization && result.cannibalization.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.red('\u2718 Keyword Cannibalization'))} ${c.dim(`(${result.cannibalization.length} issues)`)}`);
    lines.push('');
    for (const issue of result.cannibalization.slice(0, 10)) {
      lines.push(`  ${c.red('\u25CB')} ${c.bold(issue.keyword)}`);
      lines.push(`    ${c.dim('Competing pages:')} ${issue.pages.join(', ')}`);
      lines.push(`    ${c.yellow('\u2192')} ${c.yellow(issue.recommendation)}`);
      lines.push('');
    }
    if (result.cannibalization.length > 10) {
      lines.push(`  ${c.dim(`  ... +${result.cannibalization.length - 10} more`)}`);
    }
  }

  // Content gaps
  if (result.contentGaps && result.contentGaps.length > 0) {
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold(c.yellow('Content Gaps'))} ${c.dim(`(${result.contentGaps.length} topics need more content)`)}`);
    lines.push('');
    for (const gap of result.contentGaps.slice(0, 10)) {
      lines.push(`  ${c.yellow('\u25CB')} ${c.bold(gap.keyword)} ${c.dim(`(score: ${gap.score})`)}`);
      lines.push(`    ${c.dim('Only on:')} ${gap.currentPage}`);
      lines.push(`    ${c.cyan('\u2192')} ${c.cyan(gap.recommendation)}`);
      lines.push('');
    }
    if (result.contentGaps.length > 10) {
      lines.push(`  ${c.dim(`  ... +${result.contentGaps.length - 10} more gaps`)}`);
    }
  }

  // Next steps
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  if (result.cannibalization && result.cannibalization.length > 0) {
    lines.push(`  ${c.red('1.')} Fix ${c.bold(`${result.cannibalization.length} cannibalization`)} issues — consolidate or differentiate competing pages`);
  }
  if (result.contentGaps && result.contentGaps.length > 0) {
    lines.push(`  ${c.yellow('\u2192')} Fill ${c.bold(`${result.contentGaps.length}`)} content gaps with supporting articles`);
  }
  if (result.clusters && result.clusters.length > 0) {
    lines.push(`  ${c.cyan('\u2192')} Build pillar pages for ${c.bold(`${result.clusters.length}`)} topic clusters`);
  }
  lines.push(`  ${c.cyan('\u2192')} Run ${c.bold('claude-rank content .')} for readability and duplicate analysis`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Content Brief report
// ---------------------------------------------------------------------------

export function formatBriefReport(result) {
  if (result.skipped) {
    return `\n  ${c.yellow('\u26A0')} ${c.bold('Skipped:')} ${result.reason}\n`;
  }

  const lines = [];

  lines.push('');
  lines.push(`  ${c.bold(c.cyan('claude-rank'))} ${c.dim('/')} ${c.bold('Content Brief')}`);
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push('');
  lines.push(`  ${c.bold('Target Keyword:')} ${c.cyan(result.targetKeyword)}`);
  lines.push(`  ${c.dim('Pages scanned:')} ${result.analysis.totalPagesScanned}    ${c.dim('Related pages:')} ${result.analysis.relatedPagesFound}`);

  // Suggested title
  lines.push('');
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Suggested Title (H1)')}`);
  lines.push('');
  lines.push(`  ${c.green(result.suggestedTitle)}`);

  // Word count target
  lines.push('');
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Word Count Target')}`);
  lines.push('');
  lines.push(`  ${c.dim('Target:')} ${c.bold(String(result.targetWordCount))} words ${c.dim(`(avg competitor: ${result.avgCompetitorWordCount})`)}`);

  // Suggested outline
  if (result.suggestedOutline.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Suggested H2 Outline')} ${c.dim(`(${result.suggestedOutline.length} sections)`)}`);
    lines.push('');
    for (let i = 0; i < result.suggestedOutline.length; i++) {
      lines.push(`  ${c.cyan(`${i + 1}.`)} ${result.suggestedOutline[i]}`);
    }
  }

  // Questions to answer
  if (result.questionsToAnswer.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Questions to Answer')} ${c.dim(`(${result.questionsToAnswer.length})`)}`);
    lines.push('');
    for (const q of result.questionsToAnswer) {
      lines.push(`  ${c.yellow('?')} ${q}`);
    }
  }

  // Internal linking opportunities
  if (result.internalLinkingOpportunities.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Internal Linking Opportunities')} ${c.dim(`(${result.internalLinkingOpportunities.length})`)}`);
    lines.push('');
    for (const link of result.internalLinkingOpportunities.slice(0, 8)) {
      const icon = link.direction === 'link-to' ? c.green('\u2192') : c.blue('\u2190');
      const dirLabel = link.direction === 'link-to' ? c.dim('link to') : c.dim('link from');
      lines.push(`  ${icon} ${dirLabel} ${c.bold(link.title || link.file)}`);
      lines.push(`     ${c.dim(link.reason)}`);
    }
    if (result.internalLinkingOpportunities.length > 8) {
      lines.push(`  ${c.dim(`  ... +${result.internalLinkingOpportunities.length - 8} more`)}`);
    }
  }

  // Related keywords
  if (result.relatedKeywords.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Related Keywords')} ${c.dim(`(${result.relatedKeywords.length})`)}`);
    lines.push('');
    const kwLine = result.relatedKeywords.map(k => `${k.word} ${c.dim(`(${k.frequency})`)}`).join('  ');
    lines.push(`  ${kwLine}`);
  }

  // Content gaps
  if (result.contentGaps.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('Content Gaps')} ${c.dim(`(${result.contentGaps.length} topics)`)}`);
    lines.push('');
    for (const gap of result.contentGaps.slice(0, 8)) {
      lines.push(`  ${c.red('\u25CB')} ${gap.topic} ${c.dim(`covered by ${gap.coverageRatio} pages`)}`);
    }
  }

  // GEO optimization tips
  if (result.geoOptimizationTips.length > 0) {
    lines.push('');
    lines.push(c.dim('  ' + '\u2500'.repeat(50)));
    lines.push(`  ${c.bold('GEO Optimization Tips')}`);
    lines.push('');
    for (const tip of result.geoOptimizationTips) {
      const priorityColor = tip.priority === 'high' ? c.red : c.yellow;
      lines.push(`  ${priorityColor('\u2022')} ${c.bold(tip.tip)}`);
      lines.push(`     ${c.dim(tip.reason)}`);
    }
  }

  // Next steps
  lines.push('');
  lines.push(c.dim('  ' + '\u2500'.repeat(50)));
  lines.push(`  ${c.bold('Next Steps')}`);
  lines.push('');
  lines.push(`  ${c.cyan('1.')} Write content following this brief`);
  lines.push(`  ${c.cyan('2.')} Run ${c.bold('claude-rank scan .')} after publishing to verify SEO`);
  lines.push(`  ${c.cyan('3.')} Run ${c.bold('claude-rank citability .')} to check AI citation readiness`);
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

