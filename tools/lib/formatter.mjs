/**
 * formatter.mjs — Premium terminal output for claude-rank CLI reports.
 * Designed for SEO specialists, not developers.
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
  bgMagenta: s => `\x1b[45m\x1b[37m${s}\x1b[0m`,
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
// Box-drawing primitives
// ---------------------------------------------------------------------------

const BOX = {
  h: '\u2500', H: '\u2501',  // light/heavy horizontal
  tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F', // rounded corners
  v: '\u2502',               // vertical
};

function boxTop(width) {
  return c.dim(`  ${BOX.tl}${BOX.h.repeat(width)}${BOX.tr}`);
}
function boxBot(width) {
  return c.dim(`  ${BOX.bl}${BOX.h.repeat(width)}${BOX.br}`);
}
function boxDiv(width) {
  return c.dim(`  ${BOX.v}${BOX.h.repeat(width)}${BOX.v}`);
}
function boxRow(content, width) {
  const vis = stripAnsi(content).length;
  const innerWidth = width - 2; // space for left+right padding
  if (vis > innerWidth) {
    // Truncate visible content to fit — need to handle ANSI codes
    content = truncateAnsi(content, innerWidth - 1) + c.dim('\u2026'); // ellipsis
    const vis2 = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - vis2);
    return c.dim(`  ${BOX.v}`) + ` ${content}` + ' '.repeat(padding) + c.dim(BOX.v);
  }
  const padding = Math.max(0, innerWidth - vis);
  return c.dim(`  ${BOX.v}`) + ` ${content}` + ' '.repeat(padding) + c.dim(BOX.v);
}

/** Truncate a string with ANSI codes to a target visible width */
function truncateAnsi(str, maxVis) {
  let vis = 0;
  let i = 0;
  while (i < str.length && vis < maxVis) {
    if (str[i] === '\x1b') {
      // Skip the entire escape sequence
      const end = str.indexOf('m', i);
      if (end !== -1) { i = end + 1; continue; }
    }
    vis++;
    i++;
  }
  // Include any trailing ANSI reset after the cut point
  return str.slice(0, i) + '\x1b[0m';
}

const W = 66; // standard box width — fits 80-col terminals with margin

// ---------------------------------------------------------------------------
// Human-readable rule names (SEO specialists don't think in kebab-case)
// ---------------------------------------------------------------------------

const DISPLAY_NAMES = {
  // SEO
  'missing-title':             'Missing Page Title',
  'missing-meta-description':  'Missing Meta Description',
  'missing-h1':                'Missing H1 Heading',
  'thin-content':              'Thin Content',
  'missing-viewport':          'Missing Viewport Tag',
  'missing-og-title':          'Missing Open Graph Title',
  'missing-og-description':    'Missing Open Graph Description',
  'missing-og-image':          'Missing Open Graph Image',
  'missing-og-url':            'Missing Open Graph URL',
  'missing-canonical':         'Missing Canonical URL',
  'missing-json-ld':           'Missing Structured Data',
  'missing-favicon':           'Missing Favicon',
  'no-analytics':              'No Analytics Installed',
  'missing-twitter-card':      'Missing Twitter Card',
  'missing-twitter-image':     'Missing Twitter Image',
  'missing-lang':              'Missing Language Attribute',
  'missing-charset':           'Missing Character Encoding',
  'no-manifest':               'Missing Web App Manifest',
  'missing-main-landmark':     'Missing <main> Landmark',
  'missing-nav-landmark':      'Missing <nav> Landmark',
  'missing-footer-landmark':   'Missing <footer> Landmark',
  'images-missing-alt':        'Images Missing Alt Text',
  'images-missing-dimensions': 'Images Missing Dimensions',
  'viewport-not-responsive':   'Non-Responsive Viewport',
  'has-noindex':               'Page Blocked by Noindex',
  'schema-invalid':            'Invalid Structured Data',
  'multiple-h1':               'Multiple H1 Headings',
  'title-too-long':            'Title Too Long (60+ chars)',
  'title-too-short':           'Title Too Short (<20 chars)',
  'all-scripts-blocking':      'All Scripts Render-Blocking',
  'title-content-mismatch':    'Title Doesn\'t Match Content',
  'meta-content-mismatch':     'Meta Description Doesn\'t Match Content',
  'duplicate-title':           'Duplicate Page Title',
  'duplicate-meta-description':'Duplicate Meta Description',
  'broken-internal-link':      'Broken Internal Link',
  // Content
  'no-hub-page':               'No Hub/Pillar Page',
  'orphan-content':            'Orphan Page (No Internal Links)',
  'thin-pages':                'Pages with Thin Content',
  'low-readability':           'Hard to Read',
  'high-passive-voice':        'Too Much Passive Voice',
  'wall-of-text':              'Wall of Text (No Breaks)',
  'duplicate-content':         'Duplicate Content Detected',
  // GEO
  'missing-robots-txt':        'Missing robots.txt',
  'missing-sitemap':           'Missing Sitemap',
  'missing-llms-txt':          'Missing llms.txt',
  'bot-blocked':               'AI Bots Blocked',
  'no-ai-bot-rules':           'No AI Bot Rules in robots.txt',
  'missing-org-schema':        'Missing Organization Schema',
  'missing-author-schema':     'Missing Author Attribution',
  'thin-content-ai':           'Too Thin for AI Citation',
  'no-question-headers':       'No Question-Style Headings',
  'no-definition-patterns':    'No Clear Definitions',
  'no-data-tables':            'No Data Tables',
  'content-not-citation-ready':'Content Not Citation-Ready',
  'no-direct-answer':          'No Direct Answer in Opening',
  'no-statistics':             'No Statistics or Data Points',
  // Performance
  'images-no-dimensions':      'Images Cause Layout Shift (CLS)',
  'no-font-display-swap':      'Fonts Block Page Render',
  'excessive-blocking-scripts':'Too Many Blocking Scripts',
  'large-inline-css':          'Large Inline CSS (Uncacheable)',
  'large-inline-js':           'Large Inline JS (Uncacheable)',
  'no-resource-hints':         'No Resource Preloading',
  'no-lazy-loading':           'Images Not Lazy-Loaded',
  'no-fetchpriority':          'LCP Image Not Prioritized',
  'mixed-content-risk':        'Mixed Content (HTTP on HTTPS)',
  'no-responsive-images':      'No Responsive Images',
  'no-modern-image-format':    'No Modern Image Formats',
  'no-image-sizes':            'Missing Image Sizes Attribute',
  'no-mobile-viewport':        'No Mobile Viewport',
  'small-tap-targets':         'Tap Targets Too Small',
  'small-font-size':           'Font Size Too Small for Mobile',
  'fixed-width-elements':      'Fixed-Width Elements (Overflow)',
  // Security
  'http-only-links':           'Insecure HTTP Links',
  'mixed-content-scripts':     'Mixed Content Scripts',
  'no-csp-meta':               'No Content Security Policy',
  'no-referrer-policy':        'No Referrer Policy',
  'external-scripts-no-integrity': 'External Scripts Without SRI',
  'inline-event-handlers':     'Inline Event Handlers',
  'external-links-no-noopener':'External Links Missing rel=noopener',
  'iframe-no-sandbox':         'Iframes Without Sandbox',
  // AEO
  'missing-faq-schema':        'Missing FAQ Schema',
  'missing-howto-schema':      'Missing HowTo Schema',
  'missing-speakable-schema':  'Missing Speakable Schema',
  'no-snippet-answers':        'No Featured Snippet Answers',
  'missing-content-schema':    'Missing Article/WebPage Schema',
  'missing-llms-txt-aeo':      'Missing llms.txt (Answer Engines)',
  'answers-too-long':          'Answers Too Long for Snippets',
  'no-numbered-steps':         'No Numbered Steps/Lists',
  'no-voice-friendly-content': 'Not Voice-Search Friendly',
  'no-paa-patterns':           'No "People Also Ask" Patterns',
  // E-E-A-T
  'no-author-bio':             'No Author Bio',
  'no-credentials':            'No Author Credentials',
  'no-about-author-link':      'No Link to About/Team Page',
  'no-review-trust-signals':   'No Trust Signals (Reviews, Badges)',
  'no-external-authority-links':'No Citations to Authority Sources',
};

