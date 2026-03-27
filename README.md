<div align="center">

# claude-rank

### The most comprehensive SEO/GEO/AEO plugin for Claude Code. 74+ rules. Auto-fix everything. Dominate search — traditional and AI.

[![npm version](https://img.shields.io/npm/v/%40houseofmvps%2Fclaude-rank?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/@houseofmvps/claude-rank)
[![npm downloads](https://img.shields.io/npm/dm/%40houseofmvps%2Fclaude-rank?style=for-the-badge&logo=npm&color=blue&label=Monthly%20Downloads)](https://www.npmjs.com/package/@houseofmvps/claude-rank)
[![npm total](https://img.shields.io/npm/dt/%40houseofmvps%2Fclaude-rank?style=for-the-badge&logo=npm&color=cyan&label=Total%20Downloads)](https://www.npmjs.com/package/@houseofmvps/claude-rank)
[![GitHub stars](https://img.shields.io/github/stars/Houseofmvps/claude-rank?style=for-the-badge&logo=github&color=gold)](https://github.com/Houseofmvps/claude-rank/stargazers)
[![GitHub watchers](https://img.shields.io/github/watchers/Houseofmvps/claude-rank?style=for-the-badge&logo=github&color=orange)](https://github.com/Houseofmvps/claude-rank/watchers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=opensourceinitiative)](LICENSE)
[![Sponsor](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/Houseofmvps)

---

[![Follow @kaileskkhumar](https://img.shields.io/badge/Follow%20%40kaileskkhumar-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/kaileskkhumar)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/kailesk-khumar)
[![houseofmvps.com](https://img.shields.io/badge/houseofmvps.com-Website-green?style=for-the-badge&logo=google-chrome&logoColor=white)](https://houseofmvps.com)

**Built by [Kailesk Khumar](https://www.linkedin.com/in/kailesk-khumar), solo founder of [houseofmvps.com](https://houseofmvps.com)**

*One indie hacker. One plugin. Every search engine covered.*

</div>

---

## Quick Start

### Install as a Claude Code plugin (recommended)

```bash
claude plugin add @houseofmvps/claude-rank
```

That's it. Restart Claude Code and all 6 skills + 4 agents are active.

### Or use standalone — no plugin install needed

```bash
npx @houseofmvps/claude-rank scan ./my-project
npx @houseofmvps/claude-rank geo ./my-project
npx @houseofmvps/claude-rank aeo ./my-project
npx @houseofmvps/claude-rank schema ./my-project
```

### Or install globally

```bash
npm install -g @houseofmvps/claude-rank
claude-rank scan ./my-project
```

### Use in Claude Code

Once installed, use slash commands inside any Claude Code session:

```
/rank          # Smart routing — detects what your project needs
/rank audit    # Full 8-phase SEO/GEO/AEO audit with auto-fix
/rank geo      # Deep AI search optimization audit
/rank aeo      # Answer engine optimization audit
/rank fix      # Auto-fix all findings in one command
/rank schema   # Detect, validate, generate, inject JSON-LD
```

**Zero configuration.** claude-rank reads your project structure and self-configures.

---

## The Problem

You shipped your SaaS. Traffic is flat. You Google your product name — page 3. You ask ChatGPT about your niche — your site isn't mentioned. Perplexity doesn't cite you. Google AI Overviews skips you entirely.

Most SEO tools check title tags and call it a day. They don't know that:

- **AI search engines are replacing traditional search** — and your content isn't optimized for them
- **Featured snippets and voice search** have completely different optimization rules than regular SEO
- **Your robots.txt is blocking GPTBot, PerplexityBot, and ClaudeBot** — AI can't cite what it can't crawl
- **You don't have an llms.txt** — the file AI assistants look for to understand your project
- **Your structured data is missing or broken** — you're invisible to rich results

That's not an SEO problem. That's a visibility problem across every search surface that exists in 2026.

## The Solution

```
/rank audit
```

One command. Three scanners run in parallel — SEO, GEO, and AEO. 74+ rules checked. Every finding gets an automated fix. Score tracked over time.

```
SEO Score:   87/100  ████████████░░  (37 rules)
GEO Score:   92/100  █████████████░  (25 rules)
AEO Score:   78/100  ██████████░░░░  (12 rules)
Overall:     86/100  READY TO RANK
```

**Score below 80?** Run `/rank fix` and it auto-generates what's missing — robots.txt, sitemap.xml, llms.txt, JSON-LD schema — then re-scans to show your improvement.

---

## What It Does

### SEO Scanner — 37 Rules

Traditional search optimization. The foundation.

| Category | What it checks |
|---|---|
| **Meta** | Title (length, uniqueness), meta description, viewport, charset, canonical URL, lang attribute |
| **Content** | H1 presence, heading hierarchy, word count, image alt text, thin content detection |
| **Technical** | robots.txt, sitemap.xml, HTTPS, mobile-friendly viewport, analytics detection |
| **Structured Data** | JSON-LD presence, schema validation, required fields |
| **Cross-Page** | Duplicate titles across pages, duplicate descriptions, canonical conflicts, orphan pages |

### GEO Scanner — 25 Rules

Generative Engine Optimization. For AI search engines: ChatGPT, Perplexity, Gemini, Google AI Overviews.

| Category | What it checks |
|---|---|
| **AI Crawlers** | robots.txt rules for 9 bots (GPTBot, PerplexityBot, ClaudeBot, Claude-Web, Google-Extended, CCBot, anthropic-ai, Googlebot, Bingbot) |
| **AI Discoverability** | llms.txt presence, sitemap.xml, structured data quality |
| **Content Structure** | Question-format H2s, definition patterns, statistics, data tables, lists |
| **Citation Readiness** | Passage length (134-167 word sweet spot), direct answers in first 40-60 words |
| **Authority Signals** | Author attribution, organization schema, source citations |

### AEO Scanner — 12 Rules

Answer Engine Optimization. Featured snippets, People Also Ask, voice search.

| Category | What it checks |
|---|---|
| **Schema** | FAQPage, HowTo, speakable, Article structured data |
| **Snippet Fitness** | Answer paragraph length (40-60 words optimal), numbered steps, definition patterns |
| **Voice Search** | Concise answers under 29 words (Google voice search average), conversational phrasing |
| **Rich Results** | Featured image, breadcrumb markup, review schema |

### Auto-Fix Generators

Every finding has a fix. Not "consider adding" — actual file generation:

| Generator | What it creates |
|---|---|
| **robots.txt** | AI-friendly rules allowing all 9 AI crawlers + sitemap directive |
| **sitemap.xml** | Auto-detected routes (Next.js App/Pages Router, static HTML) |
| **llms.txt** | AI discoverability file from your package.json |
| **JSON-LD Schema** | 12 types: Organization, Article, Product, FAQPage, HowTo, LocalBusiness, Person, WebSite, BreadcrumbList, SoftwareApplication, VideoObject, ItemList |

### Schema Engine — Full CRUD

Not just detection. Full lifecycle management:

```
Detect  → Find all JSON-LD in your HTML files
Validate → Check against Google's requirements
Generate → Create missing schema from your project data
Inject   → Add generated schema into your HTML <head>
```

### Score Tracking

Every audit saves your scores. See trends over time:

```
2026-03-25  SEO: 62  GEO: 45  AEO: 38
2026-03-26  SEO: 78  GEO: 72  AEO: 65  (+16, +27, +27)
2026-03-28  SEO: 87  GEO: 92  AEO: 78  (+9, +20, +13)
```

---

## Scoring System

All scores run from 0 to 100. Higher is better. Findings are weighted by severity:

| Severity | Deduction | Example |
|----------|-----------|---------|
| Critical | -20 points | No title tag, robots.txt blocking all crawlers |
| High | -10 points | Missing meta description, no JSON-LD, AI bots blocked |
| Medium | -5 points | Title too long, missing OG tags, no llms.txt |
| Low | -2 points | Missing lang attribute, no analytics detected |

Each audit produces separate SEO, GEO, and AEO scores plus a composite. Same rule on multiple pages = one deduction (not N deductions).

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `claude-rank scan ./project` | Full SEO scan (37 rules) |
| `claude-rank geo ./project` | GEO scan — AI search optimization (25 rules) |
| `claude-rank aeo ./project` | AEO scan — answer engine optimization (12 rules) |
| `claude-rank schema ./project` | Detect structured data across all HTML |
| `claude-rank help` | Show available commands |

## Slash Commands (Claude Code)

| Command | Description |
|---------|-------------|
| `/rank` | Smart routing — detects what your project needs |
| `/rank audit` | Full 8-phase SEO/GEO/AEO audit with auto-fix |
| `/rank geo` | Deep GEO audit targeting AI search visibility |
| `/rank aeo` | Answer engine optimization audit |
| `/rank fix` | Auto-fix all findings in one command |
| `/rank schema` | Detect, validate, generate, inject JSON-LD |

---

## Comparison: claude-rank vs claude-seo

| Feature | claude-rank | claude-seo |
|---------|:-----------:|:----------:|
| SEO rules | 37 | ~20 |
| GEO — AI search (Perplexity, ChatGPT, Gemini) | 25 rules | Basic |
| AEO — featured snippets, voice search | 12 rules | None |
| Auto-fix generators | Yes | No |
| Schema management (detect / validate / generate / inject) | Full CRUD | Detect only |
| Score tracking with history and trends | Yes | None |
| Cross-page analysis (duplicates, orphans, canonicals) | Yes | No |
| AI bot detection | 9 bots | Basic |
| llms.txt generation | Yes | No |
| robots.txt generation | Yes | No |
| sitemap.xml generation | Yes | No |

**claude-seo tells you what's wrong. claude-rank fixes it.**

---

## Terminology

Two terms that matter and are often confused:

- **GEO (Generative Engine Optimization)** — optimization for AI-powered search engines that generate answers (Perplexity, ChatGPT Search, Gemini, Google AI Overviews). This is NOT geographic targeting.
- **AEO (Answer Engine Optimization)** — optimization for direct answer features: featured snippets, People Also Ask, voice assistants.

---

## Security

| Protection | How |
|---|---|
| **No shell injection** | `execFileSync` with array args everywhere — zero shell interpolation |
| **SSRF protection** | All HTTP tools block private IPs, cloud metadata, non-HTTP schemes |
| **No telemetry** | Zero data collection. No phone-home. Ever. |
| **1 dependency** | `htmlparser2` only (30KB). No native bindings. No `node-gyp`. |
| **85 tests** | Security module, all scanners, CLI, integration tests |
| **File safety** | 10MB read cap. 5MB response cap. Restrictive write permissions. |

See [SECURITY.md](SECURITY.md) for the full vulnerability disclosure policy.

---

## What's Inside

| Category | Count | Highlights |
|---|---|---|
| **Tools** | 8 | SEO scanner (37 rules), GEO scanner (25 rules), AEO scanner (12 rules), schema engine, robots analyzer, sitemap analyzer, llms.txt generator, audit history |
| **Skills** | 6 | /rank, /rank audit, /rank geo, /rank aeo, /rank fix, /rank schema |
| **Agents** | 4 | SEO auditor, GEO auditor, AEO auditor, Schema auditor |
| **Commands** | 6 | All slash commands above |
| **Research** | 3 | SEO benchmarks, GEO research, schema catalog |

---

## Requirements

- Node.js >= 18
- ESM environment (no CommonJS)
- No build step required

Single runtime dependency: `htmlparser2` (30KB)

---

## Sponsor This Project

I built claude-rank alone — nights and weekends, between building my own SaaS products. No VC funding. No team. Just one person who got tired of being invisible to AI search and decided to fix it for everyone.

This plugin is **free forever.** No pro tier. No paywalls. No "upgrade to unlock." Every feature you just read about — all 8 tools, 6 skills, 4 agents — is yours, completely free.

But building and maintaining something this comprehensive takes real time. Every scanner rule I add, every false positive I fix, every new AI crawler I track — that's time I'm not spending on my own products.

**If claude-rank helped your site rank higher** — one AI citation it earned you, one missing schema it generated, one robots.txt fix that unblocked GPTBot — I'd be grateful if you considered sponsoring.

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor_on_GitHub-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/Houseofmvps)

Thanks for using claude-rank. Now go dominate every search engine — traditional and AI.

*— [Kailesk Khumar](https://www.linkedin.com/in/kailesk-khumar), solo founder of [houseofmvps.com](https://houseofmvps.com)*

---

## Contributing

Found a bug? Want a new scanner rule? [Open an issue](https://github.com/Houseofmvps/claude-rank/issues) or PR.

```bash
git clone https://github.com/Houseofmvps/claude-rank.git
cd claude-rank
npm install
npm test              # 85 tests, node:test
node tools/<tool>.mjs # No build step
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — [LICENSE](LICENSE). **Free forever.** No pro tier. No paywalls.

---

<div align="center">

**If claude-rank helped you rank higher, [star the repo](https://github.com/Houseofmvps/claude-rank) and tell a friend.**

[![Star on GitHub](https://img.shields.io/github/stars/Houseofmvps/claude-rank?style=for-the-badge&logo=github&color=gold)](https://github.com/Houseofmvps/claude-rank/stargazers)

</div>
