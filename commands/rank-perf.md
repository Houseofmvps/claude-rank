---
name: rank-perf
description: Performance and mobile-first indexing audit from HTML — no Chrome needed.
---

# Performance + Mobile Scanner (20 rules)

Assess performance risks and mobile-first indexing issues from static HTML. No Chrome needed.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/perf-scanner.mjs <directory|url>
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
- Missing viewport meta tag (mobile-first indexing)
- Non-responsive viewport (fixed width instead of device-width)
- Small tap targets (<44px on interactive elements)
- Small font sizes (<12px)
- Fixed-width elements (>500px causing horizontal scroll)

Present findings with severity and fix suggestions.
