/**
 * llms-txt-generator.mjs — Generate llms.txt for AI crawler discoverability.
 * llms.txt is a standard for helping LLMs understand what a project/site is about.
 */

import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// generateLlmsTxt
// ---------------------------------------------------------------------------

/**
 * Generate llms.txt content from package.json-like data.
 * @param {{ name: string, description?: string, dependencies?: Record<string, string>, homepage?: string }} pkgData
 * @returns {string}
 */
export function generateLlmsTxt(pkgData) {
  const { name, description, dependencies, homepage } = pkgData;
  const lines = [];

  // Title
  lines.push(`# ${name}`);
  lines.push('');

  // Description
  if (description) {
    lines.push(`> ${description}`);
    lines.push('');
  }

  // Homepage
  if (homepage) {
    lines.push(`## Homepage`);
    lines.push('');
    lines.push(homepage);
    lines.push('');
  }

  // Dependencies
  if (dependencies && Object.keys(dependencies).length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    for (const [dep, version] of Object.entries(dependencies)) {
      lines.push(`- ${dep}: ${version}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [,, dir] = process.argv;

  if (!dir) {
    console.error('Usage: node tools/llms-txt-generator.mjs <dir>');
    process.exit(1);
  }

  const absDir = path.resolve(dir);
  const pkgPath = path.join(absDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.error(`No package.json found at ${pkgPath}`);
    process.exit(1);
  }

  let pkgData;
  try {
    pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse package.json: ${err.message}`);
    process.exit(1);
  }

  const content = generateLlmsTxt({
    name: pkgData.name || path.basename(absDir),
    description: pkgData.description,
    dependencies: pkgData.dependencies,
    homepage: pkgData.homepage,
  });

  const outPath = path.join(absDir, 'llms.txt');
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`llms.txt written to ${outPath}`);
  console.log(content);
}
