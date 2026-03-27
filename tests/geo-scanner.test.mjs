import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { scanDirectory } from '../tools/geo-scanner.mjs';
import path from 'path';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

describe('geo-scanner', () => {
  it('returns high score for good-geo fixture', () => {
    const result = scanDirectory(path.join(FIXTURES, 'good-geo-dir'));
    assert.ok(result.scores.geo >= 80, `Expected >= 80 but got ${result.scores.geo}`);
  });

  it('returns low score when AI bots are blocked', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
    assert.ok(result.scores.geo < 50, `Expected < 50 but got ${result.scores.geo}`);
  });

  it('detects blocked GPTBot', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
    assert.ok(result.findings.some(f => f.rule === 'gptbot-blocked'));
  });

  it('detects missing llms.txt', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
    assert.ok(result.findings.some(f => f.rule === 'missing-llms-txt'));
  });

  it('detects missing structured data for AI', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
    assert.ok(result.findings.some(f => f.rule === 'missing-structured-data'));
  });

  it('detects non-question H2 headers', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
    const h2Finding = result.findings.find(f => f.rule === 'no-question-headers' || f.rule === 'few-question-headers');
    assert.ok(h2Finding, 'should detect non-question headers');
  });

  it('outputs valid JSON when run as CLI', () => {
    const out = execFileSync('node', [
      path.join(import.meta.dirname, '..', 'tools', 'geo-scanner.mjs'),
      path.join(FIXTURES, 'good-geo-dir')
    ], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    assert.ok('scores' in parsed);
    assert.ok('findings' in parsed);
  });
});
