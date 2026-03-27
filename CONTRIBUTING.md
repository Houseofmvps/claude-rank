# Contributing to claude-rank

Thank you for your interest in contributing. This document covers the essentials for getting a change merged.

---

## Before you start

- Check [open issues](https://github.com/Houseofmvps/claude-rank/issues) to avoid duplicate work.
- For significant changes (new audit categories, behavior changes), open an issue first to discuss.
- For bug fixes and small improvements, open a PR directly.

---

## Setup

```bash
git clone https://github.com/Houseofmvps/claude-rank.git
cd claude-rank
npm install
```

No build step required. The project is plain ESM — all files run directly with Node.js >= 18.

---

## Running tests

```bash
npm test
```

Tests use Node's built-in `--test` runner. No extra test framework required.

---

## Project structure

```
claude-rank/
├── bin/              # CLI entry point (claude-rank.mjs)
├── tools/            # Core scanning tools
│   └── lib/          # Shared utilities (security, file I/O, etc.)
├── skills/           # Claude Code skill definitions
├── agents/           # Autonomous agent definitions
├── commands/         # Slash command implementations
├── hooks/            # Claude Code lifecycle hooks
├── research/         # Research prompts and templates
└── tests/            # Tests (Node --test)
    └── fixtures/     # Test HTML/JSON fixtures
```

---

## Code conventions

- All files use the `.mjs` extension (ESM modules, no CommonJS)
- File naming: kebab-case (e.g., `geo-checker.mjs`, `schema-engine.mjs`)
- Tools output JSON to stdout; exit code 0 on success, non-zero on error
- Never use `execSync` with shell strings — use `execFileSync` only (injection prevention)
- Always validate URLs through `tools/lib/security.mjs` before fetching (SSRF protection)
- Always call `checkFileSize(path)` from `tools/lib/file-utils.mjs` before `readFileSync`
- Skill files: max 500 lines per file

### Terminology

Two terms that must not be confused:

- **GEO** = Generative Engine Optimization (AI search engines like Perplexity, ChatGPT, Gemini) — not geographic
- **AEO** = Answer Engine Optimization (featured snippets, voice search, People Also Ask)

---

## Scoring system

If you add new audit rules, follow the existing severity model:

| Severity | Score deduction |
|----------|----------------|
| Critical | -20 |
| High | -10 |
| Medium | -5 |
| Low | -2 |

Assign severity based on actual impact on search visibility, not on perceived importance.

---

## Pull request checklist

- [ ] Tests added or updated for any changed behavior
- [ ] `npm test` passes locally
- [ ] Code follows the conventions above (ESM, kebab-case, `execFileSync`)
- [ ] Security utilities used where applicable (URL validation, file size check)
- [ ] CHANGELOG.md updated under `[Unreleased]`
- [ ] Commit messages follow conventional commits: `feat:`, `fix:`, `docs:`, `chore:`

---

## Commit style

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add FAQ schema detection rule
fix: correct GEO score calculation when no rules match
docs: update scoring table in README
chore: bump htmlparser2 to latest
```

---

## Reporting bugs

Open an issue on [GitHub](https://github.com/Houseofmvps/claude-rank/issues) with:

1. Node.js version (`node --version`)
2. claude-rank version (`npx claude-rank --version`)
3. Command you ran
4. Expected vs actual behavior
5. Relevant output or error message

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
