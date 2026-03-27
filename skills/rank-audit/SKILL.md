---
name: rank-audit
description: Full SEO/GEO/AEO audit with auto-fix. Scans, reports, fixes, and verifies.
---

# Full Audit

Comprehensive search optimization audit. Finds issues AND fixes them.

## Phase 1: Parallel Scan

Run all three scanners:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/seo-scanner.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/geo-scanner.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/aeo-scanner.mjs <project-directory>
```

Parse JSON output from each for findings and scores.

## Phase 2: Report

Present findings grouped by category (SEO / GEO / AEO) with severity.
Show scores table: SEO, GEO, AEO, Overall Rank Score.
Show summary: X critical, Y high, Z medium, W low.

## Phase 3: Auto-Fix

For each finding, apply the appropriate fix:

**SEO fixes** (Edit tool on HTML files):
- Missing title → add `<title>` in `<head>`
- Missing meta description → add `<meta name="description">`
- Missing OG tags → generate from page content
- Missing H1 → add heading from page content
- Missing alt text → add descriptive alt attributes
- Missing canonical → add `<link rel="canonical">`
- Missing sitemap → run: `node ${CLAUDE_PLUGIN_ROOT}/tools/sitemap-analyzer.mjs generate <dir> <url>`
- Missing robots.txt → run: `node ${CLAUDE_PLUGIN_ROOT}/tools/robots-analyzer.mjs generate <dir> <url>`

**GEO fixes**:
- Missing llms.txt → run: `node ${CLAUDE_PLUGIN_ROOT}/tools/llms-txt-generator.mjs <dir>`
- Missing structured data → run: `node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs generate <type> --out=<path>`
- Blocked AI bots → update robots.txt to allow GPTBot, PerplexityBot, ClaudeBot, Google-Extended
- Improve content structure: add question-based H2s, TL;DR summaries, definition patterns

**AEO fixes**:
- Missing FAQ schema → generate FAQPage from Q&A content on page
- Missing speakable → add speakable schema for key content sections
- Snippet optimization → restructure answers to 40-60 word direct answers

## Phase 4: Verify

Re-run all three scanners. Show before/after score comparison.

## Phase 5: Save History

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> seo <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> geo <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> aeo <score>
```

## Phase 6: Content Strategy

Advise on content optimizations the scanner cannot automate:
- Rewrite H2 headers as questions for AI citation
- Add concise TL;DR summaries under key sections
- Write in citation-ready format: factual, quotable, 134-167 word passages
- Create comparison tables, statistics pages, glossaries

## Phase 7: Backlink Strategy

Guide link building: create link-worthy assets, guest posting, broken link building, HARO.

## Phase 8: Next Steps

Recommend which /rank sub-commands to run next based on lowest scores.
