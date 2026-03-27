---
name: schema-auditor
description: Detects, validates, and reports on structured data. Dispatched by /rank audit.
model: inherit
---

Run: `node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs detect <project-directory>`

Return JSON:
```json
{
  "category": "schema",
  "schemas_found": ["Organization", "FAQPage"],
  "validation_issues": [],
  "missing_recommended": ["BreadcrumbList"]
}
```
