import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { saveScore, showHistory, diffScores } from '../tools/audit-history.mjs';

describe('audit-history', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rank-history-'));
  });

  it('saves a score and creates history file', () => {
    saveScore(tmpDir, 'seo', 85);
    const historyPath = path.join(tmpDir, '.claude-rank', 'reports', 'audit-history.json');
    assert.ok(fs.existsSync(historyPath));
    const data = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    assert.ok(data.seo);
    assert.equal(data.seo.length, 1);
    assert.equal(data.seo[0].score, 85);
  });

  it('appends multiple scores', () => {
    saveScore(tmpDir, 'seo', 70);
    saveScore(tmpDir, 'seo', 85);
    const history = showHistory(tmpDir, 'seo');
    assert.equal(history.total_runs, 2);
    assert.equal(history.latest, 85);
    assert.equal(history.best, 85);
    assert.equal(history.worst, 70);
  });

  it('calculates improving trend', () => {
    saveScore(tmpDir, 'geo', 60);
    saveScore(tmpDir, 'geo', 75);
    saveScore(tmpDir, 'geo', 90);
    const history = showHistory(tmpDir, 'geo');
    assert.equal(history.trend, 'improving');
  });

  it('calculates declining trend', () => {
    saveScore(tmpDir, 'aeo', 90);
    saveScore(tmpDir, 'aeo', 70);
    const history = showHistory(tmpDir, 'aeo');
    assert.equal(history.trend, 'declining');
  });

  it('diffs scores between last two runs', () => {
    saveScore(tmpDir, 'seo', 65);
    saveScore(tmpDir, 'seo', 80);
    const diff = diffScores(tmpDir, 'seo');
    assert.equal(diff.previous, 65);
    assert.equal(diff.current, 80);
    assert.equal(diff.change, 15);
  });
});