/** Get human-readable name for a rule, fallback to title-cased ID */
function displayName(rule) {
  if (DISPLAY_NAMES[rule]) return DISPLAY_NAMES[rule];
  return rule.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

function scoreBar(score, width = 20) {
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

/** Colored severity pill — compact and scannable */
function severityPill(severity) {
  switch (severity) {
    case 'critical': return c.bgRed(' CRITICAL ');
    case 'high':     return c.bgRed('  HIGH  ');
    case 'medium':   return c.bgYellow(' MEDIUM ');
    case 'low':      return c.dim('  LOW  ');
    default:         return c.dim(`  ${severity.toUpperCase()}  `);
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
// Premium report header — used by all scanner reports
// ---------------------------------------------------------------------------

function premiumHeader(title, subtitle) {
  const lines = [];
  lines.push('');
  lines.push(boxTop(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold(c.cyan('claude-rank'))}  ${c.dim(BOX.v)}  ${c.bold(title)}`, W));
  if (subtitle) {
    lines.push(boxRow(`  ${c.dim(subtitle)}`, W));
  }
  lines.push(boxRow('', W));
  return lines;
}

function premiumScore(lines, score, filesScanned, summary) {
  const grade = gradeFor(score);
  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${grade.color(` ${grade.letter} `)}  ${c.bold(String(score))} / 100   ${scoreBar(score)}   ${scoreLabel(score)}`, W));
  lines.push(boxRow('', W));

  // Summary counts on clean separate lines
  const counts = [];
  if (summary.critical > 0) counts.push(c.red(`${summary.critical} critical`));
  if (summary.high > 0) counts.push(c.red(`${summary.high} high`));
  if (summary.medium > 0) counts.push(c.yellow(`${summary.medium} medium`));
  if (summary.low > 0) counts.push(c.dim(`${summary.low} low`));

  lines.push(boxRow(`  ${c.dim('Pages scanned:')} ${c.bold(String(filesScanned))}`, W));
  if (counts.length > 0) {
    lines.push(boxRow(`  ${c.dim('Issues found:')}  ${counts.join(c.dim('  \u2022  '))}`, W));
  } else {
    lines.push(boxRow(`  ${c.dim('Issues found:')}  ${c.green('None')}`, W));
  }
  lines.push(boxRow('', W));
}

/**
 * Render findings in detail — used for Must Fix (critical/high).
 * Shows severity pill, human name, message, fix hint, affected files, rule ID.
 */
function premiumFindingsDetailed(lines, groups, sectionTitle, sectionColor) {
  if (groups.length === 0) return;

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold(sectionColor(sectionTitle))} ${c.dim(`(${groups.length})`)}`, W));
  lines.push(boxRow('', W));

  for (const g of groups) {
    const name = displayName(g.rule);
    const pill = severityPill(g.severity);
    const pageCount = g.files.length > 1 ? c.dim(` \u00B7 ${g.files.length} pages`) : '';
    lines.push(boxRow(`  ${pill}  ${c.bold(name)}${pageCount}`, W));
    lines.push(boxRow(`           ${g.message}`, W));
    const hint = FIX_HINTS[g.rule];
    if (hint) {
      lines.push(boxRow(`           ${c.cyan('\u2192')} ${c.cyan(hint)}`, W));
    }
    if (g.files.length > 0 && g.files.length <= 3) {
      lines.push(boxRow(`           ${c.dim(formatFileList(g.files))}`, W));
    }
    lines.push(boxRow(`           ${c.dim(`rule: ${g.rule}`)}`, W));
    lines.push(boxRow('', W));
  }
}

/**
 * Render findings as compact one-liners — used for Should Fix (medium).
 * Shows severity icon + human name + page count on a single line.
 */
function premiumFindingsCompact(lines, groups, sectionTitle, sectionColor) {
  if (groups.length === 0) return;

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold(sectionColor(sectionTitle))} ${c.dim(`(${groups.length})`)}`, W));
  lines.push(boxRow('', W));

  for (const g of groups) {
    const name = displayName(g.rule);
    const icon = severityIcon(g.severity);
    const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length} pages)`) : '';
    const hint = FIX_HINTS[g.rule];
    lines.push(boxRow(`  ${icon}  ${name}${pageCount}`, W));
    if (hint) {
      lines.push(boxRow(`     ${c.dim('\u2192 ' + hint)}`, W));
    }
  }
  lines.push(boxRow('', W));
}

/**
 * Render findings as a count-only summary — used for Nice to Have (low).
 * Just shows the count and lists issue names inline.
 */
function premiumFindingsSummary(lines, groups, sectionTitle, sectionColor) {
  if (groups.length === 0) return;

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold(sectionColor(sectionTitle))} ${c.dim(`(${groups.length})`)}`, W));
  lines.push(boxRow('', W));

  // List just the names, no details
  for (const g of groups) {
    const name = displayName(g.rule);
    const pageCount = g.files.length > 1 ? c.dim(` (${g.files.length})`) : '';
    lines.push(boxRow(`  ${c.dim('\u2022')}  ${c.dim(name)}${pageCount}`, W));
  }
  lines.push(boxRow('', W));
}

