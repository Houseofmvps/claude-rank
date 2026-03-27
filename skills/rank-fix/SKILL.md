---
name: rank-fix
description: Auto-fix all SEO/GEO/AEO findings in one command. Scan, fix, verify.
---

# Auto-Fix All

Fix everything that can be automated in one pass.

## Step 1: Scan

Run all scanners to get current findings:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/seo-scanner.mjs <dir>
node ${CLAUDE_PLUGIN_ROOT}/tools/geo-scanner.mjs <dir>
node ${CLAUDE_PLUGIN_ROOT}/tools/aeo-scanner.mjs <dir>
```

## Step 2: Fix

For each finding, apply automated fix:

**File generation** (create missing files):
- robots.txt → `node ${CLAUDE_PLUGIN_ROOT}/tools/robots-analyzer.mjs generate <dir> <url>`
- sitemap.xml → `node ${CLAUDE_PLUGIN_ROOT}/tools/sitemap-analyzer.mjs generate <dir> <url>`
- llms.txt → `node ${CLAUDE_PLUGIN_ROOT}/tools/llms-txt-generator.mjs <dir>`
- JSON-LD schema → `node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs generate <type> --out=<path>`

**HTML edits** (use Edit tool):
- Missing title, meta description, OG tags, canonical, viewport, charset, lang
- Missing H1, alt text on images, semantic landmarks (main, nav, footer)
- Inject generated schema into head before closing tag

**robots.txt edits** (use Edit tool):
- Unblock AI bots (GPTBot, PerplexityBot, ClaudeBot, Google-Extended)
- Add Sitemap directive

## Step 3: Verify

Re-run all scanners. Report:
- Issues found: X
- Auto-fixed: Y
- Remaining (manual): Z
- Score improvement: before → after

## Step 4: Save History

Save new scores via audit-history tool.
