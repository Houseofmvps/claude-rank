---
description: "Full SEO/GEO/AEO audit with auto-fix. Scans, reports, fixes, and verifies."
---

## Syntax

```
/claude-rank:rank-audit [directory]
```

Directory defaults to `.` (current directory) if omitted.

## What It Does

1. Runs SEO scanner (39+ rules), GEO scanner (34 rules), AEO scanner (12 rules)
2. Reports findings grouped by severity
3. Auto-fixes: generates robots.txt, sitemap.xml, llms.txt, JSON-LD schema
4. Re-scans to verify improvements
5. Saves score history for trend tracking
6. Outputs Google Search Console + Bing Webmaster Tools action plan

## Example

```
/claude-rank:rank-audit ./my-saas-landing
```
