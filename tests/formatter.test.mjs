import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSeoReport,
  formatGeoReport,
  formatAeoReport,
  formatSchemaReport,
} from '../tools/lib/formatter.mjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function makeScanResult({ score = 72, scoreKey = 'seo', findings = [], filesScanned = 10 } = {}) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    summary[f.severity] = (summary[f.severity] || 0) + 1;
  }
  return {
    files_scanned: filesScanned,
    findings,
    scores: { [scoreKey]: score },
    summary,
  };
}

// ---------------------------------------------------------------------------
// Score label tests
// ---------------------------------------------------------------------------

describe('formatSeoReport score labels', () => {
  it('shows EXCELLENT for score >= 90', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 95 })));
    assert.ok(out.includes('EXCELLENT'), 'Expected EXCELLENT label');
  });

  it('shows GOOD for score >= 80', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 85 })));
    assert.ok(out.includes('GOOD'), 'Expected GOOD label');
  });

  it('shows NEEDS WORK for score >= 60', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 65 })));
    assert.ok(out.includes('NEEDS WORK'), 'Expected NEEDS WORK label');
  });

  it('shows POOR for score < 60', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 40 })));
    assert.ok(out.includes('POOR'), 'Expected POOR label');
  });
});

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

describe('formatSeoReport score display', () => {
  it('contains the numeric score', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 72 })));
    assert.ok(out.includes('72/100'), 'Expected score 72/100 in output');
  });

  it('contains files scanned count', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ filesScanned: 26 })));
    assert.ok(out.includes('Files scanned: 26'), 'Expected files scanned count');
  });
});

// ---------------------------------------------------------------------------
// Findings grouping
// ---------------------------------------------------------------------------

describe('formatSeoReport findings grouping', () => {
  it('groups findings by rule and shows page count', () => {
    const findings = [
      { rule: 'title-too-long', severity: 'medium', file: 'a.html', message: 'Title is too long' },
      { rule: 'title-too-long', severity: 'medium', file: 'b.html', message: 'Title is too long' },
      { rule: 'title-too-long', severity: 'medium', file: 'c.html', message: 'Title is too long' },
    ];
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    // Should show the rule once with a page count, not three separate entries
    assert.ok(out.includes('title-too-long'), 'Expected rule name');
    assert.ok(out.includes('(3 pages)'), 'Expected grouped page count');
  });

  it('does not show page count for single-file findings', () => {
    const findings = [
      { rule: 'thin-content', severity: 'high', file: 'page.html', message: 'Too thin' },
    ];
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    assert.ok(out.includes('thin-content'), 'Expected rule name');
    assert.ok(!out.includes('pages)'), 'Should not show page count for single file');
  });

  it('shows +N more for many files', () => {
    const findings = [];
    for (let i = 0; i < 6; i++) {
      findings.push({ rule: 'missing-alt', severity: 'medium', file: `img${i}.html`, message: 'Missing alt' });
    }
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    assert.ok(out.includes('+3 more'), 'Expected +3 more for 6 files with max 3 shown');
  });
});

// ---------------------------------------------------------------------------
// Empty findings
// ---------------------------------------------------------------------------

describe('formatSeoReport with empty findings', () => {
  it('returns a string with no grouped findings listed', () => {
    const out = formatSeoReport(makeScanResult({ score: 100, findings: [] }));
    assert.ok(typeof out === 'string', 'Expected string output');
    assert.ok(stripAnsi(out).includes('No findings'), 'Should show no-findings message when empty');
    // The box shows "Findings: 0" as a stat, but the detail section should not appear
    assert.ok(!stripAnsi(out).includes('CRITICAL'), 'Should not list any severity tags');
    assert.ok(!stripAnsi(out).includes('HIGH'), 'Should not list any severity tags');
  });
});

// ---------------------------------------------------------------------------
// Skipped projects
// ---------------------------------------------------------------------------

describe('formatSeoReport skipped', () => {
  it('handles skipped result', () => {
    const out = formatSeoReport({ skipped: true, reason: 'No HTML files found' });
    assert.ok(stripAnsi(out).includes('No HTML files found'), 'Expected skip reason');
  });
});

// ---------------------------------------------------------------------------
// GEO and AEO formatters
// ---------------------------------------------------------------------------

describe('formatGeoReport', () => {
  it('shows GEO Audit title and score', () => {
    const out = stripAnsi(formatGeoReport(makeScanResult({ score: 80, scoreKey: 'geo' })));
    assert.ok(out.includes('GEO Audit'), 'Expected GEO Audit title');
    assert.ok(out.includes('80/100'), 'Expected score');
  });
});

describe('formatAeoReport', () => {
  it('shows AEO Audit title and score', () => {
    const out = stripAnsi(formatAeoReport(makeScanResult({ score: 55, scoreKey: 'aeo' })));
    assert.ok(out.includes('AEO Audit'), 'Expected AEO Audit title');
    assert.ok(out.includes('55/100'), 'Expected score');
  });
});

// ---------------------------------------------------------------------------
// Schema formatter
// ---------------------------------------------------------------------------

describe('formatSchemaReport', () => {
  it('shows message when no schemas found', () => {
    const out = stripAnsi(formatSchemaReport([]));
    assert.ok(out.includes('No structured data'), 'Expected empty message');
  });

  it('formats detected schemas', () => {
    const results = [
      {
        file: 'index.html',
        schemas: [{ type: 'Organization', format: 'JSON-LD' }],
      },
    ];
    const out = stripAnsi(formatSchemaReport(results));
    assert.ok(out.includes('Schema Report'), 'Expected title');
    assert.ok(out.includes('Organization'), 'Expected schema type');
    assert.ok(out.includes('index.html'), 'Expected file name');
  });
});
