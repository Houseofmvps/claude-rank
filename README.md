# claude-rank

**The most comprehensive SEO/GEO/AEO plugin for Claude Code.**

Audit, fix, and dominate search — traditional and AI.

[![npm version](https://img.shields.io/npm/v/%40houseofmvps%2Fclaude-rank.svg)](https://www.npmjs.com/package/@houseofmvps/claude-rank)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

---

## What it does

- **74+ audit rules** across SEO (37), GEO (25), and AEO (12) — the widest coverage of any Claude Code SEO plugin
- **Auto-fix generators** for robots.txt, sitemap.xml, llms.txt, and JSON-LD structured data — findings become fixes in one command
- **Score tracking with trend history** — see whether your site is improving or declining over time

## Why it exists

Most SEO tools stop at traditional search. claude-rank covers the full picture:

- **GEO (Generative Engine Optimization)** — 25 rules targeting AI search engines: Perplexity, ChatGPT, Gemini. As AI-powered search displaces ten blue links, your content needs to be citable, structured, and authoritative for language models — not just crawlers.
- **AEO (Answer Engine Optimization)** — 12 rules for featured snippets, People Also Ask boxes, and voice search. Zero of these are in claude-seo.
- **Auto-fix** — claude-seo tells you what's wrong. claude-rank fixes it.

---

## Quick start

No install required:

```bash
npx @houseofmvps/claude-rank scan ./my-project
```

Or install globally:

```bash
npm install -g @houseofmvps/claude-rank
```

Then use slash commands directly inside Claude Code:

```
/rank audit
```

---

## CLI commands

| Command | Description |
|---------|-------------|
| `npx @houseofmvps/claude-rank scan ./project` | Full SEO scan |
| `npx @houseofmvps/claude-rank geo ./project` | GEO (AI search) scan |
| `npx @houseofmvps/claude-rank aeo ./project` | AEO (answer engine) scan |
| `npx @houseofmvps/claude-rank schema ./project` | Structured data detection |

---

## Slash commands (Claude Code)

| Command | Description |
|---------|-------------|
| `/rank` | Main orchestrator — routes to the right audit based on context |
| `/rank audit` | Full 8-phase SEO/GEO/AEO audit with auto-fix suggestions |
| `/rank geo` | Deep GEO audit targeting AI search engine visibility |
| `/rank aeo` | Answer engine optimization audit |
| `/rank fix` | Auto-fix all findings in one command |
| `/rank schema` | Detect, validate, generate, and inject JSON-LD structured data |

---

## Scoring system

All scores run from 0 to 100. Higher is better.

Findings are weighted by severity:

| Severity | Score deduction |
|----------|----------------|
| Critical | -20 points |
| High | -10 points |
| Medium | -5 points |
| Low | -2 points |

Each audit produces separate SEO, GEO, and AEO scores, plus a composite score. Score history is tracked per project so you can see trends over time.

---

## Comparison: claude-rank vs claude-seo

| Feature | claude-rank | claude-seo |
|---------|:-----------:|:----------:|
| SEO rules | 37 | ~20 |
| GEO — AI search (Perplexity, ChatGPT, Gemini) | 25 rules | Basic |
| AEO — featured snippets, voice search | 12 rules | None |
| Auto-fix generators | Yes | No |
| Schema management (detect / validate / generate / inject) | Full | Detect only |
| Score tracking with history and trends | Yes | None |
| Cross-page analysis | Yes | No |
| AI bot detection | 9 bots | Basic |
| llms.txt generation | Yes | No |

---

## Terminology

Two terms that matter and are often confused:

- **GEO (Generative Engine Optimization)** — optimization for AI-powered search engines that generate answers (Perplexity, ChatGPT Search, Gemini). This is NOT geographic targeting.
- **AEO (Answer Engine Optimization)** — optimization for direct answer features: featured snippets, People Also Ask, voice assistants.

---

## Requirements

- Node.js >= 18
- ESM environment (no CommonJS)
- No build step required

Single runtime dependency: `htmlparser2`

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md) for our vulnerability disclosure policy.

## Support

See [SUPPORT.md](./SUPPORT.md) for how to get help.

## License

MIT — see [LICENSE](./LICENSE).

---

Built by [Houseofmvps](https://houseofmvps.com).
