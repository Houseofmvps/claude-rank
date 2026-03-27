---
name: rank-aeo
description: Answer engine optimization. Optimize for featured snippets, voice search, People Also Ask.
---

# AEO Audit — Answer Engine Optimization

## Phase 1: Scan

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/aeo-scanner.mjs <project-directory>
```

## Phase 2: Report

Present AEO findings:
- **Schema** — FAQPage, HowTo, speakable, Article/BlogPosting
- **Snippet Readiness** — direct answers, numbered steps, concise paragraphs
- **Voice Search** — conversational patterns, 29-word answer targets

## Phase 3: Fix

- Missing FAQPage → detect Q&A patterns in content, generate schema: `node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs generate FAQPage`
- Missing speakable → add speakable schema targeting key answer sections
- Long answers → restructure to 40-60 word direct answers after question H2s
- No numbered steps → convert procedural content to ordered lists
- Missing featured image → flag for user to add hero image

## Phase 4: Verify

Re-run aeo-scanner. Show before/after AEO score.

## Phase 5: Voice Search Guidance

- Target conversational long-tail queries ("how do I...", "what is the best...")
- Keep primary answers under 29 words (Google voice search average)
- Add People Also Ask patterns as H2/H3 questions throughout content
