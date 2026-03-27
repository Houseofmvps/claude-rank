import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanDirectory } from '../tools/seo-scanner.mjs';
import path from 'path';
import { execFileSync } from 'child_process';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

describe('seo-scanner', () => {
  it('returns high score for good-seo fixture', () => {
    const result = scanDirectory(path.join(FIXTURES, 'good-seo-dir'));
    assert.ok(result.scores.seo >= 85, `Expected >= 85 but got ${result.scores.seo}`);
  });

  it('returns low score for bad-seo fixture', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
    assert.ok(result.scores.seo < 50, `Expected < 50 but got ${result.scores.seo}`);
  });

  it('detects missing title', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
    const rule = result.findings.find(f => f.rule === 'missing-title');
    assert.ok(rule, 'should detect missing title');
    assert.equal(rule.severity, 'high');
  });

  it('detects duplicate titles across pages', () => {
    const result = scanDirectory(path.join(FIXTURES, 'duplicate-titles-dir'));
    const dupes = result.findings.filter(f => f.rule === 'duplicate-title');
    assert.ok(dupes.length >= 2, `Expected >= 2 duplicate title findings but got ${dupes.length}`);
  });

  it('detects orphan pages', () => {
    const result = scanDirectory(path.join(FIXTURES, 'orphan-dir'));
    const orphans = result.findings.filter(f => f.rule === 'orphan-page');
    assert.ok(orphans.length > 0, 'should detect orphan page');
  });

  it('detects thin content', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
    const thin = result.findings.find(f => f.rule === 'thin-content');
    assert.ok(thin, 'should detect thin content');
  });

  it('skips backend-only projects', () => {
    const result = scanDirectory(path.join(FIXTURES, 'backend-only-dir'));
    assert.equal(result.skipped, true);
  });

  it('outputs valid JSON when run as CLI', () => {
    const out = execFileSync('node', [
      path.join(import.meta.dirname, '..', 'tools', 'seo-scanner.mjs'),
      path.join(FIXTURES, 'good-seo-dir')
    ], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    assert.ok('scores' in parsed);
    assert.ok('findings' in parsed);
  });
});
