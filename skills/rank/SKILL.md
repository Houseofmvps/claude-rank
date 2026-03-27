---
name: rank
description: "Main orchestrator for claude-rank SEO/GEO/AEO toolkit. Routes to specialized sub-skills."
---

# Rank — SEO/GEO/AEO Toolkit

## Routing

| Command | Skill | Description |
|---|---|---|
| `/rank` or `/rank status` | (inline) | Quick health check — show all scores |
| `/rank audit [dir]` | rank-audit | Full audit + auto-fix |
| `/rank geo [dir]` | rank-geo | AI search optimization |
| `/rank aeo [dir]` | rank-aeo | Answer engine optimization |
| `/rank fix [dir]` | rank-fix | Auto-fix all findings |
| `/rank schema [dir]` | rank-schema | Schema detect/validate/generate |
| `/rank technical [dir]` | rank-technical | Technical SEO (Phase 2) |
| `/rank content [dir]` | rank-content | E-E-A-T content analysis (Phase 2) |
| `/rank speed [dir]` | rank-speed | Core Web Vitals (Phase 2) |
| `/rank local [dir]` | rank-local | Local SEO (Phase 3) |
| `/rank images [dir]` | rank-images | Image optimization (Phase 3) |
| `/rank competitor [dir]` | rank-competitor | Competitive intelligence (Phase 4) |
| `/rank keywords [dir]` | rank-keywords | Keyword research (Phase 4) |
| `/rank report [dir]` | rank-report | Client report generation (Phase 5) |
| `/rank plan [type]` | rank-plan | Strategic SEO roadmap (Phase 5) |

## Quick Health Check (bare /rank)

1. Run available scanners in parallel:
   - `node ${CLAUDE_PLUGIN_ROOT}/tools/seo-scanner.mjs <dir>`
   - `node ${CLAUDE_PLUGIN_ROOT}/tools/geo-scanner.mjs <dir>`
   - `node ${CLAUDE_PLUGIN_ROOT}/tools/aeo-scanner.mjs <dir>`
2. Display scores table with grades (SEO, GEO, AEO; Technical and Content show "—" until Phase 2)
3. **Overall Rank Score** = weighted average: SEO (40%), GEO (40%), AEO (20%)
4. Show top 3 quick wins (highest-impact fixes)
5. Show trend vs last scan (if history exists)

**Grade thresholds:** A (90-100), B (80-89), C (70-79), D (60-69), F (<60)

## Project Type Detection

Scan for signals to auto-detect:
- **SaaS**: pricing page, free trial CTA, /dashboard route
- **E-commerce**: product pages, cart, checkout, Product schema
- **Local business**: service area, phone, address, Google Maps embed
- **Publisher/Blog**: /blog, article schema, author bios, RSS feed
- **Agency**: client testimonials, case studies, service pages
