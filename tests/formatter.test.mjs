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
  it('shows Excellent for score >= 90', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 95 })));
    assert.ok(out.includes('Excellent'), 'Expected Excellent label');
  });

  it('shows Good for score >= 80', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 85 })));
    assert.ok(out.includes('Good'), 'Expected Good label');
  });

  it('shows Needs Work for score >= 70', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 72 })));
    assert.ok(out.includes('Needs Work'), 'Expected Needs Work label');
  });

  it('shows Poor for score < 60', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 40 })));
    assert.ok(out.includes('Poor'), 'Expected Poor label');
  });
});

// ---------------------------------------------------------------------------
// Score display
// ---------------------------------------------------------------------------

describe('formatSeoReport score display', () => {
  it('contains the numeric score', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ score: 72 })));
    assert.ok(out.includes('72'), 'Expected score 72 in output');
  });

  it('contains files scanned count', () => {
    const out = stripAnsi(formatSeoReport(makeScanResult({ filesScanned: 26 })));
    assert.ok(out.includes('Files scanned:') && out.includes('26'), 'Expected files scanned count');
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
  it('returns a string with all-clear message', () => {
    const out = formatSeoReport(makeScanResult({ score: 100, findings: [] }));
    assert.ok(typeof out === 'string', 'Expected string output');
    assert.ok(stripAnsi(out).includes('All checks passed'), 'Should show all-clear message when empty');
    assert.ok(!stripAnsi(out).includes('Must Fix'), 'Should not list Must Fix section');
    assert.ok(!stripAnsi(out).includes('Should Fix'), 'Should not list Should Fix section');
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
    assert.ok(out.includes('80'), 'Expected score');
  });
});

describe('formatAeoReport', () => {
  it('shows AEO Audit title and score', () => {
    const out = stripAnsi(formatAeoReport(makeScanResult({ score: 55, scoreKey: 'aeo' })));
    assert.ok(out.includes('AEO Audit'), 'Expected AEO Audit title');
    assert.ok(out.includes('55'), 'Expected score');
  });
});

// ---------------------------------------------------------------------------
// Fix hints
// ---------------------------------------------------------------------------

describe('formatSeoReport fix hints', () => {
  it('shows fix suggestions for known rules', () => {
    const findings = [
      { rule: 'missing-title', severity: 'high', file: 'page.html', message: 'Page is missing a <title> tag' },
    ];
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    assert.ok(out.includes('Add <title>'), 'Expected fix hint for missing-title');
  });

  it('shows next steps section', () => {
    const findings = [
      { rule: 'thin-content', severity: 'high', file: 'page.html', message: 'Too thin' },
    ];
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    assert.ok(out.includes('Next Steps'), 'Expected Next Steps section');
  });
});

// ---------------------------------------------------------------------------
// Severity grouping
// ---------------------------------------------------------------------------

describe('formatSeoReport severity sections', () => {
  it('groups critical/high as Must Fix', () => {
    const findings = [
      { rule: 'has-noindex', severity: 'critical', file: 'page.html', message: 'Has noindex' },
    ];
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    assert.ok(out.includes('Must Fix'), 'Expected Must Fix section for critical findings');
  });

  it('groups medium as Should Fix', () => {
    const findings = [
      { rule: 'missing-viewport', severity: 'medium', file: 'page.html', message: 'Missing viewport' },
    ];
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    assert.ok(out.includes('Should Fix'), 'Expected Should Fix section');
  });

  it('groups low as Nice to Have', () => {
    const findings = [
      { rule: 'no-manifest', severity: 'low', file: 'page.html', message: 'Missing manifest' },
    ];
    const out = stripAnsi(formatSeoReport(makeScanResult({ findings })));
    assert.ok(out.includes('Nice to Have'), 'Expected Nice to Have section');
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
