---
description: Mandatory 20-point security audit checklist before deploying or pushing to GitHub
alwaysApply: true
---

# Mandatory Pre-Deployment & Pre-Git Push Security Audit Protocol

Before deploying to any cloud hosting provider (Vercel, Render, Railway, Docker, AWS, etc.) or pushing any commits to GitHub/GitLab, Antigravity MUST systematically audit and enforce the following **20 Core Security Controls**:

## 🔒 20-Point Security Checklist

1. **Hide API Keys:** All API keys, tokens, and secrets must be loaded via `process.env` / environment variables. Never commit or hardcode keys in client or server files.
2. **Purge Git Secrets:** Verify `.gitignore` and `.vercelignore` explicitly exclude `.env*`, `*.db`, `*.sqlite`, `node_modules`, and local credentials. Inspect git status to ensure no secret files are tracked.
3. **Secure Database Access:** Ensure databases use private/embedded access or authenticated connection strings with non-root least-privilege credentials.
4. **Row-Level Security & Scoped Record Access:** Ensure all database queries are strictly scoped by record ID or authorized user context.
5. **Encrypt Sensitive Data:** Enforce TLS/HTTPS for all transport communication; require SSL/TLS on third-party sockets (e.g. IMAP port 993).
6. **Enforce Server-Side Auth:** Never rely on frontend validation alone. Authenticate and verify credentials on the server before executing business logic.
7. **Lock Record Access:** Restrict database endpoints to predetermined, authorized CRUD actions. Never expose arbitrary SQL execution.
8. **Block Field Tampering:** Strictly whitelist acceptable fields, statuses, categories, and actions. Reject unapproved fields with HTTP 400.
9. **Secure Session Cookies & Storage:** Use `HttpOnly`, `Secure`, and `SameSite` flags on cookies. Never store plaintext passwords in cookies or `localStorage`.
10. **Hash Passwords / Credential Protection:** Never store passwords in plaintext. Use secure cryptographic hashing (bcrypt/argon2) or zero-storage ephemeral in-memory patterns.
11. **Rate Limit Login & Sensitive Routes:** Implement rate limiting on authentication, sync, parsing, and alert endpoints to defend against credential stuffing and brute force.
12. **Bot Protection & DoS Mitigation:** Enforce global API rate limits and strict request body buffer size caps (e.g., 500kb max) to prevent memory-exhaustion attacks.
13. **Parameterize All Queries (SQL Injection Defense):** 100% of database queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) must use parameterized placeholders (`?` or `$1`). Zero string concatenation.
14. **Validate All Input:** Validate email formats, hostnames, port ranges (1–65535), and clamp numeric parameters (e.g. max limits, date ranges).
15. **Escape User Content (XSS Prevention):** Sanitize and auto-escape all user-generated strings rendered in HTML/JSX. Sanitize outbound URLs.
16. **Restrict File Uploads:** Block arbitrary file uploads unless strictly required. Enforce MIME type whitelisting and file size caps.
17. **Trim API Responses & Disable Information Disclosure:** Disable `X-Powered-By`. Suppress debug stack traces and internal database errors in production responses (`NODE_ENV === 'production'`).
18. **Add HTTP Security Headers:** Inject `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
19. **Force HTTPS / HSTS:** Injected `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` for production environments.
20. **Scan Dependencies:** Run `npm audit` (or language equivalent) to verify **0 vulnerabilities** before deploying or releasing.

## Continuous Audit Protocol
- Run dependency vulnerability scans before tagging releases.
- Verify that [`.gitignore`](.gitignore) is in place before `git add` or `git commit`.
- Ensure all 20 security controls are active and documented in `docs/3_SECURITY_AND_ACCESS.md`.
