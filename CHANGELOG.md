# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.9.2] — 2026-03-29

### Fixed
- **SaaS false positive** — vertical scanner no longer misclassifies SaaS sites as e-commerce (split strong/weak signals, raised threshold, skip SoftwareApplication pages)
- **Content linking suggestions** — formatter now displays topic + pages correctly (was showing "undefined")
- **Readability scores** — Flesch-Kincaid and Gunning Fog display actual values (was showing dashes)
- **Keyword gap noise** — added 50+ stopwords and raised TF-IDF threshold to filter generic words from content gap suggestions

## [1.9.1] — 2026-03-29

### Fixed
- Node 18 compatibility — replaced `import.meta.dirname` (Node 21.2+) with `fileURLToPath` polyfill in all test files
- GitHub Actions CI added (Node 18/20/22)
- All versions synced across package.json, plugin.json, marketplace.json, llms.txt

## [1.9.0] — 2026-03-28

### Added
- **Keyword clustering** — TF-IDF keyword extraction, topic clusters, cannibalization detection, content gaps, pillar page suggestions
- **Content brief generator** — SEO-optimized writing outlines with title, word count target, H2 outline, questions to answer, internal linking, related keywords, GEO tips
- **E-E-A-T scoring** — 5 new GEO rules: author bio, credentials/expertise, about/team page links, review/testimonial trust signals, external authority links (.edu/.gov/.org)
- **Broken internal link detection** — filesystem-based resolution in SEO scanner
- **Image optimization audit** — 3 new perf rules: responsive images (srcset), modern formats (WebP/AVIF), sizes attribute
- **Enhanced content analysis** — orphan page detection, topic cluster grouping, hub page identification
- 5 new agents: citability, content, performance, vertical, security auditors
- `keyword` and `brief` CLI commands with formatters and HTML report sections
- 21 new tests (372 total)

### Fixed
- **Scoring inconsistency** — GEO and AEO scanners now deduct per unique rule (via Set), matching SEO scorer. Previously deducted per finding, unfairly penalizing multi-page sites.

## [1.8.0] — 2026-03-28

### Added
- **AI Citability Scorer** — 7-dimension scoring: statistic density, front-loading, source citations, expert attribution, definition clarity, schema completeness, content structure
- **Content Intelligence** — readability analysis (Flesch-Kincaid, Gunning Fog), passive voice detection, duplicate content (Jaccard similarity), thin content, wall-of-text detection, internal linking suggestions
- **Performance Scanner** — 13 rules: CLS risk, render-blocking scripts, inline CSS/JS, resource hints, lazy loading, fetchpriority, font-display, mixed content
- **Vertical SEO Scanner** — 20 rules: auto-detects e-commerce (Product/Offer schema, reviews, breadcrumbs) and local business (LocalBusiness schema, NAP, maps, tel: links)
- **Security Scanner** — 15 rules: HTTPS enforcement, CSP, X-Frame-Options, Referrer-Policy, SRI, inline handlers, form security, iframe sandbox
- 5 new CLI commands: `citability`, `content`, `perf`, `vertical`, `security`
- 5 new slash commands and skill definitions
- HTML report expanded to all 8 scanners with score rings and detailed sections
- Professional CLI formatter with fix hints for all scanners

## [1.7.0] — 2026-03-27

### Added
- **Competitive X-Ray** — compare your site vs any competitor URL side-by-side
- 50+ tech stack detection patterns (Wappalyzer-style): frameworks, CDNs, analytics, CMS, payments, chat
- Signal-by-signal comparison: SEO signals, content depth, conversion signals, structured data, performance
- 24 conversion signal patterns: CTAs, pricing, demo booking, social proof, waitlists
- `compete` CLI command with `--json` output
- `/rank-compete` slash command

### Changed
- Redesigned CLI output — professional formatting with fix hints and next steps

## [1.6.0] — 2026-03-27

### Fixed
- 5 bugs and 8 SEO improvements from brutal end-to-end audit
- Deeper GEO scanner expanded to 34 rules
- No-args guard prevents scanning entire filesystem
- Progress indicators for multi-page scans

## [1.5.0] — 2026-03-26

### Added
- Redirect chain detection (flags chains with 2+ hops)
- Schema validation against Google's required fields (14 schema types)
- Core Web Vitals via Lighthouse (zero-install, uses `npx -y lighthouse@12`)
- GSC/Bing post-audit action plans
- Upgraded agent definitions with project-type awareness

### Fixed
- Threshold check for URL scans
- File count display for single-URL scans

## [1.3.0] — 2026-03-26

### Added
- Multi-page URL crawling (BFS, up to 50 pages, 3 concurrent fetches)
- Cross-page analysis: duplicate titles, duplicate descriptions, canonical conflicts
- HTML report export (`--report html`) — dark theme, score cards, findings table
- CI/CD threshold mode (`--threshold N`) — exit code 1 if score below threshold
- Page-type detection — suppresses false positives on contact/terms/privacy pages

## [1.2.0] — 2026-03-25

### Added
- URL-based scanning — scan live pages via HTTP (`claude-rank scan https://example.com`)
- Pretty terminal output for CLI reports

## [1.1.0] — 2026-03-25

### Fixed
- Eliminated false positives found during real-world testing on savemrr.co

## [1.0.0] — 2026-03-24

### Added
- SEO scanner with 37 rules: meta tags, headings, structured data, crawlability, cross-page analysis
- GEO scanner with 25 rules: AI crawler detection (9 bots), llms.txt, citation-friendly content
- AEO scanner with 12 rules: featured snippets, FAQPage/HowTo schema, voice search, speakable
- Schema engine: detect, validate, generate, inject 12 JSON-LD types
- Auto-fix generators: robots.txt, sitemap.xml, llms.txt, JSON-LD
- Score tracking with trend history
- 6 slash commands: `/rank`, `/rank-audit`, `/rank-geo`, `/rank-aeo`, `/rank-fix`, `/rank-schema`
- 4 agents: SEO, GEO, AEO, Schema auditors
- Security: SSRF protection, file size limits, execFileSync-only
- Single dependency: htmlparser2
- Node.js >= 18, ESM-only

[1.9.2]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.9.2
[1.9.1]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.9.1
[1.9.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.9.0
[1.8.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.8.0
[1.7.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.7.0
[1.6.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.6.0
[1.5.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.5.0
[1.3.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.3.0
[1.2.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.2.0
[1.1.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.1.0
[1.0.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.0.0
