---
name: rank-geo
description: AI search optimization audit. Optimize content for ChatGPT, Perplexity, Google AI Overviews.
---

# GEO Audit — AI Search Optimization

## Phase 1: Scan

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/geo-scanner.mjs <project-directory>
```

## Phase 2: Report

Present GEO findings grouped by:
- **AI Bot Access** — which bots are allowed/blocked in robots.txt
- **Structured Data** — JSON-LD quality for AI extraction
- **Content Structure** — question headers, definitions, citation-ready passages
- **Discoverability** — llms.txt, sitemap, breadcrumbs

## Phase 3: Fix

- Blocked AI bots → update robots.txt: `node ${CLAUDE_PLUGIN_ROOT}/tools/robots-analyzer.mjs generate <dir> <url>`
- Missing llms.txt → generate: `node ${CLAUDE_PLUGIN_ROOT}/tools/llms-txt-generator.mjs <dir>`
- Missing Organization schema → generate: `node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs generate Organization --name="..." --url="..."`
- Missing Author schema → generate Person schema with credentials
- No question H2s → rewrite key H2 headers as "What is...", "How does...", "Why..."
- No TL;DR patterns → add 1-2 sentence summaries under important H2 sections
- No definition patterns → add "[Product] is [clear definition]" in opening paragraphs

## Phase 4: Verify

Re-run geo-scanner. Show before/after GEO score.

## Phase 5: Advanced Guidance

Advise user to:
1. Search top 5 keywords in ChatGPT, Perplexity, Google AI Overviews
2. Note which competitors are cited
3. Create citation-ready content for each gap (134-167 word passages)
4. Add comparison tables and statistics (156% higher AI selection with multimedia)