/** Backward-compat wrapper — routes to the right detail level */
function premiumFindings(lines, groups, sectionTitle, sectionColor) {
  if (groups.length === 0) return;
  // Detect which tier by the title
  if (sectionTitle.includes('Must Fix')) {
    premiumFindingsDetailed(lines, groups, sectionTitle, sectionColor);
  } else if (sectionTitle.includes('Should Fix')) {
    premiumFindingsCompact(lines, groups, sectionTitle, sectionColor);
  } else {
    premiumFindingsSummary(lines, groups, sectionTitle, sectionColor);
  }
}

function premiumNextSteps(lines, steps) {
  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold('What to Do Next')}`, W));
  lines.push(boxRow('', W));
  for (let i = 0; i < steps.length; i++) {
    lines.push(boxRow(`  ${c.cyan(`${i + 1}.`)} ${steps[i]}`, W));
  }
  lines.push(boxRow('', W));
  lines.push(boxBot(W));
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

  const lines = premiumHeader(title);
  premiumScore(lines, score, filesScanned, summary);

  // ── No findings ─────────────────────────────────────────
  if (groups.length === 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.green('\u2714')} ${c.bold(c.green('All checks passed!'))} No issues found.`, W));
    lines.push(boxRow('', W));
    lines.push(boxBot(W));
    lines.push('');
    return lines.join('\n');
  }

  // ── Grouped findings ────────────────────────────────────
  const critical = groups.filter(g => g.severity === 'critical' || g.severity === 'high');
  const medium = groups.filter(g => g.severity === 'medium');
  const low = groups.filter(g => g.severity === 'low');

  premiumFindings(lines, critical, '\u2718 Must Fix', c.red);
  premiumFindings(lines, medium, '\u25CB Should Fix', c.yellow);
  premiumFindings(lines, low, '\u2022 Nice to Have', s => c.dim(s));

  // ── Next steps ──────────────────────────────────────────
  const steps = [];
  if (critical.length > 0) {
    steps.push(`Fix ${c.bold(`${critical.length} critical/high`)} issues first — biggest ranking impact`);
  }
  if (medium.length > 0) {
    steps.push(`Address ${c.bold(`${medium.length} medium`)} issues for a solid foundation`);
  }
  if (scannerType === 'seo') {
    steps.push(`Run ${c.bold('claude-rank geo .')} to check AI search readiness`);
    steps.push(`Run ${c.bold('claude-rank compete <url> .')} to compare vs competitors`);
  } else if (scannerType === 'geo') {
    steps.push(`Run ${c.bold('claude-rank aeo .')} to optimize for featured snippets`);
  } else if (scannerType === 'aeo') {
    steps.push(`Run ${c.bold('/claude-rank:rank-fix')} to auto-fix all findings`);
  }
  premiumNextSteps(lines, steps);
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

  const { youWins, themWins, ties } = result.summary;
  const lines = premiumHeader('Competitive X-Ray', 'Head-to-head SEO signal comparison');

  // ── Matchup ─────────────────────────────────────────────
  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold('You:')}   ${result.you.title || result.you.directory}`, W));
  lines.push(boxRow(`  ${c.bold('Them:')}  ${result.competitor.title || result.competitor.url}`, W));
  lines.push(boxRow('', W));
  const youColor = youWins >= themWins ? c.green : c.red;
  const themColor = themWins >= youWins ? c.red : c.green;
  lines.push(boxRow(`  ${youColor(`You ${youWins}`)}  ${c.dim('vs')}  ${themColor(`Them ${themWins}`)}  ${c.dim(`(${ties} ties)`)}`, W));
  lines.push(boxRow(`  ${c.bold(result.headline)}`, W));
  lines.push(boxRow('', W));

  // ── Signal comparison table ─────────────────────────────
  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${pad(c.bold('Signal'), 24)} ${pad(c.bold('You'), 10)} ${pad(c.bold('Them'), 10)} ${c.bold('Result')}`, W));
  lines.push(boxRow(`  ${c.dim(BOX.h.repeat(52))}`, W));

  for (const v of result.verdicts) {
    const icon = v.winner === 'you'  ? c.green('\u2714') :
                 v.winner === 'them' ? c.red('\u2718') :
                 c.dim('\u2500');
    const label = v.winner === 'you'  ? c.green('You') :
                  v.winner === 'them' ? c.red('Them') :
                  c.dim('Tie');
    lines.push(boxRow(`  ${pad(v.area, 22)} ${pad(String(v.you), 8)} ${pad(String(v.them), 8)} ${icon} ${label}`, W));
  }
  lines.push(boxRow('', W));

  // ── Tech stack ──────────────────────────────────────────
  if (result.competitor.techStack.length > 0 || result.you.techStack.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Tech Stack')}`, W));
    lines.push(boxRow('', W));
    if (result.you.techStack.length > 0) {
      for (const t of result.you.techStack) {
        lines.push(boxRow(`  ${c.green('\u2022')} ${t.tech} ${c.dim(`(${t.category})`)}`, W));
      }
    } else {
      lines.push(boxRow(`  ${c.dim('No technologies detected in your project')}`, W));
    }
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Competitor:')}`, W));
    if (result.competitor.techStack.length > 0) {
      for (const t of result.competitor.techStack) {
        lines.push(boxRow(`  ${c.red('\u2022')} ${t.tech} ${c.dim(`(${t.category})`)}`, W));
      }
    } else {
      lines.push(boxRow(`  ${c.dim('No technologies detected')}`, W));
    }
    lines.push(boxRow('', W));
  }

  // ── Conversion signals ──────────────────────────────────
  if (result.competitor.conversionSignals.length > 0 || result.you.conversionSignals.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Conversion Signals')}`, W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.green('You:')}  ${result.you.conversionSignals.length > 0 ? result.you.conversionSignals.join(' \u2022 ') : c.dim('None detected')}`, W));
    lines.push(boxRow(`  ${c.red('Them:')} ${result.competitor.conversionSignals.length > 0 ? result.competitor.conversionSignals.join(' \u2022 ') : c.dim('None detected')}`, W));
    lines.push(boxRow('', W));
  }

  // ── Gaps to close ───────────────────────────────────────
  if (result.summary.theirAdvantages.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold(c.yellow('Gaps to Close'))}`, W));
    lines.push(boxRow('', W));
    for (const gap of result.summary.theirAdvantages) {
      lines.push(boxRow(`  ${c.yellow('\u2192')} ${gap}`, W));
    }
    lines.push(boxRow('', W));
  }

  // ── Your advantages ─────────────────────────────────────
  if (result.summary.yourAdvantages.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold(c.green('Your Advantages'))}`, W));
    lines.push(boxRow('', W));
    for (const adv of result.summary.yourAdvantages) {
      lines.push(boxRow(`  ${c.green('\u2714')} ${adv}`, W));
    }
    lines.push(boxRow('', W));
  }

  lines.push(boxBot(W));
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
  const lines = premiumHeader('AI Citability Score', 'How likely AI models are to cite your content');

  // ── Score ───────────────────────────────────────────────
  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${grade.color(` ${grade.letter} `)}  ${c.bold(String(score))} / 100   ${scoreBar(score)}   ${scoreLabel(score)}`, W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.dim('Pages scanned:')} ${c.bold(String(filesScanned))}    ${c.dim('Findings:')} ${findings.length}`, W));
  lines.push(boxRow('', W));

  // ── 7-Dimension Breakdown ──────────────────────────────
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

    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('7-Dimension Breakdown')}`, W));
    lines.push(boxRow('', W));

    for (const [name, val] of dims) {
      if (val == null) continue;
      const rounded = Math.round(val);
      lines.push(boxRow(`  ${pad(name, 24)} ${scoreBar(rounded, 16)}  ${rounded}/100`, W));
    }
    lines.push(boxRow('', W));
  }

  // ── Per-Page Scores ─────────────────────────────────────
  if (result.pages && result.pages.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Per-Page Scores')}`, W));
    lines.push(boxRow('', W));
    for (const p of result.pages.slice(0, 10)) {
      const file = p.file || p.url || 'unknown';
      const pScore = p.citability ?? p.score ?? 0;
      lines.push(boxRow(`  ${scoreBar(pScore, 12)}  ${pad(String(pScore), 4)} ${c.dim(file)}`, W));
    }
    if (result.pages.length > 10) {
      lines.push(boxRow(`  ${c.dim(`... +${result.pages.length - 10} more pages`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  // ── Findings ────────────────────────────────────────────
  const critical = groups.filter(g => g.severity === 'critical' || g.severity === 'high');
  const medium = groups.filter(g => g.severity === 'medium');
  const low = groups.filter(g => g.severity === 'low');

  premiumFindings(lines, critical, '\u2718 Must Fix', c.red);
  premiumFindings(lines, medium, '\u25CB Should Fix', c.yellow);
  premiumFindings(lines, low, '\u2022 Nice to Have', s => c.dim(s));

  // ── Next steps ──────────────────────────────────────────
  const steps = [];
  if (critical.length > 0) steps.push(`Fix ${c.bold(`${critical.length} critical/high`)} issues first`);
  if (medium.length > 0) steps.push(`Address ${c.bold(`${medium.length} medium`)} issues to improve citability`);
  steps.push(`Run ${c.bold('claude-rank content .')} to analyze content quality`);
  premiumNextSteps(lines, steps);
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

  const lines = premiumHeader('Content Analysis', 'Readability, duplicates, and internal linking');

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.dim('Pages scanned:')} ${c.bold(String(filesScanned))}    ${c.dim('Findings:')} ${findings.length}`, W));

  if (result.avgReadability != null) {
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Average Readability')}`, W));
    if (result.avgReadability.fleschKincaid != null) {
      lines.push(boxRow(`  ${c.dim('Flesch-Kincaid Grade:')} ${result.avgReadability.fleschKincaid}`, W));
    }
    if (result.avgReadability.gunningFog != null) {
      lines.push(boxRow(`  ${c.dim('Gunning Fog Index:')}   ${result.avgReadability.gunningFog}`, W));
    }
  }
  lines.push(boxRow('', W));

  if (result.pages && result.pages.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Per-Page Readability')}`, W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${pad(c.bold('File'), 32)} ${pad(c.bold('FK'), 6)} ${c.bold('Fog')}`, W));
    lines.push(boxRow(`  ${c.dim(BOX.h.repeat(46))}`, W));
    for (const p of result.pages.slice(0, 10)) {
      const file = p.file || p.url || 'unknown';
      const fk = p.readability?.fleschKincaid != null ? String(p.readability.fleschKincaid) : '-';
      const fog = p.readability?.gunningFog != null ? String(p.readability.gunningFog) : '-';
      lines.push(boxRow(`  ${pad(c.dim(file), 32)} ${pad(fk, 6)} ${fog}`, W));
    }
    if (result.pages.length > 10) {
      lines.push(boxRow(`  ${c.dim(`... +${result.pages.length - 10} more pages`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  if (result.duplicates && result.duplicates.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold(c.yellow('Duplicate Content'))} ${c.dim(`(${result.duplicates.length} pairs)`)}`, W));
    lines.push(boxRow('', W));
    for (const dup of result.duplicates.slice(0, 5)) {
      const similarity = dup.similarity != null ? ` ${c.yellow(`${Math.round(dup.similarity * 100)}%`)}` : '';
      lines.push(boxRow(`  ${c.yellow('\u25CB')} ${c.dim(dup.fileA || dup.a)} ${c.dim('\u2194')} ${c.dim(dup.fileB || dup.b)}${similarity}`, W));
    }
    if (result.duplicates.length > 5) {
      lines.push(boxRow(`  ${c.dim(`... +${result.duplicates.length - 5} more pairs`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  if (result.linkSuggestions && result.linkSuggestions.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Internal Linking Suggestions')} ${c.dim(`(${result.linkSuggestions.length})`)}`, W));
    lines.push(boxRow('', W));
    for (const sug of result.linkSuggestions.slice(0, 5)) {
      lines.push(boxRow(`  ${c.cyan('\u2192')} ${c.bold(sug.topic)} ${c.dim(`(${sug.pages.join(', ')})`)}`, W));
    }
    if (result.linkSuggestions.length > 5) {
      lines.push(boxRow(`  ${c.dim(`... +${result.linkSuggestions.length - 5} more suggestions`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  const critical = groups.filter(g => g.severity === 'critical' || g.severity === 'high');
  const medium = groups.filter(g => g.severity === 'medium');
  const low = groups.filter(g => g.severity === 'low');

  premiumFindings(lines, critical, '\u2718 Must Fix', c.red);
  premiumFindings(lines, medium, '\u25CB Should Fix', c.yellow);
  premiumFindings(lines, low, '\u2022 Nice to Have', s => c.dim(s));

  const steps = [];
  if (critical.length > 0) steps.push(`Fix ${c.bold(`${critical.length} critical/high`)} content issues first`);
  if (result.duplicates && result.duplicates.length > 0) steps.push(`Deduplicate or canonicalize ${c.bold(`${result.duplicates.length}`)} similar page pairs`);
  if (result.linkSuggestions && result.linkSuggestions.length > 0) steps.push(`Add ${c.bold(`${result.linkSuggestions.length}`)} internal links to improve crawlability`);
  steps.push(`Run ${c.bold('claude-rank citability .')} to check AI citation readiness`);
  premiumNextSteps(lines, steps);
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

  const lines = premiumHeader('Performance + Mobile', 'Page speed, CLS risks, and mobile-first indexing');
  premiumScore(lines, score, filesScanned, summary);

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
      lines.push(boxDiv(W));
      lines.push(boxRow('', W));
      lines.push(boxRow(`  ${c.bold('Metrics')}`, W));
      lines.push(boxRow('', W));
      for (const [label, value] of metricRows) {
        const valStr = typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value);
        lines.push(boxRow(`  ${pad(c.dim(label), 28)} ${valStr}`, W));
      }
      lines.push(boxRow('', W));
    }
  }

  const critical = groups.filter(g => g.severity === 'critical' || g.severity === 'high');
  const medium = groups.filter(g => g.severity === 'medium');
  const low = groups.filter(g => g.severity === 'low');

  premiumFindings(lines, critical, '\u2718 Must Fix', c.red);
  premiumFindings(lines, medium, '\u25CB Should Fix', c.yellow);
  premiumFindings(lines, low, '\u2022 Nice to Have', s => c.dim(s));

  const steps = [];
  if (critical.length > 0) steps.push(`Fix ${c.bold(`${critical.length} critical/high`)} performance issues first`);
  if (medium.length > 0) steps.push(`Address ${c.bold(`${medium.length} medium`)} issues for faster loading`);
  steps.push(`Run ${c.bold('claude-rank cwv <url>')} for real-world Core Web Vitals`);
  premiumNextSteps(lines, steps);
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
  const lines = premiumHeader('Vertical SEO', 'Industry-specific schema and optimization');

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.dim('Pages scanned:')} ${c.bold(String(filesScanned))}`, W));

  if (detectedTypes.length === 0) {
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.dim('No vertical-specific site types detected.')}`, W));
    lines.push(boxRow(`  ${c.dim('Checks for e-commerce and local business patterns.')}`, W));
    lines.push(boxRow('', W));
    lines.push(boxBot(W));
    lines.push('');
    return lines.join('\n');
  }

  lines.push(boxRow(`  ${c.dim('Detected:')} ${detectedTypes.map(t => c.cyan(t)).join(', ')}`, W));
  lines.push(boxRow('', W));

  // Helper to render a vertical sub-section
  const renderVertical = (label, data) => {
    if (!data) return;
    const vScore = data.score ?? 0;
    const vGrade = gradeFor(vScore);
    const vFindings = data.findings || [];
    const vGroups = groupFindings(vFindings);
    vGroups.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));

    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold(label)}`, W));
    lines.push(boxRow(`  ${vGrade.color(` ${vGrade.letter} `)}  ${c.bold(String(vScore))} / 100   ${scoreBar(vScore)}   ${scoreLabel(vScore)}`, W));
    lines.push(boxRow('', W));

    const vCritical = vGroups.filter(g => g.severity === 'critical' || g.severity === 'high');
    const vMedium = vGroups.filter(g => g.severity === 'medium');
    const vLow = vGroups.filter(g => g.severity === 'low');

    premiumFindings(lines, vCritical, '\u2718 Must Fix', c.red);
    premiumFindings(lines, vMedium, '\u25CB Should Fix', c.yellow);
    premiumFindings(lines, vLow, '\u2022 Nice to Have', s => c.dim(s));
  };

  renderVertical('E-Commerce', result.ecommerce);
  renderVertical('Local Business', result.local);

  premiumNextSteps(lines, [
    `Run ${c.bold('claude-rank schema .')} to validate structured data for your vertical`,
    `Run ${c.bold('claude-rank scan .')} for a full SEO audit`,
  ]);
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

  const lines = premiumHeader('Security Audit', 'HTTPS, CSP, SRI, and browser security headers');
  premiumScore(lines, score, filesScanned, summary);

  if (groups.length === 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.green('\u2714')} ${c.bold(c.green('All checks passed!'))} No security issues found.`, W));
    lines.push(boxRow('', W));
    lines.push(boxBot(W));
    lines.push('');
    return lines.join('\n');
  }

  const critical = groups.filter(g => g.severity === 'critical' || g.severity === 'high');
  const medium = groups.filter(g => g.severity === 'medium');
  const low = groups.filter(g => g.severity === 'low');

  premiumFindings(lines, critical, '\u2718 Must Fix', c.red);
  premiumFindings(lines, medium, '\u25CB Should Fix', c.yellow);
  premiumFindings(lines, low, '\u2022 Nice to Have', s => c.dim(s));

  const steps = [];
  if (critical.length > 0) steps.push(`Fix ${c.bold(`${critical.length} critical/high`)} security issues immediately`);
  if (medium.length > 0) steps.push(`Address ${c.bold(`${medium.length} medium`)} issues to harden your site`);
  steps.push(`Run ${c.bold('claude-rank scan .')} to check overall SEO health`);
  premiumNextSteps(lines, steps);
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

  const lines = premiumHeader('Keyword Clustering', 'Topic clusters, cannibalization, and content gaps');

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.dim('Pages analyzed:')} ${c.bold(String(result.summary.totalPages))}    ${c.dim('Clusters:')} ${c.bold(String(result.summary.totalClusters))}    ${c.dim('Gaps:')} ${c.bold(String(result.summary.contentGaps))}`, W));
  lines.push(boxRow('', W));

  // Primary keywords per page
  if (result.primaryKeywords && result.primaryKeywords.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Primary Keywords')}`, W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${pad(c.bold('File'), 30)} ${pad(c.bold('Primary Keyword'), 20)} ${c.bold('Score')}`, W));
    lines.push(boxRow(`  ${c.dim(BOX.h.repeat(52))}`, W));
    for (const pk of result.primaryKeywords.slice(0, 15)) {
      const file = pk.file || 'unknown';
      const kw = pk.primaryKeyword || '-';
      const score = pk.score != null ? String(pk.score) : '-';
      lines.push(boxRow(`  ${pad(c.dim(file), 30)} ${pad(kw, 20)} ${score}`, W));
    }
    if (result.primaryKeywords.length > 15) {
      lines.push(boxRow(`  ${c.dim(`... +${result.primaryKeywords.length - 15} more pages`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  // Topic clusters
  if (result.clusters && result.clusters.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold(c.cyan('Topic Clusters'))} ${c.dim(`(${result.clusters.length})`)}`, W));
    lines.push(boxRow('', W));
    for (const cluster of result.clusters.slice(0, 10)) {
      lines.push(boxRow(`  ${c.cyan('\u25CF')} ${c.bold(cluster.theme)}`, W));
      lines.push(boxRow(`    ${c.dim('Keywords:')} ${cluster.keywords.slice(0, 6).join(', ')}`, W));
      lines.push(boxRow(`    ${c.dim('Pages:')} ${cluster.pages.join(', ')}`, W));
      if (cluster.suggestedPillar) {
        lines.push(boxRow(`    ${c.cyan('\u2192')} ${c.cyan(cluster.suggestedPillar)}`, W));
      }
      lines.push(boxRow('', W));
    }
    if (result.clusters.length > 10) {
      lines.push(boxRow(`  ${c.dim(`... +${result.clusters.length - 10} more clusters`)}`, W));
      lines.push(boxRow('', W));
    }
  }

  // Keyword cannibalization
  if (result.cannibalization && result.cannibalization.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold(c.red('\u2718 Keyword Cannibalization'))} ${c.dim(`(${result.cannibalization.length})`)}`, W));
    lines.push(boxRow('', W));
    for (const issue of result.cannibalization.slice(0, 10)) {
      lines.push(boxRow(`  ${c.red('\u25CB')} ${c.bold(issue.keyword)}`, W));
      lines.push(boxRow(`    ${c.dim('Competing pages:')} ${issue.pages.join(', ')}`, W));
      lines.push(boxRow(`    ${c.yellow('\u2192')} ${c.yellow(issue.recommendation)}`, W));
      lines.push(boxRow('', W));
    }
    if (result.cannibalization.length > 10) {
      lines.push(boxRow(`  ${c.dim(`... +${result.cannibalization.length - 10} more`)}`, W));
      lines.push(boxRow('', W));
    }
  }

  // Content gaps
  if (result.contentGaps && result.contentGaps.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold(c.yellow('Content Gaps'))} ${c.dim(`(${result.contentGaps.length} topics need content)`)}`, W));
    lines.push(boxRow('', W));
    for (const gap of result.contentGaps.slice(0, 10)) {
      lines.push(boxRow(`  ${c.yellow('\u25CB')} ${c.bold(gap.keyword)} ${c.dim(`(score: ${gap.score})`)}`, W));
      lines.push(boxRow(`    ${c.dim('Only on:')} ${gap.currentPage}`, W));
      lines.push(boxRow(`    ${c.cyan('\u2192')} ${c.cyan(gap.recommendation)}`, W));
      lines.push(boxRow('', W));
    }
    if (result.contentGaps.length > 10) {
      lines.push(boxRow(`  ${c.dim(`... +${result.contentGaps.length - 10} more gaps`)}`, W));
      lines.push(boxRow('', W));
    }
  }

  const steps = [];
  if (result.cannibalization && result.cannibalization.length > 0) steps.push(`Fix ${c.bold(`${result.cannibalization.length} cannibalization`)} issues — consolidate or differentiate pages`);
  if (result.contentGaps && result.contentGaps.length > 0) steps.push(`Fill ${c.bold(`${result.contentGaps.length}`)} content gaps with supporting articles`);
  if (result.clusters && result.clusters.length > 0) steps.push(`Build pillar pages for ${c.bold(`${result.clusters.length}`)} topic clusters`);
  steps.push(`Run ${c.bold('claude-rank content .')} for readability and duplicate analysis`);
  premiumNextSteps(lines, steps);
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

  const lines = premiumHeader('Content Brief', `Keyword: ${result.targetKeyword}`);

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold('Target Keyword:')} ${c.cyan(result.targetKeyword)}`, W));
  lines.push(boxRow(`  ${c.dim('Pages scanned:')} ${result.analysis.totalPagesScanned}    ${c.dim('Related pages:')} ${result.analysis.relatedPagesFound}`, W));
  lines.push(boxRow('', W));

  // Suggested title
  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold('Suggested Title (H1)')}`, W));
  lines.push(boxRow(`  ${c.green(result.suggestedTitle)}`, W));
  lines.push(boxRow('', W));

  // Word count target
  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.bold('Word Count Target')}`, W));
  lines.push(boxRow(`  ${c.bold(String(result.targetWordCount))} words ${c.dim(`(avg competitor: ${result.avgCompetitorWordCount})`)}`, W));
  lines.push(boxRow('', W));

  // Suggested outline
  if (result.suggestedOutline.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Suggested H2 Outline')} ${c.dim(`(${result.suggestedOutline.length} sections)`)}`, W));
    lines.push(boxRow('', W));
    for (let i = 0; i < result.suggestedOutline.length; i++) {
      lines.push(boxRow(`  ${c.cyan(`${i + 1}.`)} ${result.suggestedOutline[i]}`, W));
    }
    lines.push(boxRow('', W));
  }

  // Questions to answer
  if (result.questionsToAnswer.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Questions to Answer')} ${c.dim(`(${result.questionsToAnswer.length})`)}`, W));
    lines.push(boxRow('', W));
    for (const q of result.questionsToAnswer) {
      lines.push(boxRow(`  ${c.yellow('?')} ${q}`, W));
    }
    lines.push(boxRow('', W));
  }

  // Internal linking opportunities
  if (result.internalLinkingOpportunities.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Internal Linking Opportunities')} ${c.dim(`(${result.internalLinkingOpportunities.length})`)}`, W));
    lines.push(boxRow('', W));
    for (const link of result.internalLinkingOpportunities.slice(0, 8)) {
      const icon = link.direction === 'link-to' ? c.green('\u2192') : c.blue('\u2190');
      const dirLabel = link.direction === 'link-to' ? c.dim('link to') : c.dim('link from');
      lines.push(boxRow(`  ${icon} ${dirLabel} ${c.bold(link.title || link.file)}`, W));
      lines.push(boxRow(`     ${c.dim(link.reason)}`, W));
    }
    if (result.internalLinkingOpportunities.length > 8) {
      lines.push(boxRow(`  ${c.dim(`... +${result.internalLinkingOpportunities.length - 8} more`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  // Related keywords
  if (result.relatedKeywords.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Related Keywords')} ${c.dim(`(${result.relatedKeywords.length})`)}`, W));
    lines.push(boxRow('', W));
    for (const k of result.relatedKeywords.slice(0, 12)) {
      lines.push(boxRow(`  ${c.cyan('\u2022')} ${k.word} ${c.dim(`(${k.frequency})`)}`, W));
    }
    if (result.relatedKeywords.length > 12) {
      lines.push(boxRow(`  ${c.dim(`... +${result.relatedKeywords.length - 12} more`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  // Content gaps
  if (result.contentGaps.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('Content Gaps')} ${c.dim(`(${result.contentGaps.length} topics)`)}`, W));
    lines.push(boxRow('', W));
    for (const gap of result.contentGaps.slice(0, 8)) {
      lines.push(boxRow(`  ${c.red('\u25CB')} ${gap.topic} ${c.dim(`covered by ${gap.coverageRatio} pages`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  // GEO optimization tips
  if (result.geoOptimizationTips.length > 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.bold('GEO Optimization Tips')}`, W));
    lines.push(boxRow('', W));
    for (const tip of result.geoOptimizationTips) {
      const priorityColor = tip.priority === 'high' ? c.red : c.yellow;
      lines.push(boxRow(`  ${priorityColor('\u2022')} ${c.bold(tip.tip)}`, W));
      lines.push(boxRow(`     ${c.dim(tip.reason)}`, W));
    }
    lines.push(boxRow('', W));
  }

  premiumNextSteps(lines, [
    `Write content following this brief`,
    `Run ${c.bold('claude-rank scan .')} after publishing to verify SEO`,
    `Run ${c.bold('claude-rank citability .')} to check AI citation readiness`,
  ]);
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

  const totalSchemas = results.reduce((n, r) => n + r.schemas.length, 0);
  const lines = premiumHeader('Schema Report', 'Structured data (JSON-LD) validation');

  lines.push(boxDiv(W));
  lines.push(boxRow('', W));
  lines.push(boxRow(`  ${c.dim('Files with schemas:')} ${c.bold(String(results.length))}    ${c.dim('Total schemas:')} ${c.bold(String(totalSchemas))}`, W));
  lines.push(boxRow('', W));

  for (const r of results) {
    lines.push(boxRow(`  ${c.bold(r.file)}`, W));
    for (const s of r.schemas) {
      const type = s.type || s['@type'] || 'Unknown';
      const format = s.format || 'JSON-LD';
      lines.push(boxRow(`    ${c.green('\u2714')} ${c.cyan(type)} ${c.dim(`(${format})`)}`, W));
    }
    lines.push(boxRow('', W));
  }

  lines.push(boxBot(W));
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// GSC Report
// ---------------------------------------------------------------------------

export function formatGscReport(data) {
  if (data.error) {
    return `\n  ${c.red('\u2718')} ${data.error}\n`;
  }

  const lines = premiumHeader('Google Search Console', 'Quick wins, low CTR alerts, and engagement insights');

  const s = data.insights?.summary;
  if (s) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.dim('Data type:')}      ${c.bold(data.type === 'queries' ? 'Queries' : data.type === 'pages' ? 'Pages' : 'Unknown')}`, W));
    lines.push(boxRow(`  ${c.dim('Total rows:')}     ${data.rowCount}`, W));
    lines.push(boxRow(`  ${c.dim('Total clicks:')}   ${c.bold(String(s.totalClicks))}`, W));
    lines.push(boxRow(`  ${c.dim('Impressions:')}    ${c.bold(String(s.totalImpressions))}`, W));
    lines.push(boxRow(`  ${c.dim('Avg position:')}   ${c.bold(String(s.avgPosition))}`, W));
    lines.push(boxRow(`  ${c.dim('Avg CTR:')}        ${c.bold(s.avgCtr)}`, W));
    lines.push(boxRow('', W));
  }

  const insights = data.insights?.insights || [];
  for (const insight of insights) {
    const icon = insight.type === 'quick-wins' ? c.green('\u2605')
      : insight.type === 'low-ctr' ? c.yellow('\u26A0')
      : c.red('\u25CF');

    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${icon} ${c.bold(insight.title)}`, W));
    lines.push(boxRow(`  ${c.dim(insight.description)}`, W));
    lines.push(boxRow('', W));

    for (const item of insight.items) {
      const parts = [];
      if (item.impressions !== undefined) parts.push(`${c.dim('imp:')} ${item.impressions}`);
      if (item.position !== undefined) parts.push(`${c.dim('pos:')} ${item.position}`);
      if (item.clicks !== undefined) parts.push(`${c.dim('clicks:')} ${item.clicks}`);
      if (item.ctr !== undefined) parts.push(`${c.dim('ctr:')} ${item.ctr}`);
      lines.push(boxRow(`    ${c.cyan('\u2022')} ${item.item}  ${parts.join('  ')}`, W));
    }
    lines.push(boxRow('', W));
  }

  if (insights.length === 0) {
    lines.push(boxDiv(W));
    lines.push(boxRow('', W));
    lines.push(boxRow(`  ${c.green('\u2714')} No actionable insights found — data looks healthy.`, W));
    lines.push(boxRow('', W));
  }

  lines.push(boxBot(W));
  lines.push('');
  return lines.join('\n');
}

