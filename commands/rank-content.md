---
name: rank-content
description: Analyze content quality — readability, duplicates, internal linking.
---

# Content Analysis

Run content intelligence analysis on all HTML pages.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/content-analyzer.mjs <directory>
```

Analysis includes:
- **Readability** — Flesch-Kincaid and Gunning Fog scores per page
- **Passive Voice** — percentage of passive sentences
- **Duplicate Detection** — Jaccard similarity across pages (>70% flagged)
- **Thin Content** — pages under 300 words
- **Wall of Text** — paragraphs over 150 words
- **Internal Linking** — suggestions for pages with shared topics

Present per-page analysis table and actionable recommendations.
