# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-03-28

### Added

- Full SEO audit with 37 rules covering crawlability, indexability, on-page optimization, and technical health
- GEO (Generative Engine Optimization) audit with 25 rules targeting AI search engines: Perplexity, ChatGPT Search, Gemini, and 6 others
- AEO (Answer Engine Optimization) audit with 12 rules for featured snippets, People Also Ask, and voice search
- `/rank` slash command — main orchestrator for Claude Code
- `/rank audit` — full 8-phase SEO/GEO/AEO audit with auto-fix suggestions
- `/rank geo` — deep GEO audit for AI search visibility
- `/rank aeo` — answer engine optimization audit
- `/rank fix` — auto-fix all findings in one command
- `/rank schema` — detect, validate, generate, and inject JSON-LD structured data
- CLI commands: `scan`, `geo`, `aeo`, `schema`
- Auto-fix generators for robots.txt, sitemap.xml, llms.txt, and JSON-LD schema
- Score tracking with trend history (0-100 scale, severity-weighted deductions)
- Separate SEO, GEO, and AEO scores plus composite score
- Cross-page analysis
- AI bot detection for 9 major bots
- Security utilities: SSRF protection, file size checks, `execFileSync`-only subprocess calls
- Single runtime dependency: `htmlparser2`
- Node.js >= 18, ESM-only

[1.0.0]: https://github.com/Houseofmvps/claude-rank/releases/tag/v1.0.0
