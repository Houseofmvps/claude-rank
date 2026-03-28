#!/usr/bin/env node
// Standalone CLI: npx claude-rank <command> <directory>
// Commands: scan, geo, aeo, schema, fix

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const singleFlag = args.includes('--single');
const reportFlag = args.includes('--report') ? args[args.indexOf('--report') + 1] : null;
const thresholdIdx = args.indexOf('--threshold');
const thresholdFlag = thresholdIdx !== -1 ? Number(args[thresholdIdx + 1]) : null;

// Parse --pages N flag (default: 50)
let maxPages = 50;
const pagesIdx = args.indexOf('--pages');
if (pagesIdx !== -1 && args[pagesIdx + 1]) {
  const parsed = parseInt(args[pagesIdx + 1], 10);
  if (!isNaN(parsed) && parsed > 0) maxPages = parsed;
}

const positional = args.filter((a, i) => {
  if (a === '--json' || a === '--single') return false;
  if (a === '--report' || a === '--threshold' || a === '--pages') return false;
  // Skip the value after --report, --threshold, or --pages
  if (i > 0 && (args[i - 1] === '--report' || args[i - 1] === '--threshold' || args[i - 1] === '--pages')) return false;
  return true;
});
const [command = 'scan', dir = '.'] = positional;

// Reject empty string as target
if (command !== 'help' && (dir === '' || dir.trim() === '')) {
  console.error('No target directory or URL provided.\n');
  console.error('Usage: claude-rank <command> <directory>');
  console.error('       claude-rank <command> <url>\n');
  console.error('Run "claude-rank help" for all options.');
  process.exit(1);
}

const commands = {
  scan: '../tools/seo-scanner.mjs',
  geo: '../tools/geo-scanner.mjs',
  aeo: '../tools/aeo-scanner.mjs',
  schema: '../tools/schema-engine.mjs',
};

if (command === 'help' || command === '--help') {
  console.log(`claude-rank — SEO/GEO/AEO toolkit

Usage: claude-rank <command> [directory|url] [flags]

Commands:
  scan     Run core SEO scanner (default)
  geo      Run GEO (AI search) scanner
  aeo      Run AEO (answer engine) scanner
  compete  Competitive X-Ray — compare your site vs any competitor URL
  cwv      Run Core Web Vitals / Lighthouse audit (needs Chrome installed)
  schema   Detect and validate structured data
  help     Show this help message

Flags:
  --json            Output raw JSON (for programmatic use)
  --single          Scan only one page (skip multi-page crawl for URLs)
  --pages N         Max pages to crawl (default: 50, URL scanning only)
  --report html     Run all scanners and save HTML report to claude-rank-report.html
  --threshold N     Exit code 1 if score < N (for CI/CD pipelines)

URL scanning:
  Pass a URL instead of a directory to scan a live site via HTTP.
  By default, crawls up to 50 pages following internal links.
  Use --single to scan only the given URL without crawling.
  Only the "scan" command supports URL scanning.

Examples:
  claude-rank scan ./my-project
  claude-rank scan https://savemrr.co
  claude-rank scan https://savemrr.co --pages 10
  claude-rank scan https://savemrr.co --single
  claude-rank compete https://competitor.com ./my-project
  npx @houseofmvps/claude-rank geo .
  claude-rank scan ./site --json
  claude-rank scan ./site --report html
  claude-rank scan ./site --threshold 80
  claude-rank scan . --report html --threshold 80
`);
  process.exit(0);
}

// Handle compete command separately (requires URL + local dir)
if (command === 'compete') {
  const competitorUrl = dir;
  if (!competitorUrl.startsWith('http://') && !competitorUrl.startsWith('https://')) {
    console.error('The compete command requires a competitor URL.');
    console.error('Usage: claude-rank compete <competitor-url> [your-directory]');
    process.exit(1);
  }

  // The local dir is the third positional arg (after 'compete' and URL)
  const localDir = positional[2] || '.';
  const { resolve: resolvePath } = await import('path');

  const { compete } = await import(new URL('../tools/compete-scanner.mjs', import.meta.url));
  const { formatCompeteReport } = await import(new URL('../tools/lib/formatter.mjs', import.meta.url));

  try {
    const result = await compete(competitorUrl, resolvePath(localDir));
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatCompeteReport(result));
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

// Handle CWV command separately (requires URL, optional dependency)
if (command === 'cwv') {
  const url = dir.startsWith('http://') || dir.startsWith('https://') ? dir : null;
  if (!url) {
    console.error('The cwv command requires a URL. Usage: claude-rank cwv https://example.com');
    process.exit(1);
  }

  // Clear argv before importing
  process.argv = process.argv.slice(0, 2);

  const { runLighthouse, isAvailable } = await import(new URL('../tools/lighthouse-scanner.mjs', import.meta.url));
  const check = isAvailable();
  if (!check.available) {
    console.log(`\n  Core Web Vitals scanner requires Chrome or Chromium.\n`);
    console.log(`  Install Google Chrome, then run: claude-rank cwv ${url}\n`);
    process.exit(0);
  }

  const result = runLighthouse(url);
  if (jsonFlag) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Pretty output is handled inside lighthouse-scanner.mjs CLI
    // For programmatic use, just output JSON
    console.log(JSON.stringify(result, null, 2));
  }
  process.exit(0);
}

