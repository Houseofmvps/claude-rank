import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanDirectory } from '../tools/seo-scanner.mjs';
import path from 'path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'child_process';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

describe('seo-scanner', () => {
  it('returns high score for good-seo fixture', () => {
    const result = scanDirectory(path.join(FIXTURES, 'good-seo-dir'));
    assert.ok(result.scores.seo >= 80, `Expected >= 80 but got ${result.scores.seo}`);
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

  describe('broken internal link detection', () => {
    function makeTmpDir() {
      return fs.mkdtempSync(path.join(os.tmpdir(), 'seo-broken-link-'));
    }

    it('detects a link to a non-existent file', () => {
      const tmpDir = makeTmpDir();
      // index.html links to /about which does not exist
      fs.writeFileSync(path.join(tmpDir, 'index.html'),
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Home Page Title Here</title></head><body><main><a href="/about">About</a></main></body></html>');
      const result = scanDirectory(tmpDir);
      const broken = result.findings.filter(f => f.rule === 'broken-internal-link');
      assert.ok(broken.length > 0, 'should detect broken internal link to /about');
      assert.ok(broken[0].message.includes('/about'), 'message should mention the broken href');
      fs.rmSync(tmpDir, { recursive: true });
    });

    it('does NOT flag a link to an existing file', () => {
      const tmpDir = makeTmpDir();
      // index.html links to /about, and about.html exists
      fs.writeFileSync(path.join(tmpDir, 'index.html'),
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Home Page Title Here</title></head><body><main><a href="/about">About</a></main></body></html>');
      fs.writeFileSync(path.join(tmpDir, 'about.html'),
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>About Page Title Here</title></head><body><main><a href="/">Home</a></main></body></html>');
      const result = scanDirectory(tmpDir);
      const broken = result.findings.filter(f => f.rule === 'broken-internal-link');
      assert.equal(broken.length, 0, 'should not flag link to existing about.html');
      fs.rmSync(tmpDir, { recursive: true });
    });

    it('does NOT check external links', () => {
      const tmpDir = makeTmpDir();
      // index.html has only an external link — no broken-internal-link should fire
      fs.writeFileSync(path.join(tmpDir, 'index.html'),
        '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Home Page Title Here</title></head><body><main><a href="https://example.com/nonexistent">External</a></main></body></html>');
      const result = scanDirectory(tmpDir);
      const broken = result.findings.filter(f => f.rule === 'broken-internal-link');
      assert.equal(broken.length, 0, 'should not check external links');
      fs.rmSync(tmpDir, { recursive: true });
    });
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
