---
name: rank-vertical
description: E-Commerce and Local Business SEO checks with auto-detection.
---

# Vertical SEO Scanner

Auto-detects site type (e-commerce, local business) and runs specialized checks.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/vertical-scanner.mjs <directory>
```

**E-Commerce** (10 rules): Product schema, Offer schema, AggregateRating, reviews, product images, descriptions, breadcrumbs, pricing, availability, duplicate descriptions.

**Local Business** (10 rules): LocalBusiness schema, NAP data, geo coordinates, opening hours, Google Maps, clickable phone, local keywords, address element, service area pages, review schema.

Present detected site type, applicable findings, and recommendations.
