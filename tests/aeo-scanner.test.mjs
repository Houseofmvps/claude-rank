import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanDirectory } from '../tools/aeo-scanner.mjs';
import path from 'path';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

describe('aeo-scanner', () => {
  it('detects missing FAQPage schema', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
    assert.ok(result.findings.some(f => f.rule === 'missing-faqpage-schema'));
  });

  it('detects missing speakable schema', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
    assert.ok(result.findings.some(f => f.rule === 'missing-speakable-schema'));
  });

  it('detects non-snippet-friendly content', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
    assert.ok(result.findings.some(f => f.rule === 'no-snippet-answers'));
  });

  it('returns reasonable score for well-optimized page', () => {
    // good-geo-dir has question H2s and structured content
    const result = scanDirectory(path.join(FIXTURES, 'good-geo-dir'));
    assert.ok(result.scores.aeo >= 50, `Expected >= 50 but got ${result.scores.aeo}`);
  });

  it('returns low score for bad page', () => {
    const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
    assert.ok(result.scores.aeo < 70, `Expected < 70 but got ${result.scores.aeo}`);
  });

  it('outputs valid JSON structure', () => {
    const result = scanDirectory(path.join(FIXTURES, 'good-geo-dir'));
    assert.ok('scores' in result);
    assert.ok('findings' in result);
    assert.ok('summary' in result);
    assert.ok(typeof result.scores.aeo === 'number');
  });
});
