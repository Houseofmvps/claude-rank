#!/usr/bin/env node
// Standalone CLI: npx claude-rank <command> <directory>
// Commands: scan, geo, aeo, schema, fix

const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const positional = args.filter(a => a !== '--json');
const [command = 'scan', dir = '.'] = positional;

const commands = {
  scan: '../tools/seo-scanner.mjs',
  geo: '../tools/geo-scanner.mjs',
  aeo: '../tools/aeo-scanner.mjs',
  schema: '../tools/schema-engine.mjs',
};

if (command === 'help' || command === '--help') {
  console.log(`claude-rank — SEO/GEO/AEO toolkit

Usage: claude-rank <command> [directory|url] [--json]

Commands:
  scan     Run core SEO scanner (default)
  geo      Run GEO (AI search) scanner
  aeo      Run AEO (answer engine) scanner
  schema   Detect and validate structured data
  help     Show this help message

Flags:
  --json   Output raw JSON (for programmatic use)

URL scanning:
  Pass a URL instead of a directory to scan a live page via HTTP.
  Only the "scan" command supports URL scanning.

Examples:
  claude-rank scan ./my-project
  claude-rank scan https://savemrr.co
  npx @houseofmvps/claude-rank geo .
  claude-rank scan ./site --json
`);
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

  const { scanUrl } = await import(new URL('../tools/url-scanner.mjs', import.meta.url));
  try {
    const result = await scanUrl(dir);
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatSeoReport(result));
    }
  } catch (err) {
    console.error(`Error scanning URL: ${err.message}`);
    process.exit(1);
  }
} else {
  // Directory-based scanning
  const mod = await import(new URL(toolPath, import.meta.url));
  const targetDir = resolve(dir);

  if (command === 'schema') {
    // schema-engine exports detectSchema (per-file) and findHtmlFiles via html-parser.
    // Build a directory-level result by importing the html-parser helper and scanning each file.
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
    const result = mod.scanDirectory(targetDir);
    if (jsonFlag) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatters[command](result));
    }
  }
}
