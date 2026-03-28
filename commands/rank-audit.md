---
description: "Full SEO/GEO/AEO audit with auto-fix. Scans, reports, fixes, and verifies."
---

## Syntax

```
/claude-rank:rank-audit [directory]
```

Directory defaults to `.` (current directory) if omitted.

## What It Does

1. Runs all 10 scanners: SEO (54 rules), GEO (45 rules), AEO (12 rules), Citability (7 dimensions), Content, Keywords, Performance (21 rules), Vertical (20 rules), Security (15 rules), Content Brief
2. Reports findings grouped by severity
3. Auto-fixes: generates robots.txt, sitemap.xml, llms.txt, JSON-LD schema
4. Re-scans to verify improvements
5. Saves score history for trend tracking
6. Outputs Google Search Console + Bing Webmaster Tools action plan

## Example

```
/claude-rank:rank-audit ./my-saas-landing
```
