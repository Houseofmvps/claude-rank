import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import fs from 'fs';
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

  // --- Scoring formula tests ---

  describe('scoring formula', () => {
    it('achieves high score when all rules pass', () => {
      const result = scanDirectory(path.join(FIXTURES, 'scoring-test-dir'));
      assert.ok(result.scores.geo >= 90,
        `Expected >= 90 but got ${result.scores.geo}. Findings: ${JSON.stringify(result.findings.map(f => f.rule))}`);
    });

    it('deduplicates rules — each rule fires at most once', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
      const ruleCounts = {};
      for (const f of result.findings) {
        ruleCounts[f.rule] = (ruleCounts[f.rule] || 0) + 1;
      }
      for (const [rule, count] of Object.entries(ruleCounts)) {
        assert.equal(count, 1, `Rule "${rule}" fired ${count} times — should fire at most once`);
      }
    });

    it('score never goes below 0', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.scores.geo >= 0, `Score should be >= 0 but got ${result.scores.geo}`);
    });

    it('findings count matches summary counts', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
      const expected = result.findings.length;
      const actual = result.summary.critical + result.summary.high + result.summary.medium + result.summary.low;
      assert.equal(actual, expected, `Summary (${actual}) should match findings count (${expected})`);
    });

    it('score equals 100 minus sum of deductions', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
      const DEDUCTIONS = { critical: 20, high: 10, medium: 5, low: 2 };
      let expectedDeduction = 0;
      for (const f of result.findings) {
        expectedDeduction += DEDUCTIONS[f.severity];
      }
      const expectedScore = Math.max(0, 100 - expectedDeduction);
      assert.equal(result.scores.geo, expectedScore,
        `Score (${result.scores.geo}) should equal max(0, 100 - ${expectedDeduction}) = ${expectedScore}`);
    });

    it('returns correct files_scanned count', () => {
      const result = scanDirectory(path.join(FIXTURES, 'good-geo-dir'));
      assert.equal(result.files_scanned, 1);
    });
  });

  // --- Individual rule detection tests ---

  describe('individual rules', () => {
    it('detects missing-robots-ai-access when no robots.txt', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.findings.some(f => f.rule === 'missing-robots-ai-access'));
    });

    it('detects missing-organization-schema', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.findings.some(f => f.rule === 'missing-organization-schema'));
    });

    it('detects thin-content-ai for pages below 300 words', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.findings.some(f => f.rule === 'thin-content-ai'));
    });

    it('detects no-definition-patterns', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-seo-dir'));
      assert.ok(result.findings.some(f => f.rule === 'no-definition-patterns'));
    });

    it('does not flag good-geo-dir for blocked bots', () => {
      const result = scanDirectory(path.join(FIXTURES, 'good-geo-dir'));
      const blocked = result.findings.filter(f => f.rule.endsWith('-blocked'));
      assert.equal(blocked.length, 0, `Should not flag blocked bots: ${blocked.map(f => f.rule)}`);
    });

    it('all findings have valid severity', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
      for (const f of result.findings) {
        assert.ok(['critical', 'high', 'medium', 'low'].includes(f.severity),
          `Finding "${f.rule}" has invalid severity: ${f.severity}`);
      }
    });

    it('all findings have a rule name and message', () => {
      const result = scanDirectory(path.join(FIXTURES, 'bad-geo-dir'));
      for (const f of result.findings) {
        assert.ok(f.rule && f.rule.length > 0, 'Finding must have a rule name');
        assert.ok(f.message && f.message.length > 0, `Finding "${f.rule}" must have a message`);
      }
    });
  });

  // --- Question header detection ---

  describe('question header detection', () => {
    it('detects expanded question words (could, would, has)', () => {
      const dir = path.join(FIXTURES, '_question-expanded-test');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml');
      fs.writeFileSync(path.join(dir, 'llms.txt'), '# Test');
      fs.writeFileSync(path.join(dir, 'index.html'),
        `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Test Page Title Here Long Enough</title><meta name="description" content="Test description that is long enough to pass validation checks here."><link rel="canonical" href="https://example.com/test"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Test","url":"https://example.com"}</script><script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Author","jobTitle":"Dev"}</script><script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://example.com"}]}</script><script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Test","author":{"@type":"Person","name":"A"},"datePublished":"2026-01-01"}</script></head><body><main><h1>Test</h1><h2>Could you explain this topic?</h2><p>${'word '.repeat(150)}</p><h2>Would this approach work?</h2><p>${'word '.repeat(150)}</p><h2>Has anyone tried this method?</h2><p>${'word '.repeat(150)}</p></main></body></html>`);
      try {
        const result = scanDirectory(dir);
        const hasNoQuestion = result.findings.some(f => f.rule === 'no-question-headers');
        assert.equal(hasNoQuestion, false, '"Could/Would/Has" should be detected as question headers');
      } finally {
        fs.rmSync(dir, { recursive: true });
      }
    });
  });
});
