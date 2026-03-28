import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
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

  // --- Scoring formula tests ---

  describe('scoring formula', () => {
    it('score never goes below 0', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.scores.aeo >= 0, `Score should be >= 0 but got ${result.scores.aeo}`);
    });

    it('score is at most 100', () => {
      const result = scanDirectory(path.join(FIXTURES, 'good-geo-dir'));
      assert.ok(result.scores.aeo <= 100, `Score should be <= 100 but got ${result.scores.aeo}`);
    });

    it('findings count matches summary counts', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      const expected = result.findings.length;
      const actual = result.summary.critical + result.summary.high + result.summary.medium + result.summary.low;
      assert.equal(actual, expected, `Summary (${actual}) should match findings count (${expected})`);
    });

    it('score equals 100 minus sum of deductions', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      const DEDUCTIONS = { critical: 20, high: 10, medium: 5, low: 2 };
      let expectedDeduction = 0;
      for (const f of result.findings) {
        expectedDeduction += DEDUCTIONS[f.severity];
      }
      const expectedScore = Math.max(0, 100 - expectedDeduction);
      assert.equal(result.scores.aeo, expectedScore,
        `Score (${result.scores.aeo}) should equal max(0, 100 - ${expectedDeduction}) = ${expectedScore}`);
    });

    it('each rule fires at most once', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      const ruleCounts = {};
      for (const f of result.findings) {
        ruleCounts[f.rule] = (ruleCounts[f.rule] || 0) + 1;
      }
      for (const [rule, count] of Object.entries(ruleCounts)) {
        assert.equal(count, 1, `Rule "${rule}" fired ${count} times — should fire at most once`);
      }
    });

    it('achieves high score on scoring-test-dir', () => {
      const result = scanDirectory(path.join(FIXTURES, 'scoring-test-dir'));
      assert.ok(result.scores.aeo >= 80,
        `Expected >= 80 but got ${result.scores.aeo}. Findings: ${JSON.stringify(result.findings.map(f => f.rule))}`);
    });
  });

  // --- Individual rule tests ---

  describe('individual rules', () => {
    it('detects missing-content-schema when no Article/BlogPosting', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.findings.some(f => f.rule === 'missing-content-schema'));
    });

    it('detects missing-llms-txt-aeo', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.findings.some(f => f.rule === 'missing-llms-txt-aeo'));
    });

    it('returns files_scanned count', () => {
      const result = scanDirectory(path.join(FIXTURES, 'good-geo-dir'));
      assert.ok(result.files_scanned >= 1);
    });

    it('all findings have valid severity', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      for (const f of result.findings) {
        assert.ok(['critical', 'high', 'medium', 'low'].includes(f.severity),
          `Finding "${f.rule}" has invalid severity: ${f.severity}`);
      }
    });

    it('all findings have a rule name', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      for (const f of result.findings) {
        assert.ok(f.rule && f.rule.length > 0, 'Finding must have a rule name');
      }
    });

    it('all findings have a message', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      for (const f of result.findings) {
        assert.ok(f.message && f.message.length > 0, `Finding "${f.rule}" must have a message`);
      }
    });
  });
});
