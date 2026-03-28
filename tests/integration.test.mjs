// tests/integration.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures');

describe('integration', () => {
  it('all scanners produce valid JSON for good fixture', () => {
    const tools = ['seo-scanner.mjs', 'geo-scanner.mjs', 'aeo-scanner.mjs'];
    for (const tool of tools) {
      const out = execFileSync('node', [
        path.join(ROOT, 'tools', tool),
        path.join(FIXTURES, 'good-seo-dir')
      ], { encoding: 'utf8' });
      const parsed = JSON.parse(out);
      assert.ok('scores' in parsed, `${tool} must output scores`);
      assert.ok('findings' in parsed, `${tool} must output findings`);
    }
  });

  it('CLI entry point works', () => {
    const out = execFileSync('node', [
      path.join(ROOT, 'bin', 'claude-rank.mjs'),
      'scan',
      path.join(FIXTURES, 'good-seo-dir'),
      '--json'
    ], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    assert.ok(parsed.scores.seo >= 0);
  });

  it('schema engine detects and generates', () => {
    const out = execFileSync('node', [
      path.join(ROOT, 'tools', 'schema-engine.mjs'),
      'detect',
      path.join(FIXTURES, 'good-geo-dir')
    ], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    // detect outputs an array of { file, schemas } objects (one per HTML file with schemas)
    assert.ok(Array.isArray(parsed), 'schema detect must output an array');
    assert.ok(parsed.length > 0, 'good-geo-dir must have at least one file with schemas');
    assert.ok(Array.isArray(parsed[0].schemas), 'each result entry must have a schemas array');
  });
});
