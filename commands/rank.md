---
description: "SEO/GEO/AEO audit, analysis, and optimization. The most comprehensive search toolkit for Claude Code."
---

## Syntax

```
/claude-rank:rank [subcommand] [directory]
```

## Subcommands

| Subcommand | Description |
|---|---|
| *(none)* | Quick health check — shows SEO, GEO, AEO scores |
| `audit` | Full 9-phase audit with auto-fix + GSC action plan |
| `geo` | AI search optimization (ChatGPT, Perplexity, Gemini) |
| `aeo` | Answer engine optimization (snippets, voice, PAA) |
| `fix` | Auto-fix all findings in one command |
| `schema` | Detect, validate, generate, inject JSON-LD |

## Examples

```
/claude-rank:rank                    # Quick scores for current directory
/claude-rank:rank audit ./my-site    # Full audit with fixes
/claude-rank:rank geo .              # AI search check
```
