<div align="center">

<img src="assets/hero-banner.png" alt="claude-rank — SEO/GEO/AEO Plugin for Claude Code" width="100%"/>

### The most comprehensive SEO/GEO/AEO plugin for Claude Code. 80+ rules. Auto-fix everything. Dominate search — traditional and AI.

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

## See It In Action

```
$ claude-rank scan ./my-saas-landing

╔════════════════════════════════════════════════╗
║          claude-rank SEO Audit                 ║
╠════════════════════════════════════════════════╣
║  Score:  75/100  ███████████░░░░  NEEDS WORK   ║
╠════════════════════════════════════════════════╣
║  Files scanned: 26                             ║
║  Findings: 40                                  ║
║    Critical: 0  High: 0  Medium: 40  Low: 0    ║
╚════════════════════════════════════════════════╝

Findings:
  MEDIUM   title-too-long (18 pages)
           Title is 63 chars (max recommended: 60)
           Files: dist/about/index.html, dist/blog/..., +15 more

  MEDIUM   missing-main-landmark (9 pages)
           Page is missing a <main> landmark element
```

```
$ claude-rank geo ./my-saas-landing

╔════════════════════════════════════════════════╗
║          claude-rank GEO Audit                 ║
╠════════════════════════════════════════════════╣
║  Score:  95/100  ██████████████░  EXCELLENT     ║
╚════════════════════════════════════════════════╝
```

```
$ claude-rank scan https://houseofmvps.com    # Scan any live URL

╔════════════════════════════════════════════════╗
║          claude-rank SEO Audit                 ║
╠════════════════════════════════════════════════╣
║  Score:  83/100  ████████████░░░  GOOD          ║
╚════════════════════════════════════════════════╝
```

