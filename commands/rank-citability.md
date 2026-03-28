---
name: rank-citability
description: Score how likely AI search engines are to cite your content.
---

# AI Citability Score

Run the 7-dimension citability analysis to score how likely AI engines are to cite your pages.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/citability-scorer.mjs <directory>
```

Dimensions scored:
1. **Statistic Density** (0-15) — data points per 200 words
2. **Front-loading** (0-15) — key answer in first 30% of content
3. **Source Citations** (0-15) — links to .edu/.gov/research domains
4. **Expert Attribution** (0-15) — Person schema, author bios, quotes
5. **Definition Clarity** (0-10) — "X is..." patterns
6. **Schema Completeness** (0-15) — Organization + Author + Article + FAQ + Breadcrumb
7. **Content Structure** (0-15) — headings, lists, paragraphs

Present per-page scores ranked best to worst, plus actionable recommendations.
