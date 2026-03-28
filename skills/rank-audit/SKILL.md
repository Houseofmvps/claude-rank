---
name: rank-audit
description: Full SEO/GEO/AEO/Citability/Content/Performance/Vertical/Security audit with auto-fix. Scans, reports, fixes, and verifies.
---

# Full Audit

Comprehensive search optimization audit across 8 dimensions. Finds issues AND fixes them.

## Phase 1: Parallel Scan

Run all eight scanners:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/seo-scanner.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/geo-scanner.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/aeo-scanner.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/citability-scorer.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/content-analyzer.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/perf-scanner.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/vertical-scanner.mjs <project-directory>
node ${CLAUDE_PLUGIN_ROOT}/tools/security-scanner.mjs <project-directory>
```

Parse JSON output from each for findings and scores.

## Phase 2: Report

Present findings grouped by all 8 categories with severity.

Show scores table:
| Category    | Score |
|-------------|-------|
| SEO         | --    |
| GEO         | --    |
| AEO         | --    |
| Citability  | --    |
| Content     | --    |
| Performance | --    |
| Vertical    | --    |
| Security    | --    |
| **Overall** | --    |

Show summary: X critical, Y high, Z medium, W low across all categories.

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

**Performance fixes**:
- Missing image dimensions → add `width` and `height` attributes to all `<img>` tags
- Render-blocking scripts → add `async` or `defer` to third-party `<script>` tags
- Font display issues → add `font-display: swap` to `@font-face` declarations
- Lazy loading → add `loading="lazy"` to below-fold images
- LCP priority → add `fetchpriority="high"` to the LCP image (hero/above-fold)
- Missing preconnect → add `<link rel="preconnect">` hints for third-party origins (fonts, CDNs, analytics)

**Security fixes**:
- Missing CSP → add `<meta http-equiv="Content-Security-Policy" content="...">` in `<head>`
- Missing referrer policy → add `<meta name="referrer" content="strict-origin-when-cross-origin">`
- Unsafe target="_blank" → add `rel="noopener noreferrer"` to all `target="_blank"` links
- Unsandboxed iframes → add `sandbox` attribute to `<iframe>` elements
- Mixed content → fix `http://` URLs to `https://` in src, href, and content attributes

**Content fixes**:
- Long paragraphs → break up paragraphs longer than 150 words into smaller chunks
- Complex sentences → simplify sentences with Flesch-Kincaid grade level > 12
- Passive voice → rewrite passive voice constructions to active voice

**Vertical fixes**:
- Missing Product schema → add Product JSON-LD for e-commerce product pages
- Missing LocalBusiness schema → add LocalBusiness JSON-LD with business details
- Missing NAP data → add Name, Address, Phone in structured data and visible on page
- Missing opening hours → add `openingHoursSpecification` to LocalBusiness schema

## Phase 4: Verify

Re-run all eight scanners. Show before/after score comparison for each category.

## Phase 5: Save History

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> seo <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> geo <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> aeo <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> citability <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> content <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> performance <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> vertical <score>
node ${CLAUDE_PLUGIN_ROOT}/tools/audit-history.mjs save <dir> security <score>
```

## Phase 6: Content Strategy

Advise on content optimizations the scanner cannot automate:
- Rewrite H2 headers as questions for AI citation
- Add concise TL;DR summaries under key sections
- Write in citation-ready format: factual, quotable, 134-167 word passages
- Create comparison tables, statistics pages, glossaries

## Phase 7: Backlink Strategy

Guide link building: create link-worthy assets, guest posting, broken link building, digital PR, expert roundups.

## Phase 8: Search Console Action Plan

After fixing issues, guide the user through submitting their improved site to search engines.

### Google Search Console (GSC)

1. **Submit Sitemap** — GSC → Sitemaps → Enter `sitemap.xml` → Submit
2. **Request Indexing for Money Pages** — URL Inspection → paste each fixed page → Request Indexing (10-12/day limit, prioritize homepage, pricing, top landing pages)
3. **Check Index Coverage** — Pages → review "Not indexed" list. "Crawled - currently not indexed" = needs content/links. "Discovered - currently not indexed" = needs internal links.
4. **Validate Robots.txt** — Settings → Crawling → verify AI bots are unblocked
5. **Check Rich Results** — Enhancements → review schema types. Test with [Rich Results Test](https://search.google.com/test/rich-results).
6. **Monitor Core Web Vitals** — Experience → Core Web Vitals → fix "Poor" URLs (LCP, CLS, INP)

### Bing Webmaster Tools

1. **Submit Sitemap** — Configure Sitemaps → submit sitemap.xml URL
2. **Submit URLs** — URL Submission → submit top pages (10,000/day limit)
3. **Enable IndexNow** — Generate key at indexnow.org → place key file at domain root. Feeds Bing, Yandex, Seznam.
4. **Verify Robots.txt** — Configure My Site → Block URLs → Robots.txt Tester. Bingbot feeds Copilot and ChatGPT Browse.

### AI Search Verification

1. **Test AI Visibility** (2-4 weeks after deploy) — search brand + keywords in ChatGPT, Perplexity, Gemini, Google AI Overviews
2. **Verify llms.txt** — confirm `https://yourdomain.com/llms.txt` returns content
3. **Monitor AI Citations Weekly** — track which pages get cited vs competitors in Perplexity and ChatGPT

## Phase 9: Next Steps

Recommend which `/claude-rank` sub-commands to run next based on lowest scores. Prioritize by score:

- If **SEO < 60**, run `/claude-rank:rank-seo` for detailed on-page analysis
- If **GEO < 60**, run `/claude-rank:rank-geo` for AI visibility deep-dive
- If **AEO < 60**, run `/claude-rank:rank-aeo` for snippet and voice optimization
- If **Citability < 50**, run `/claude-rank:rank-citability` for detailed per-page citation breakdown across all 7 dimensions
- If **Content < 50**, run `/claude-rank:rank-content` for readability analysis and thin page identification
- If **Performance < 50**, run `/claude-rank:rank-performance` for CLS/LCP/blocking resource analysis
- If **Vertical < 50**, run `/claude-rank:rank-vertical` for industry-specific schema and optimization
- If **Security < 50**, run `/claude-rank:rank-security` for header analysis and CSP configuration

Present the user with a prioritized action checklist ordered by impact (lowest scores first).
