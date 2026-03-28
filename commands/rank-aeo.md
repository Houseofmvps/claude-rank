---
description: "Answer engine optimization. Featured snippets, voice search, People Also Ask."
---

## Syntax

```
/claude-rank:rank-aeo [directory]
```

## What It Does

1. Checks for FAQPage, HowTo, speakable schema
2. Analyzes snippet fitness (answer length, numbered steps, direct answers)
3. Evaluates voice search readiness (20-35 word concise answers)
4. Generates missing schema (FAQPage, HowTo, speakable)

## Example

```
/claude-rank:rank-aeo ./my-blog
```
