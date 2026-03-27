// tests/cli.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import path from 'path';

const BIN = path.join(import.meta.dirname, '..', 'bin', 'claude-rank.mjs');
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'good-seo-dir');

describe('CLI', () => {
  it('outputs valid JSON for scan command', () => {
    const out = execFileSync('node', [BIN, 'scan', FIXTURES], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    assert.ok('scores' in parsed);
  });

  it('shows help text', () => {
    const out = execFileSync('node', [BIN, 'help'], { encoding: 'utf8' });
    assert.ok(out.includes('claude-rank'));
    assert.ok(out.includes('Usage'));
  });

  it('exits with error for unknown command', () => {
    assert.throws(() => {
      execFileSync('node', [BIN, 'nonexistent', '.'], { encoding: 'utf8' });
    });
  });
});