const toolPath = commands[command];
if (!toolPath) {
  console.error(`Unknown command: ${command}. Run "claude-rank help" for usage.`);
  process.exit(1);
}

// Detect if the target is a URL (http:// or https://)
const isUrl = dir.startsWith('http://') || dir.startsWith('https://');

// Dynamic import and run the scanner on the target directory
import { resolve } from 'path';

// Clear argv before importing tool modules so their inline CLI guards don't fire.
// The tool files check `process.argv.slice(2).length > 0` to auto-run on import.
process.argv = process.argv.slice(0, 2);

const {
  formatSeoReport,
  formatGeoReport,
  formatAeoReport,
  formatSchemaReport,
} = await import(new URL('../tools/lib/formatter.mjs', import.meta.url));

const formatters = {
  scan: formatSeoReport,
  geo: formatGeoReport,
  aeo: formatAeoReport,
  schema: formatSchemaReport,
};

// URL-based scanning (scan command only)
if (isUrl) {
  if (command !== 'scan') {
    console.error(`URL scanning is only supported for the "scan" command, not "${command}".`);
    process.exit(1);
  }

  const { scanUrl, scanSite } = await import(new URL('../tools/url-scanner.mjs', import.meta.url));
  try {
    const result = singleFlag
      ? await scanUrl(dir)
      : await scanSite(dir, { maxPages });
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatSeoReport(result));
    }

    // Check threshold for URL scans
    if (thresholdFlag != null) {
      const score = result.scores?.seo ?? 0;
      if (score < thresholdFlag) {
        console.error(`Score ${score} is below threshold ${thresholdFlag}`);
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(`Error scanning URL: ${err.message}`);
    process.exit(1);
  }
} else {
  // Directory-based scanning
  const targetDir = resolve(dir);

  // Check if directory has any HTML files before scanning
  const { findHtmlFiles } = await import(new URL('../tools/lib/html-parser.mjs', import.meta.url));
  const htmlFiles = findHtmlFiles(targetDir);
  if (htmlFiles.length === 0) {
    console.error(`No HTML files found in ${targetDir}`);
    console.error(`\nUsage: claude-rank scan <directory-with-html-files>`);
    console.error(`       claude-rank scan <url>`);
    console.error(`\nRun "claude-rank help" for all options.`);
    process.exit(1);
  }

  // --report html: run ALL scanners, generate HTML report
  if (reportFlag === 'html') {
    const { writeFileSync } = await import('node:fs');
    const { generateHtmlReport } = await import(new URL('../tools/lib/report-generator.mjs', import.meta.url));

    const seoMod = await import(new URL('../tools/seo-scanner.mjs', import.meta.url));
    const geoMod = await import(new URL('../tools/geo-scanner.mjs', import.meta.url));
    const aeoMod = await import(new URL('../tools/aeo-scanner.mjs', import.meta.url));

    const seo = seoMod.scanDirectory(targetDir);
    const geo = geoMod.scanDirectory(targetDir);
    const aeo = aeoMod.scanDirectory(targetDir);

    const html = generateHtmlReport({
      seo, geo, aeo,
      target: dir,
      timestamp: new Date().toISOString(),
    });

    const outPath = resolve('claude-rank-report.html');
    writeFileSync(outPath, html, 'utf-8');
    console.log(`HTML report saved to ${outPath}`);

    // Also print terminal summaries
    console.log(formatSeoReport(seo));
    console.log(formatGeoReport(geo));
    console.log(formatAeoReport(aeo));

    // Check threshold against the primary (SEO) score
    if (thresholdFlag != null) {
      const score = seo.scores?.seo ?? 0;
      if (score < thresholdFlag) {
        console.error(`Score ${score} is below threshold ${thresholdFlag}`);
        process.exit(1);
      }
    }
  } else if (command === 'schema') {
    // schema-engine exports detectSchema (per-file) and findHtmlFiles via html-parser.
    const mod = await import(new URL(toolPath, import.meta.url));
    const { findHtmlFiles } = await import(new URL('../tools/lib/html-parser.mjs', import.meta.url));
    const { readFileSync } = await import('node:fs');
    const files = findHtmlFiles(targetDir);
    const results = [];
    for (const file of files) {
      const html = readFileSync(file, 'utf-8');
      const schemas = mod.detectSchema(html);
      if (schemas.length > 0) {
        results.push({ file, schemas });
      }
    }
    if (jsonFlag) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(formatSchemaReport(results));
    }
  } else {
    const mod = await import(new URL(toolPath, import.meta.url));
    const result = mod.scanDirectory(targetDir);
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatters[command](result));
    }

    // Check threshold
    if (thresholdFlag != null) {
      const scoreKey = command === 'scan' ? 'seo' : command;
      const score = result.scores?.[scoreKey] ?? 0;
      if (score < thresholdFlag) {
        console.error(`Score ${score} is below threshold ${thresholdFlag}`);
        process.exit(1);
      }
    }
  }
}
