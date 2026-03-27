#!/usr/bin/env node
// Standalone CLI: npx claude-rank <command> <directory>
// Commands: scan, geo, aeo, schema, fix

const [,, command = 'scan', dir = '.'] = process.argv;

const commands = {
  scan: '../tools/seo-scanner.mjs',
  geo: '../tools/geo-scanner.mjs',
  aeo: '../tools/aeo-scanner.mjs',
  schema: '../tools/schema-engine.mjs',
};

if (command === 'help' || command === '--help') {
  console.log(`claude-rank — SEO/GEO/AEO toolkit

Usage: claude-rank <command> [directory]

Commands:
  scan     Run core SEO scanner (default)
  geo      Run GEO (AI search) scanner
  aeo      Run AEO (answer engine) scanner
  schema   Detect and validate structured data
  help     Show this help message

Examples:
  claude-rank scan ./my-project
  npx @houseofmvps/claude-rank geo .
`);
  process.exit(0);
}

const toolPath = commands[command];
if (!toolPath) {
  console.error(`Unknown command: ${command}. Run "claude-rank help" for usage.`);
  process.exit(1);
}

// Dynamic import and run the scanner on the target directory
import { resolve } from 'path';

// Clear argv before importing tool modules so their inline CLI guards don't fire.
// The tool files check `process.argv.slice(2).length > 0` to auto-run on import.
process.argv = process.argv.slice(0, 2);
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
  console.log(JSON.stringify(results, null, 2));
} else {
  const result = mod.scanDirectory(targetDir);
  console.log(JSON.stringify(result, null, 2));
}
