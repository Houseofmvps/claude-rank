// tests/report-generator.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateHtmlReport } from '../tools/lib/report-generator.mjs';

const makeScanResult = (key, score) => ({
  scores: { [key]: score },
  files_scanned: 3,
  findings: [
    { rule: 'test-rule', severity: 'high', message: 'Test finding', file: 'index.html' },
    { rule: 'test-rule-2', severity: 'low', message: 'Minor issue', file: 'about.html' },
  ],
  summary: { critical: 0, high: 1, medium: 0, low: 1 },
});

describe('generateHtmlReport', () => {
  it('returns a valid HTML string', () => {
    const html = generateHtmlReport({
      seo: makeScanResult('seo', 85),
      target: './my-project',
      timestamp: '2026-03-28T12:00:00Z',
    });
    assert.ok(html.startsWith('<!DOCTYPE html>'));
    assert.ok(html.includes('</html>'));
  });

  it('includes score values in the output', () => {
    const html = generateHtmlReport({
      seo: makeScanResult('seo', 72),
      geo: makeScanResult('geo', 91),
      target: '.',
      timestamp: '2026-03-28T12:00:00Z',
    });
    assert.ok(html.includes('72'));
    assert.ok(html.includes('91'));
  });

  it('handles missing scanners (only SEO, no GEO/AEO)', () => {
    const html = generateHtmlReport({
      seo: makeScanResult('seo', 88),
      target: './site',
      timestamp: '2026-03-28T12:00:00Z',
    });
    assert.ok(html.includes('SEO'));
    assert.ok(!html.includes('>GEO<'));
    assert.ok(!html.includes('>AEO<'));
  });

  it('includes the timestamp and target', () => {
    const html = generateHtmlReport({
      seo: makeScanResult('seo', 80),
      target: 'https://example.com',
      timestamp: '2026-03-28T12:00:00Z',
    });
    assert.ok(html.includes('https://example.com'));
    assert.ok(html.includes('2026'));
  });

  it('handles skipped scanners gracefully', () => {
    const html = generateHtmlReport({
      seo: makeScanResult('seo', 75),
      geo: { skipped: true, reason: 'No HTML files' },
      target: '.',
      timestamp: '2026-03-28T12:00:00Z',
    });
    assert.ok(html.includes('<!DOCTYPE html>'));
    // GEO should not appear as a score card since it was skipped
    assert.ok(!html.includes('>GEO<'));
  });

  it('shows correct score labels', () => {
    // Excellent (90+)
    let html = generateHtmlReport({ seo: makeScanResult('seo', 95), target: '.', timestamp: '' });
    assert.ok(html.includes('Excellent'));

    // Good (80+)
    html = generateHtmlReport({ seo: makeScanResult('seo', 85), target: '.', timestamp: '' });
    assert.ok(html.includes('Good'));

    // Needs Work (60+)
    html = generateHtmlReport({ seo: makeScanResult('seo', 65), target: '.', timestamp: '' });
    assert.ok(html.includes('Needs Work'));

    // Poor (<60)
    html = generateHtmlReport({ seo: makeScanResult('seo', 40), target: '.', timestamp: '' });
    assert.ok(html.includes('Poor'));
  });

  it('includes the footer branding', () => {
    const html = generateHtmlReport({ seo: makeScanResult('seo', 80), target: '.', timestamp: '' });
    assert.ok(html.includes('claude-rank v1.2.1'));
    assert.ok(html.includes('github.com/Houseofmvps/claude-rank'));
  });
});
