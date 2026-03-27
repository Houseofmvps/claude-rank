# claude-rank

## Project Overview
- **Name**: claude-rank
- **npm**: `claude-rank` (published under Houseofmvps)
- **GitHub**: https://github.com/Houseofmvps/claude-rank
- **Description**: The most comprehensive SEO/GEO/AEO plugin for Claude Code. Audit, fix, and dominate search — traditional and AI.
- **License**: MIT

## Architecture

```
claude-rank/
├── bin/              # CLI entry point (claude-rank.mjs)
├── tools/            # Core scanning tools (seo-scanner, geo-scanner, aeo-scanner)
│   └── lib/          # Shared utilities (security.mjs, file-utils.mjs, etc.)
├── skills/           # Claude Code skill definitions (.md files, max 500 lines each)
├── agents/           # Autonomous agent definitions
├── commands/         # Slash command implementations
├── hooks/            # Claude Code lifecycle hooks
├── research/         # Research prompts and templates
├── tests/            # Node --test based tests
│   └── fixtures/     # Test HTML/JSON fixtures
└── .claude-plugin/   # Plugin manifest (plugin.json)
```

## Tech Stack
- **Runtime**: Node.js >= 18, ESM only (`"type": "module"`)
- **Dependencies**: `htmlparser2` for HTML parsing (no build step required)
- **No TypeScript**: Plain ESM `.mjs` files throughout
- **No bundler**: Direct node execution

## Conventions

### Code
- All files use `.mjs` extension (ESM modules)
- File naming: kebab-case always (e.g., `seo-scanner.mjs`, `geo-checker.mjs`)
- Tools output JSON to stdout, exit code 0 on success
- Use `execFileSync` only (never `execSync` with shell strings) to prevent injection
- SSRF protection: always validate URLs via `tools/lib/security.mjs` before fetching
- Always call `checkFileSize(path)` from `tools/lib/file-utils.mjs` before `readFileSync`
- Skill files: max 500 lines per SKILL.md

### Scoring System
- All scores: 0-100 (higher is better)
- Deductions:
  - `critical`: -20 points
  - `high`: -10 points
  - `medium`: -5 points
  - `low`: -2 points
- Separate scores for SEO, GEO, and AEO — plus an overall composite

### Terminology (CRITICAL — do not mix up)
- **GEO** = Generative Engine Optimization (optimization for AI search engines like Perplexity, ChatGPT, Gemini) — NOT geographic
- **AEO** = Answer Engine Optimization (optimization for featured snippets, People Also Ask, voice search)
- **SEO** = Traditional Search Engine Optimization (Google, Bing crawlability, indexability, on-page)

## Git
- Commits: `user.email = houseofmvps2024@gmail.com`, `user.name = Houseofmvps`
- Commit style: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)

## Publishing
- npm publish with granular token via `.npmrc`
- `houseofmvps` account has 2FA enabled — use granular access token, not legacy token
- Do not `npm publish` without setting token in `.npmrc` first
