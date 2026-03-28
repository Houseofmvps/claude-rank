---
name: rank-security
description: Security headers and HTTPS compliance audit for SEO.
---

# Security Scanner

Scan HTML files for security headers and HTTPS compliance that affect SEO rankings.

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/security-scanner.mjs <directory>
```

Checks include (15 rules):
- HTTP-only canonical/og:url (ranking signal loss)
- Mixed content (scripts and resources)
- CSP, X-Content-Type-Options, X-Frame-Options meta tags
- Referrer policy and Permissions-Policy
- Subresource Integrity (SRI) on external scripts
- Inline event handlers (CSP violations)
- Form actions over HTTP
- Password input autocomplete
- target="_blank" without rel="noopener"
- Iframes without sandbox

Note: This is a static HTML scanner. Server response headers must be checked separately.
