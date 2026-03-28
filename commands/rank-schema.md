---
description: "Structured data management. Detect, validate, generate, and inject JSON-LD schema."
---

## Syntax

```
/claude-rank:rank-schema [directory]
```

## What It Does

1. **Detect** — finds all JSON-LD in HTML files
2. **Validate** — checks against Google's required fields (14 schema types)
3. **Recommend** — suggests missing schema based on page content
4. **Generate** — creates JSON-LD for Organization, Article, FAQPage, HowTo, etc.
5. **Verify** — re-runs detection to confirm injection

## Example

```
/claude-rank:rank-schema ./my-site
```
