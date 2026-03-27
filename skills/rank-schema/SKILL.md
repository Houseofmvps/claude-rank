---
name: rank-schema
description: Structured data management. Detect, validate, generate, and inject JSON-LD schema.
---

# Schema Management

## Phase 1: Detect

Scan all HTML files for existing JSON-LD:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs detect <dir>
```

Report: which schema types found, which files contain them.

## Phase 2: Validate

For each detected schema, validate against Google's requirements. Report: missing required fields, deprecated types, invalid values.

## Phase 3: Recommend

Based on project type detection:
- SaaS → Organization, WebSite+SearchAction, SoftwareApplication, FAQPage
- E-commerce → Product+Offer, Organization, BreadcrumbList, FAQPage
- Local → LocalBusiness, Organization, FAQPage, BreadcrumbList
- Publisher → Article/BlogPosting, Person (author), Organization, BreadcrumbList

Flag missing recommended types.

## Phase 4: Generate + Inject

For each missing schema:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/schema-engine.mjs generate <type> --name="..." --url="..."
```

Inject into HTML: add script tag before closing head using Edit tool.

## Phase 5: Verify

Re-run detect to confirm all schema is present and valid.
