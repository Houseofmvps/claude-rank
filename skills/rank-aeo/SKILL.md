---
name: rank-aeo
description: Answer engine optimization. Optimize for featured snippets, voice search, People Also Ask.
---

# AEO Audit — Answer Engine Optimization

## Phase 1: Scan

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/aeo-scanner.mjs <project-directory>
```

## Phase 2: Report

Present AEO findings:
- **Schema** — FAQPage, HowTo, speakable, Article/BlogPosting
- **Snippet Readiness** — direct answers, numbered steps, concise paragraphs
- **Voice Search** — conversational patterns, 29-word answer targets

## Phase 3: Fix

- Missing FAQPage → detect Q&A patterns in content, generate schema: `node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs generate FAQPage`
- Missing speakable → add speakable schema targeting key answer sections
- Long answers → restructure to 40-60 word direct answers after question H2s
- No numbered steps → convert procedural content to ordered lists
- Missing featured image → flag for user to add hero image

## Phase 4: Verify

Re-run aeo-scanner. Show before/after AEO score.

## Phase 5: Voice Search Guidance

- Target conversational long-tail queries ("how do I...", "what is the best...")
- Keep primary answers under 29 words (Google voice search average)
- Add People Also Ask patterns as H2/H3 questions throughout content

## Phase 6: Search Console Submission

After deploying AEO fixes, submit to search engines to trigger rich result processing:

### Google Search Console
1. **Request indexing** for pages with new FAQ/HowTo/speakable schema — URL Inspection → Request Indexing
2. **Check Rich Results** — Enhancements → FAQPage / HowTo / Breadcrumbs / Article
   - Verify new schema is detected and valid (no errors)
   - Common issues: missing `image` in Article, missing `acceptedAnswer` in FAQ
3. **Test individual pages** — Use [Rich Results Test](https://search.google.com/test/rich-results) before and after fixes
4. **Monitor Featured Snippets** — Performance → Search Appearance → filter by "Featured snippets"
   - Track which pages win snippets after AEO optimization
   - If pages lose snippets, check if answer length changed (40-60 words optimal)

### Bing Webmaster Tools
1. **Submit URLs** — URL Submission → submit all pages with new schema
2. **Verify schema** — Bing supports FAQPage, HowTo, and speakable in its rich results
3. **Enable IndexNow** — instant re-indexing after schema changes

### Track Featured Snippet Wins
1. In GSC → Performance → Search Appearance → "Featured snippets"
2. Export the list of queries where your pages appear as featured snippets
3. For queries where competitors hold the snippet, optimize those pages:
   - Add a direct answer in the first 40-60 words after the question H2
   - Use numbered lists for "how to" queries
   - Use definition format ("X is...") for "what is" queries
4. Recheck weekly — featured snippet ownership changes frequently
