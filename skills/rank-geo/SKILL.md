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

## Phase 5: Search Console Submission

After deploying GEO fixes, submit to search engines so AI crawlers pick up the changes:

### Google Search Console
1. **Resubmit sitemap** — Sitemaps → Resubmit `sitemap.xml` (triggers recrawl)
2. **Request indexing** for pages where you unblocked AI bots or added schema — URL Inspection → Request Indexing
3. **Check robots.txt** — Settings → Crawling → verify your updated robots.txt is live (AI bots unblocked)

### Bing Webmaster Tools
1. **Submit URLs** — URL Submission → submit pages with new schema/content structure
2. **Verify robots.txt** — Bingbot feeds Microsoft Copilot and ChatGPT Browse — keeping it unblocked is essential
3. **Enable IndexNow** — Near-instant indexing for Bing, Yandex, Seznam. Generate key at indexnow.org

### AI Search Verification (wait 2-4 weeks)
1. Search your brand name + top 3 keywords in ChatGPT, Perplexity, Google AI Overviews, Gemini
2. Screenshot results as a baseline
3. Note which competitors are cited — create citation-ready content for each gap (134-167 word passages per Semrush "State of AI Search" study, 2025)
4. Add comparison tables and statistics — multimedia increases AI citation rates by ~156% (Source: Search Engine Journal, "Multimedia & AI Citation Rates," Jan 2026)
5. Set up weekly monitoring — track your AI citation rate vs competitors
