# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

Only the latest release receives security fixes.

---

## Reporting a vulnerability

Do not open a public GitHub issue for security vulnerabilities.

Send a report to: **houseofmvps2024@gmail.com**

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

You will receive an acknowledgment within 48 hours. If the issue is confirmed, a fix will be released as quickly as possible — typically within 7 days for critical issues.

---

## Scope

Security issues in scope:
- Arbitrary code execution via crafted input files
- SSRF via URL inputs to the scanner
- Path traversal via file path arguments
- Injection via subprocess calls

Out of scope:
- Vulnerabilities in Node.js itself
- Issues in `htmlparser2` that are not exploitable through claude-rank's usage

---

## Security model

claude-rank is a local development tool. It runs on your machine against your own project files. It does not transmit project data to external servers.

Key security decisions made in the codebase:
- All subprocess calls use `execFileSync` (no shell string interpolation)
- All URLs are validated through `tools/lib/security.mjs` before any fetch
- All file reads are preceded by a size check via `tools/lib/file-utils.mjs` to prevent unbounded memory use
- No user-controlled data is passed directly to shell commands
