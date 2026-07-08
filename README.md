<div align="center">

<img src="assets/hero-banner.png" alt="claude-rank — AI Readiness + Search Visibility for Claude Code" width="100%"/>

### AI Readiness and Search Visibility scanner for Claude Code. Find out if AI engines can discover, crawl, and cite your site — then fix what's blocking them.

**10 scanners. 170+ checks. Auto-fix for robots.txt, sitemap.xml, llms.txt, and JSON-LD. Works on local projects and live URLs.**

[![CI](https://img.shields.io/github/actions/workflow/status/Houseofmvps/claude-rank/ci.yml?style=for-the-badge&logo=github&label=CI)](https://github.com/Houseofmvps/claude-rank/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40houseofmvps%2Fclaude-rank?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/@houseofmvps/claude-rank)
[![npm downloads](https://img.shields.io/npm/dm/%40houseofmvps%2Fclaude-rank?style=for-the-badge&logo=npm&color=blue&label=Monthly%20Downloads)](https://www.npmjs.com/package/@houseofmvps/claude-rank)
[![npm total](https://img.shields.io/npm/dt/%40houseofmvps%2Fclaude-rank?style=for-the-badge&logo=npm&color=cyan&label=Total%20Downloads)](https://www.npmjs.com/package/@houseofmvps/claude-rank)
[![GitHub stars](https://img.shields.io/github/stars/Houseofmvps/claude-rank?style=for-the-badge&logo=github&color=gold)](https://github.com/Houseofmvps/claude-rank/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge&logo=opensourceinitiative)](LICENSE)
[![Sponsor](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/Houseofmvps)

---

[![Follow @kaileskkhumar](https://img.shields.io/badge/Follow%20%40kaileskkhumar-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/kaileskkhumar)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/kailesk-khumar)
[![houseofmvps.com](https://img.shields.io/badge/houseofmvps.com-Website-green?style=for-the-badge&logo=google-chrome&logoColor=white)](https://houseofmvps.com)
[![kailxlabs.co](https://img.shields.io/badge/kailxlabs.co-Website-6366F1?style=for-the-badge&logo=google-chrome&logoColor=white)](https://www.kailxlabs.co)

**Built by [Kailesk Khumar](https://www.linkedin.com/in/kailesk-khumar), founder of [HouseofMVPs](https://houseofmvps.com) and [Kailxlabs](https://www.kailxlabs.co)**

*One indie hacker. One plugin. Every search engine covered.*

</div>

---

## Quick Start

### Use as a Claude Code Plugin (recommended)

claude-rank works as a full Claude Code plugin with skills, agents, and slash commands.

**Option A — Install from GitHub (recommended):**
```
/plugin marketplace add Houseofmvps/claude-rank
/plugin install claude-rank@Houseofmvps-claude-rank
```

**Option B — Install from a local clone:**
```bash
git clone https://github.com/Houseofmvps/claude-rank.git
```
Then in Claude Code:
```
/plugin marketplace add ./claude-rank
/plugin install claude-rank@claude-rank
```

After installing, run `/reload-plugins` to activate in your current session.

Once installed, use slash commands:

```
/claude-rank:rank              # Smart routing — detects what your project needs
/claude-rank:rank-audit        # Full 10-scanner audit with auto-fix + GSC action plan
/claude-rank:rank-geo          # Deep AI search optimization audit
/claude-rank:rank-aeo          # Answer engine optimization audit
/claude-rank:rank-fix          # Auto-fix all findings in one command
/claude-rank:rank-schema       # Detect, validate, generate, inject JSON-LD
/claude-rank:rank-compete      # Competitive X-Ray — compare vs any competitor URL
/claude-rank:rank-citability   # AI Citability Score — 7-dimension analysis
/claude-rank:rank-content      # Content intelligence analysis
/claude-rank:rank-perf         # Performance risk assessment
/claude-rank:rank-vertical     # E-Commerce / Local Business SEO
/claude-rank:rank-security     # Security headers audit
```

**Zero configuration.** claude-rank reads your project structure and self-configures.

### Use standalone — no install needed

```bash
npx @houseofmvps/claude-rank scan ./my-project          # Local directory
npx @houseofmvps/claude-rank scan https://example.com    # Live URL (crawls up to 50 pages)
npx @houseofmvps/claude-rank geo https://example.com     # GEO audit on any URL
npx @houseofmvps/claude-rank aeo https://example.com     # AEO audit on any URL
npx @houseofmvps/claude-rank citability ./my-project     # AI citability score
npx @houseofmvps/claude-rank content ./my-project        # Content intelligence
npx @houseofmvps/claude-rank keyword ./my-project        # Keyword clustering
npx @houseofmvps/claude-rank brief ./my-project "seo"    # Content brief
npx @houseofmvps/claude-rank perf https://example.com    # Performance audit on any URL
npx @houseofmvps/claude-rank vertical ./my-project       # E-commerce / local SEO
npx @houseofmvps/claude-rank security https://example.com # Security audit on any URL
npx @houseofmvps/claude-rank compete https://comp.com .  # Competitive X-Ray
npx @houseofmvps/claude-rank gsc ./gsc-export.csv        # GSC data analysis
npx @houseofmvps/claude-rank schema ./my-project         # Structured data
npx @houseofmvps/claude-rank scan . --report html        # Agency-ready HTML report
npx @houseofmvps/claude-rank scan . --threshold 80       # CI/CD mode
npx @houseofmvps/claude-rank scan . --json               # Raw JSON output
```

### Install globally

```bash
npm install -g @houseofmvps/claude-rank    # scoped (official)
npm install -g claude-rank-seo             # unscoped (shorter)
claude-rank scan ./my-project
```

> Both packages are identical. `claude-rank-seo` is an unscoped alias for easier `npx` usage.

---

## The Problem

You shipped your SaaS. You ask ChatGPT about your niche — your site isn't mentioned. Perplexity doesn't cite you. Google AI Overviews skips you entirely. Traditional search traffic is flat too.

Most developers don't realize:

- **Your robots.txt is blocking GPTBot, PerplexityBot, and ClaudeBot** — AI can't cite what it can't crawl
- **You don't have an llms.txt** — the file AI assistants look for to understand your project
- **Your structured data is missing or broken** — you're invisible to rich results and AI answers
- **Your content isn't structured for AI extraction** — no clear definitions, no citable passages, no data points
- **Basic search hygiene is off** — missing meta tags, broken links, no sitemap

That's not just a search ranking problem. It's an AI visibility problem. Your site exists, but AI doesn't know it.

## The Solution

```
/claude-rank:rank-audit
```

One command. Ten scanners check your AI readiness and search visibility in parallel. 170+ checks across AI discoverability, search hygiene, content structure, performance, and security. Every finding gets an automated fix. Score tracked over time. **Then it tells you what to submit to Google Search Console and Bing Webmaster Tools.**

```
Search Hygiene:    87/100  ████████████░░  (54 checks)
AI Discoverability:92/100  █████████████░  (45 checks + E-E-A-T)
Answer Readiness:  78/100  ██████████░░░░  (12 checks)
AI Citability:     65/100  ████████░░░░░░  (7 dimensions)
Performance:       90/100  █████████████░  (20 checks)
Security:          80/100  ███████████░░░  (15 checks)
Overall:           86/100  AI-READY
```

**Score below 80?** Run `/claude-rank:rank-fix` to auto-generate what's missing (robots.txt, sitemap.xml, llms.txt, JSON-LD) then re-scan to see your improvement.

---

## All 10 Scanners

### 1. Search Hygiene Scanner — 54 Checks

Practical on-page checks that developers miss. Not a replacement for a full SEO strategy — just the technical baseline your site needs.

| Category | What it checks |
|---|---|
| **Meta** | Title (length, uniqueness), meta description, viewport, charset, canonical URL, lang attribute |
| **Content** | H1 presence, heading hierarchy, word count (`<main>` only), image alt text, thin content, readability (Flesch-Kincaid), passive voice |
| **Technical** | robots.txt, sitemap.xml, HTTPS, mobile-friendly viewport, analytics (30+ providers), redirect chains, lazy loading, hreflang |
| **Structured Data** | JSON-LD presence, validation against Google's required fields (14 schema types), dateModified freshness |
| **Cross-Page** | Duplicate titles, duplicate descriptions, duplicate content (Jaccard >80%), canonical conflicts, orphan pages, broken internal links |

### 2. AI Discoverability Scanner — 45 Checks + E-E-A-T

Checks whether AI search engines (ChatGPT, Perplexity, Gemini, Google AI Overviews) can find and cite your content.

| Category | What it checks |
|---|---|
| **AI Crawlers** | robots.txt for 11 bots: GPTBot, PerplexityBot, ClaudeBot, Claude-Web, Google-Extended, CCBot, AppleBot, Bytespider, Meta-ExternalAgent, Amazonbot, anthropic-ai |
| **AI Discoverability** | llms.txt, sitemap.xml, structured data quality |
| **Content Structure** | Question-format H2s (filters marketing headers), definition patterns, statistics, data tables, lists |
| **Citation Readiness** | 134-167 word passage sweet spot, direct answers in first 40-60 words, citations to .edu/.gov/.org |
| **E-E-A-T** | Author bio, credentials/expertise, about/team page, reviews/testimonials, external authority links |

### 3. Answer Readiness Scanner — 12 Checks

Checks if your content is structured to appear in featured snippets, People Also Ask, and voice search results.

| Category | What it checks |
|---|---|
| **Schema** | FAQPage, HowTo, speakable, Article structured data |
| **Snippet Fitness** | Answer paragraph length (40-60 words optimal), numbered steps, definition patterns |
| **Voice Search** | Concise answers under 29 words, conversational phrasing |

### 4. AI Citability Score — 7 Dimensions

Estimates how likely AI engines are to cite each page based on content structure signals (0-100).

| Dimension | Weight | What it measures |
|---|---|---|
| **Statistic Density** | 0-15 | Data points per 200 words |
| **Front-loading** | 0-15 | Key answer in first 30% of content |
| **Source Citations** | 0-15 | Links to .edu/.gov/research domains |
| **Expert Attribution** | 0-15 | Person schema, author bios, expert quotes |
| **Definition Clarity** | 0-10 | "X is..." / "X refers to..." extraction patterns |
| **Schema Completeness** | 0-15 | Organization + Author + Article + FAQ + Breadcrumb |
| **Content Structure** | 0-15 | Heading hierarchy, lists, paragraph segmentation |

### 5. Content Intelligence

Deep content quality analysis across all pages.

| Category | What it analyzes |
|---|---|
| **Readability** | Flesch-Kincaid score, Gunning Fog index, per-page scoring |
| **Duplicate Detection** | Jaccard similarity fingerprinting across all page pairs |
| **Thin Content** | Pages under 300 words flagged |
| **Internal Linking** | Suggests cross-links for pages sharing H2 topics |
| **Orphan Pages** | Pages with zero incoming internal links |
| **Hub Pages** | Identifies pillar pages with 5+ outgoing internal links |
| **Topic Clusters** | Groups pages by shared keywords |

### 6. Keyword Clustering (TF-IDF)

| Category | What it analyzes |
|---|---|
| **Primary Keyword** | Highest-weighted keyword per page (from H1/title) |
| **TF-IDF Scoring** | Term frequency / inverse document frequency across your content |
| **Topic Clusters** | Pages grouped by 3+ shared significant keywords |
| **Keyword Cannibalization** | Multiple pages targeting the same primary keyword |
| **Content Gaps** | Keywords only covered by 1 page — opportunity for more content |
| **Pillar Suggestions** | When 3+ pages share a theme, suggests creating a pillar page |

### 7. Content Brief Generator

Generate SEO-optimized writing briefs from your existing content.

| Category | What it generates |
|---|---|
| **Suggested Title** | H1 based on target keyword and existing content patterns |
| **Word Count Target** | Avg of related pages + 20% to outperform |
| **H2 Outline** | From analyzing related content structure |
| **Questions to Answer** | Extracted from FAQ patterns and question headings |
| **Internal Links** | Pages to link to/from for topical authority |
| **Related Keywords** | Extracted from related pages via TF-IDF |
| **GEO Tips** | Statistics to include, expert quotes, citation opportunities |

### 8. Performance + Mobile Scanner — 20 Checks

Performance and mobile checks from static HTML analysis. Catches common issues without needing Chrome.

| Category | What it checks |
|---|---|
| **CLS Risk** | Images without width/height dimensions |
| **Render Blocking** | Scripts without async/defer, excessive blocking scripts |
| **Payload** | Large inline CSS/JS (>50KB), too many external domains |
| **Loading** | Missing lazy loading, missing fetchpriority for LCP image |
| **Fonts** | Web fonts without font-display: swap |
| **Images** | Responsive images (srcset/sizes), modern formats (WebP/AVIF) |
| **Mobile** | Missing viewport meta, non-responsive viewport, small tap targets (<44px), small font sizes (<12px), fixed-width elements (>500px) |

### 9. Vertical Scanner — 20 Checks

Auto-detects e-commerce and local business sites, then runs specialized structured data and content checks. SaaS sites with pricing pages are correctly excluded via strong/weak signal weighting.

| Type | Rules | What it checks |
|---|---|---|
| **E-Commerce** | 10 | Product schema, Offer schema, AggregateRating, reviews, product images, descriptions, breadcrumbs, pricing, availability, duplicate descriptions |
| **Local Business** | 10 | LocalBusiness schema, NAP data, geo coordinates, opening hours, Google Maps, clickable phone, local keywords, address element, service area pages |

### 10. Security & Headers — 15 Checks

Security headers that affect both trust signals and search visibility.

| Category | What it checks |
|---|---|
| **HTTPS** | Mixed content, upgrade-insecure-requests |
| **Headers** | CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| **Integrity** | Subresource Integrity (SRI) on external scripts |
| **Safety** | Inline event handlers, form actions over HTTP, target="_blank" noopener, iframe sandbox |

---

## More Features

### Competitive X-Ray

Point at any competitor URL. claude-rank fetches their page and compares everything side-by-side:

- **Tech Stack** — 50+ detection patterns (Wappalyzer-style): framework, CMS, CDN, analytics, payments, chat
- **SEO Signals** — title, meta, canonical, Open Graph, Twitter Card, structured data
- **Content Depth** — word count, heading structure, links
- **Conversion Signals** — CTAs, pricing, demo booking, social proof, waitlists (24 patterns)
- **Quick Wins** — gaps to close and strengths to keep

```bash
claude-rank compete https://competitor.com ./my-project
```

No API keys. No rate limits. No signup. Just point and compare.

### Core Web Vitals (Lighthouse)

```bash
claude-rank cwv https://example.com
```

| Metric | Good | Poor |
|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | > 4.0s |
| **CLS** (Cumulative Layout Shift) | < 0.1 | > 0.25 |
| **FCP** (First Contentful Paint) | < 1.8s | > 3.0s |
| **TBT** (Total Blocking Time) | < 200ms | > 600ms |

No separate install — uses `npx -y lighthouse@12` automatically. Just needs Chrome.

### Auto-Fix Generators

Every finding has a fix. Not "consider adding" — actual file generation:

| Generator | What it creates |
|---|---|
| **robots.txt** | AI-friendly rules allowing all 11 AI crawlers + sitemap directive |
| **sitemap.xml** | Auto-detected routes (Next.js App/Pages Router, static HTML) |
| **llms.txt** | AI discoverability file from your package.json |
| **JSON-LD** | 12 types: Organization, Article, Product, FAQPage, HowTo, LocalBusiness, Person, WebSite, BreadcrumbList, SoftwareApplication, VideoObject, ItemList |

### Schema Engine — Full CRUD

```
Detect  → Find all JSON-LD in your HTML files
Validate → Check against Google's required fields (14 schema types)
Generate → Create missing schema from your project data
Inject   → Add generated schema into your HTML <head>
```

### Post-Audit Action Plans

**This is what separates claude-rank from every other SEO scanner.** After fixing issues, it tells you exactly what to do next:

**Google Search Console:** Submit sitemap, request indexing for money pages, check coverage, validate rich results, monitor CWV.

**Bing Webmaster Tools:** Submit URLs (10,000/day), enable IndexNow for near-instant re-indexing, verify robots.txt (Bingbot powers Microsoft Copilot and ChatGPT Browse).

**AI Search Verification:** Test your brand in ChatGPT, Perplexity, Gemini. Verify llms.txt. Weekly monitoring checklist.

### Multi-Page URL Crawling

```bash
claude-rank scan https://example.com              # Crawls up to 50 pages
claude-rank scan https://example.com --pages 10    # Limit to 10 pages
claude-rank scan https://example.com --single      # Just one page
```

BFS crawl, 3 concurrent fetches, cross-page duplicate/canonical analysis.

### HTML Report Export

```bash
claude-rank scan ./my-project --report html
```

Self-contained `claude-rank-report.html` — dark theme, score rings, detailed findings. No external dependencies. Ready to send to clients.

### CI/CD Mode

```bash
claude-rank scan ./my-project --threshold 80
# Exit code 1 if score < 80 — add to your CI pipeline
```

### Score Tracking

Every audit saves scores. See trends over time:

```
2026-03-25  SEO: 62  GEO: 45  AEO: 38
2026-03-26  SEO: 78  GEO: 72  AEO: 65  (+16, +27, +27)
2026-03-28  SEO: 87  GEO: 92  AEO: 78  (+9, +20, +13)
```

---

## Scoring System

All scores: 0-100. Higher is better.

| Severity | Deduction | Example |
|----------|-----------|---------|
| Critical | -20 | No title tag, robots.txt blocking all crawlers |
| High | -10 | Missing meta description, no JSON-LD, AI bots blocked |
| Medium | -5 | Title too long, missing OG tags, no llms.txt |
| Low | -2 | Missing lang attribute, no analytics detected |

Same rule on multiple pages = one deduction (not N). Consistent across all 10 scanners.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `scan ./project` | SEO scan — 54 rules |
| `scan https://example.com` | Crawl + scan live site (up to 50 pages) |
| `geo ./project` or `geo https://...` | GEO — AI search optimization (45 rules + E-E-A-T) |
| `aeo ./project` or `aeo https://...` | AEO — answer engine optimization (12 rules) |
| `citability ./project` or URL | AI Citability Score — 7 dimensions |
| `content ./project` or URL | Content intelligence — readability, duplicates, linking |
| `keyword ./project` or URL | Keyword clustering — TF-IDF, cannibalization, gaps |
| `brief ./project "keyword"` | Content brief generator (with search intent) |
| `perf ./project` or URL | Performance + mobile audit (20 rules) |
| `vertical ./project` or URL | Vertical SEO — e-commerce + local (20 rules) |
| `security ./project` or URL | Security headers audit (15 rules) |
| `compete https://comp.com .` | Competitive X-Ray |
| `gsc ./export.csv` | Google Search Console data analysis |
| `cwv https://example.com` | Core Web Vitals via Lighthouse |
| `schema ./project` or URL | Detect + validate structured data |
| `help` | Show available commands |

**Flags:** `--json` (raw output) | `--report html` (visual report) | `--threshold N` (CI mode) | `--pages N` (crawl limit) | `--single` (one page only)

---

## What claude-rank covers

| Area | Checks | What you get |
|------|:------:|-------------|
| Search hygiene | 54 | Meta tags, headings, structured data, sitemaps, broken links |
| AI discoverability | 45 + E-E-A-T | AI crawler access, llms.txt, citation-ready content, authority signals |
| Answer readiness | 12 | Snippet fitness, voice search, FAQ/HowTo schema |
| AI citability | 7 dimensions | Per-page citability score with actionable breakdown |
| Content quality | Deep analysis | Readability, duplicates, thin content, internal linking, topic clusters |
| Keywords | TF-IDF | Cannibalization, content gaps, pillar suggestions |
| Content briefs | Generator | Outlines, word count targets, keyword suggestions |
| Performance + mobile | 20 | CLS risk, render blocking, image optimization, tap targets |
| Vertical (e-commerce/local) | 20 | Product schema, LocalBusiness, NAP, reviews |
| Security headers | 15 | CSP, HTTPS, SRI, mixed content |
| Competitive X-Ray | 50+ patterns | Side-by-side tech stack + content + conversion comparison |
| Auto-fix | 4 generators | robots.txt, sitemap.xml, llms.txt, JSON-LD |
| Schema engine | Full CRUD | Detect, validate, generate, inject structured data |
| Reporting | HTML + JSON + CI | Agency-ready reports, CI/CD threshold, score tracking |

**claude-rank is a developer tool for AI readiness and search visibility. It's not a replacement for working with an SEO professional on strategy, link building, or content marketing.**

---

## Terminology

- **GEO (Generative Engine Optimization)** — optimization for AI-powered search engines that generate answers (Perplexity, ChatGPT Search, Gemini, Google AI Overviews). NOT geographic.
- **AEO (Answer Engine Optimization)** — optimization for direct answer features: featured snippets, People Also Ask, voice assistants.
- **SEO (Search Engine Optimization)** — traditional Google/Bing crawlability, indexability, on-page signals.

---

## Security

| Protection | How |
|---|---|
| **No shell injection** | `execFileSync` with array args — zero shell interpolation |
| **SSRF protection** | All HTTP tools block private IPs, cloud metadata, non-HTTP schemes |
| **No telemetry** | Zero data collection. No phone home. Ever. |
| **1 dependency** | `htmlparser2` only (30KB). No native bindings. No `node-gyp`. |
| **372 tests** | All scanners, CLI, integration, and security tests |
| **File safety** | 10MB read cap. 5MB response cap. Restrictive write permissions. |

See [SECURITY.md](SECURITY.md) for the full vulnerability disclosure policy.

---

## What's Inside

| Category | Count |
|---|---|
| **Scanners** | 10 (Search Hygiene, AI Discoverability, Answer Readiness, Citability, Content, Keywords, Briefs, Perf+Mobile, Vertical, Security) |
| **Checks** | 170+ across all scanners |
| **Tools** | 18 (scanners + GSC analyzer + schema engine + robots/sitemap/llms.txt + competitive X-ray + formatter) |
| **CLI Commands** | 16 (all accept URLs) |
| **Agents** | 9 autonomous auditors |
| **Skills** | 7 plugin skills |
| **Tests** | 372 |

---

## Requirements

- **Node.js >= 18** (tested on 18, 20, 22 via CI)
- ESM environment (`"type": "module"`)
- No build step required
- Single dependency: `htmlparser2` (30KB)
- Optional for Core Web Vitals: Chrome/Chromium

---

## The methodology behind the rules

claude-rank's 170+ rules encode the same answer engineering playbook KailxLabs uses on client builds. The open version lives here: [Answer Engine Optimization Playbook](https://github.com/Houseofmvps/answer-engine-optimization). The version we build for you, with a 45 day citation guarantee across ChatGPT, Perplexity, Gemini, Claude, and Google AI, lives at [kailxlabs.co](https://www.kailxlabs.co).

---

## Sponsor This Project

I built claude-rank alone — nights and weekends, between building my own SaaS products. No VC funding. No team. Just one person who got tired of being invisible to AI search and decided to fix it for everyone.

This plugin is **free forever.** No pro tier. No paywalls. No "upgrade to unlock." Every feature — all 10 scanners, 12 slash commands, 9 agents — is yours, completely free.

If claude-rank helped your site get cited by AI, fixed a robots.txt that was blocking GPTBot, or generated the structured data you kept putting off, I'd be grateful if you considered sponsoring.

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor_on_GitHub-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/Houseofmvps)

*— [Kailesk Khumar](https://www.linkedin.com/in/kailesk-khumar), founder of [HouseofMVPs](https://houseofmvps.com) and [Kailxlabs](https://www.kailxlabs.co)*

---

## Contributing

Found a bug? Want a new scanner rule? [Open an issue](https://github.com/Houseofmvps/claude-rank/issues) or PR.

```bash
git clone https://github.com/Houseofmvps/claude-rank.git
cd claude-rank
npm install
npm test              # 372 tests, node:test
node tools/<tool>.mjs # No build step
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — [LICENSE](LICENSE). **Free forever.** No pro tier. No paywalls.

---

<div align="center">

### If claude-rank made your site visible to AI, star the repo so others can find it too.

[![Star on GitHub](https://img.shields.io/github/stars/Houseofmvps/claude-rank?style=for-the-badge&logo=github&color=gold&label=Star%20on%20GitHub)](https://github.com/Houseofmvps/claude-rank)

**Every star makes this project more visible to developers who need it.**

[Star it now](https://github.com/Houseofmvps/claude-rank) | [Follow @kaileskkhumar](https://x.com/kaileskkhumar) | [Sponsor](https://github.com/sponsors/Houseofmvps) | [Book a call](https://cal.com/houseofmvps/30-min-strategy-call-with-our-founder)

</div>
