---
description: "Competitive X-Ray. Compare your site's SEO signals, tech stack, content depth, and conversion patterns against any competitor URL."
---

## Syntax

```
/claude-rank:rank-compete <competitor-url> [your-directory]
```

## What It Does

1. **Fetches** the competitor URL (with SSRF protection and redirect tracking)
2. **Detects tech stack** — frameworks, CDNs, analytics, payments, chat tools (50+ patterns)
3. **Compares SEO signals** — meta tags, Open Graph, structured data, canonical URLs
4. **Measures content depth** — word count, heading structure, internal/external links
5. **Identifies conversion signals** — CTAs, pricing pages, social proof, demo booking
6. **Outputs side-by-side comparison** with signal-by-signal verdicts (You vs Them)

## Output

- Score summary (wins, losses, ties)
- Signal-by-signal comparison table
- Tech stack comparison
- Conversion signal comparison
- Quick wins (gaps to close)
- Your strengths (advantages to keep)

## Example

```
/claude-rank:rank-compete https://competitor.com ./my-project
```