*Real output from scanning [savemrr.co](https://savemrr.co) (26-page SaaS landing) and [houseofmvps.com](https://houseofmvps.com).*

---

## Quick Start

### Use standalone — no install needed

```bash
npx @houseofmvps/claude-rank scan ./my-project          # Local directory
npx @houseofmvps/claude-rank scan https://example.com    # Live URL (crawls up to 50 pages)
npx @houseofmvps/claude-rank geo ./my-project            # AI search audit
npx @houseofmvps/claude-rank aeo ./my-project            # Answer engine audit
npx @houseofmvps/claude-rank schema ./my-project         # Structured data
npx @houseofmvps/claude-rank scan ./site --json          # Raw JSON output
npx @houseofmvps/claude-rank scan ./site --report html   # Agency-ready HTML report
npx @houseofmvps/claude-rank scan ./site --threshold 80  # CI/CD mode
```

### Install globally

```bash
npm install -g @houseofmvps/claude-rank
claude-rank scan ./my-project
claude-rank scan https://example.com --pages 20
claude-rank cwv https://example.com    # Core Web Vitals (requires Lighthouse)
```

### Use as a Claude Code Plugin

claude-rank works as a full Claude Code plugin with skills, agents, and slash commands. To install:

**Option 1: Clone and add locally**
```bash
# Clone the repo
git clone https://github.com/Houseofmvps/claude-rank.git

# In Claude Code, add the plugin directory
/plugin install ./claude-rank
```

**Option 2: Install from npm and link**
```bash
# Install the package
npm install -g @houseofmvps/claude-rank

# Find where it's installed
npm root -g
# → /usr/local/lib/node_modules

# In Claude Code, add the plugin directory
/plugin install /usr/local/lib/node_modules/@houseofmvps/claude-rank
```

Once installed, use slash commands inside any Claude Code session:

```
/rank          # Smart routing — detects what your project needs
/rank audit    # Full 9-phase SEO/GEO/AEO audit with auto-fix + GSC action plan
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

One command. Three scanners run in parallel — SEO, GEO, and AEO. 80+ rules checked. Every finding gets an automated fix. Score tracked over time. **Then it tells you exactly what to do in Google Search Console and Bing Webmaster Tools.**

```
SEO Score:   87/100  ████████████░░  (39 rules)
GEO Score:   92/100  █████████████░  (25 rules)
AEO Score:   78/100  ██████████░░░░  (12 rules)
Overall:     86/100  READY TO RANK
```

**Score below 80?** Run `/rank fix` and it auto-generates what's missing — robots.txt, sitemap.xml, llms.txt, JSON-LD schema — then re-scans to show your improvement.

---

## What It Does

### SEO Scanner — 39 Rules

Traditional search optimization. The foundation.

| Category | What it checks |
|---|---|
| **Meta** | Title (length, uniqueness), meta description, viewport, charset, canonical URL, lang attribute |
| **Content** | H1 presence, heading hierarchy, word count, image alt text, thin content detection |
| **Technical** | robots.txt, sitemap.xml, HTTPS, mobile-friendly viewport, analytics detection, redirect chain detection |
| **Structured Data** | JSON-LD presence, schema validation against Google's required fields (14 schema types) |
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

### Core Web Vitals (Lighthouse)

Optional performance scoring powered by Lighthouse:

```bash
npm install -g lighthouse chrome-launcher    # One-time setup
claude-rank cwv https://example.com          # Run CWV audit
```

| Metric | What it measures | Good | Poor |
|---|---|---|---|
| **LCP** | Largest Contentful Paint | < 2.5s | > 4.0s |
| **CLS** | Cumulative Layout Shift | < 0.1 | > 0.25 |
| **FCP** | First Contentful Paint | < 1.8s | > 3.0s |
| **TBT** | Total Blocking Time (proxy for INP) | < 200ms | > 600ms |
| **SI** | Speed Index | < 3.4s | > 5.8s |

Graceful fallback: if Lighthouse isn't installed, claude-rank tells the user how to enable it. No crashes.

### Auto-Fix Generators

Every finding has a fix. Not "consider adding" — actual file generation:

| Generator | What it creates |
|---|---|
| **robots.txt** | AI-friendly rules allowing all 9 AI crawlers + sitemap directive |
| **sitemap.xml** | Auto-detected routes (Next.js App/Pages Router, static HTML) |
| **llms.txt** | AI discoverability file from your package.json |
| **JSON-LD Schema** | 12 types: Organization, Article, Product, FAQPage, HowTo, LocalBusiness, Person, WebSite, BreadcrumbList, SoftwareApplication, VideoObject, ItemList |

### Post-Audit Action Plans (GSC + Bing)

**This is what separates claude-rank from every other SEO scanner.** After fixing issues, it tells you exactly what to do next:

**Google Search Console:**
- Submit your new sitemap.xml
- Request indexing for your money pages (homepage, pricing, top landing pages)
- Check index coverage — fix "Crawled but not indexed" pages
- Validate rich results for new JSON-LD schema
- Monitor Core Web Vitals

**Bing Webmaster Tools:**
- Submit URLs (Bing allows 10,000/day — much more generous than Google)
- Enable IndexNow for near-instant re-indexing
- Verify robots.txt — Bingbot powers Microsoft Copilot and ChatGPT Browse

**AI Search Verification:**
- Test your brand in ChatGPT, Perplexity, Gemini, Google AI Overviews
- Verify llms.txt is accessible
- Weekly monitoring checklist for AI citation tracking

### Schema Engine — Full CRUD

Not just detection. Full lifecycle management:

```
Detect  → Find all JSON-LD in your HTML files
Validate → Check against Google's required fields (14 schema types)
Generate → Create missing schema from your project data
Inject   → Add generated schema into your HTML <head>
```

### Multi-Page URL Crawling

```bash
claude-rank scan https://example.com              # Crawls up to 50 pages
claude-rank scan https://example.com --pages 10    # Limit to 10 pages
claude-rank scan https://example.com --single      # Just one page
```

- BFS crawl following internal links with 3 concurrent fetches
- Cross-page analysis: duplicate titles, duplicate descriptions, canonical conflicts
- Redirect chain detection (flags chains with 2+ hops)

### HTML Report Export

```bash
claude-rank scan ./my-project --report html
```

Generates a self-contained `claude-rank-report.html` — dark theme, score cards, findings table. No external dependencies. Ready to send to clients.

### CI/CD Mode

```bash
claude-rank scan ./my-project --threshold 80
```

Exits with code 1 if score drops below your threshold. Add to your CI pipeline to prevent SEO regressions.

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
| `claude-rank scan ./project` | Full SEO scan (39 rules) |
| `claude-rank scan https://example.com` | Crawl and scan a live site (up to 50 pages) |
| `claude-rank geo ./project` | GEO scan — AI search optimization (25 rules) |
| `claude-rank aeo ./project` | AEO scan — answer engine optimization (12 rules) |
| `claude-rank cwv https://example.com` | Core Web Vitals via Lighthouse (optional) |
| `claude-rank schema ./project` | Detect and validate structured data |
| `claude-rank scan ./site --report html` | Generate agency-ready HTML report |
| `claude-rank scan ./site --threshold 80` | CI mode — exit code 1 if score < 80 |
| `claude-rank scan ./site --json` | Raw JSON output for scripting |
| `claude-rank help` | Show available commands |

## Slash Commands (Claude Code Plugin)

| Command | Description |
|---------|-------------|
| `/rank` | Smart routing — detects what your project needs |
| `/rank audit` | Full 9-phase SEO/GEO/AEO audit with auto-fix + GSC/Bing action plan |
| `/rank geo` | Deep GEO audit targeting AI search visibility |
| `/rank aeo` | Answer engine optimization audit |
| `/rank fix` | Auto-fix all findings in one command |
| `/rank schema` | Detect, validate, generate, inject JSON-LD |

---

## Comparison: claude-rank vs claude-seo

| Feature | claude-rank | claude-seo |
|---------|:-----------:|:----------:|
| SEO rules | 39 | ~20 |
| GEO — AI search (Perplexity, ChatGPT, Gemini) | 25 rules | Basic |
| AEO — featured snippets, voice search | 12 rules | None |
| Core Web Vitals / Lighthouse | Yes (optional) | No |
| Redirect chain detection | Yes | No |
| Schema validation (Google required fields) | 14 types | No |
| Post-audit GSC/Bing action plans | Yes | No |
| Auto-fix generators | Yes | No |
| Schema management (detect / validate / generate / inject) | Full CRUD | Detect only |
| Score tracking with history and trends | Yes | None |
| Cross-page analysis (duplicates, orphans, canonicals) | Yes | No |
| Multi-page URL crawling (up to 50 pages) | Yes | No |
| HTML report export (agency-ready) | Yes | No |
| CI/CD threshold mode | Yes | No |
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
| **200 tests** | Security module, all scanners, CLI, integration tests |
| **File safety** | 10MB read cap. 5MB response cap. Restrictive write permissions. |

See [SECURITY.md](SECURITY.md) for the full vulnerability disclosure policy.

---

## What's Inside

| Category | Count | Highlights |
|---|---|---|
| **Tools** | 9 | SEO scanner (39 rules), GEO scanner (25 rules), AEO scanner (12 rules), Lighthouse/CWV scanner, schema engine, robots analyzer, sitemap analyzer, llms.txt generator, audit history |
| **Skills** | 6 | /rank, /rank audit, /rank geo, /rank aeo, /rank fix, /rank schema |
| **Agents** | 4 | SEO auditor (project-type-aware), GEO auditor (AI readiness levels), AEO auditor (snippet opportunities), Schema auditor (Google validation) |
| **Commands** | 6 | All slash commands above |
| **Research** | 3 | SEO benchmarks, GEO research, schema catalog |

---

## Requirements

- Node.js >= 18
- ESM environment (no CommonJS)
- No build step required

Single runtime dependency: `htmlparser2` (30KB)

Optional for Core Web Vitals: `lighthouse` + `chrome-launcher`

---

## Sponsor This Project

I built claude-rank alone — nights and weekends, between building my own SaaS products. No VC funding. No team. Just one person who got tired of being invisible to AI search and decided to fix it for everyone.

This plugin is **free forever.** No pro tier. No paywalls. No "upgrade to unlock." Every feature you just read about — all 9 tools, 6 skills, 4 agents — is yours, completely free.

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
npm test              # 200 tests, node:test
node tools/<tool>.mjs # No build step
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — [LICENSE](LICENSE). **Free forever.** No pro tier. No paywalls.

---

<div align="center">

### If claude-rank helped you rank higher, star the repo — it helps others find it too.

[![Star on GitHub](https://img.shields.io/github/stars/Houseofmvps/claude-rank?style=for-the-badge&logo=github&color=gold&label=Star%20on%20GitHub)](https://github.com/Houseofmvps/claude-rank)

**Every star makes this project more visible to developers who need it.**

[Star it now](https://github.com/Houseofmvps/claude-rank) | [Follow @kaileskkhumar](https://x.com/kaileskkhumar) | [Sponsor](https://github.com/sponsors/Houseofmvps)

</div>
