---
name: rank-perf
description: Performance risk assessment from HTML structure — no Chrome needed.
---

# Performance Scanner

Assess performance risks from static HTML analysis. No Chrome or Lighthouse needed.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/perf-scanner.mjs <directory>
```

Checks include:
- Images without width/height (CLS risk)
- Render-blocking scripts (no async/defer)
- Large inline CSS/JS (>50KB)
- Missing lazy loading on images
- Missing fetchpriority on LCP image
- No font-display: swap on web fonts
- Missing resource hints (preload/prefetch)
- Mixed content (HTTP resources on HTTPS page)
- Too many external script domains
- Missing preconnect hints

Present findings with severity and fix suggestions.
