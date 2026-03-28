// tests/cli.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.join(__dirname, '..', 'bin', 'claude-rank.mjs');
const FIXTURES = path.join(__dirname, 'fixtures', 'good-seo-dir');

describe('CLI', () => {
  it('outputs valid JSON for scan command', () => {
    const out = execFileSync('node', [BIN, 'scan', FIXTURES, '--json'], { encoding: 'utf8' });
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

  it('--threshold passes when score is above threshold', () => {
    // good-seo-dir should score well above 0
    const out = execFileSync('node', [BIN, 'scan', FIXTURES, '--threshold', '0'], { encoding: 'utf8' });
    assert.ok(out.length > 0);
  });

  it('--threshold 100 exits with code 1 since nothing scores 100', () => {
    assert.throws(() => {
      execFileSync('node', [BIN, 'scan', FIXTURES, '--threshold', '100'], { encoding: 'utf8' });
    }, (err) => {
      assert.ok(err.status === 1);
      return true;
    });
  });
});
