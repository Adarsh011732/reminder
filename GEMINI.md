# Project Operational Rules & Standards

## 1. Mandatory Project Documentation Protocol
From now onwards for every project, and across every phase of updates, the following 5 core documents MUST be created in the `docs/` folder and kept continuously synchronized with the codebase:

1. **`docs/1_PRD.md` — Product Requirements Document (PRD)**
   - What you're building, target personas, problem statement, functional specifications, success metrics.
2. **`docs/2_TECHNICAL_ARCHITECTURE.md` — Technical Architecture Document**
   - System topology, frontend/backend architecture, database schemas, API contracts, deployment specs.
3. **`docs/3_SECURITY_AND_ACCESS.md` — Security & Access Document**
   - Authentication, IMAP/OAuth secrets, permission levels, data privacy, CORS, security mitigations.
4. **`docs/4_FRONTEND_SPEC.md` — Frontend Spec Document**
   - Visual aesthetics, design tokens, component hierarchy, animations, user interaction flows.
5. **`docs/5_FEATURE_TICKET_LIST.md` — Feature Ticket List**
   - Granular development task tickets (e.g., `RADAR-001`), priorities (P0/P1/P2), statuses, and acceptance criteria.

Whenever code or features are modified, review and update the corresponding documents.

---

## 2. Mandatory Pre-Deployment & Pre-Git Push Security Audit Protocol
Before deploying to any platform (Vercel, Render, Railway, Docker, AWS) or pushing code to GitHub/GitLab, the following **20-Point Security Checklist** MUST be validated:

1. **Hide API Keys:** Load all keys/secrets via `process.env`. Never hardcode secrets in source files.
2. **Purge Git Secrets:** Verify `.gitignore` and `.vercelignore` actively exclude `.env*`, `*.db`, `node_modules`, and credentials.
3. **Secure Database Access:** Ensure databases use local/private access or authenticated connection strings with non-root privileges.
4. **Row-Level Security & Scoped Record Access:** Ensure all database queries are strictly scoped by record ID or authorized user context.
5. **Encrypt Sensitive Data:** Enforce TLS/HTTPS for all transport communication; require SSL/TLS on third-party sockets (e.g. IMAP port 993).
6. **Enforce Server-Side Auth:** Authenticate and verify credentials on the server before executing business logic.
7. **Lock Record Access:** Restrict database endpoints to predetermined, authorized CRUD actions. Never expose arbitrary SQL execution.
8. **Block Field Tampering:** Strictly whitelist acceptable fields, statuses, categories, and actions. Reject unapproved fields with HTTP 400.
9. **Secure Session Cookies & Storage:** Use `HttpOnly`, `Secure`, and `SameSite` flags on cookies. Never store plaintext passwords in cookies or `localStorage`.
10. **Hash Passwords / Credential Protection:** Never store passwords in plaintext. Use secure cryptographic hashing or zero-storage ephemeral memory patterns.
11. **Rate Limit Login & Sensitive Routes:** Implement rate limiting on authentication, sync, parsing, and alert endpoints (e.g., 20 req/min).
12. **Bot Protection & DoS Mitigation:** Enforce global API rate limits and strict request body buffer size caps (e.g., 500kb max).
13. **Parameterize All Queries (SQL Injection Defense):** 100% of database queries (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) must use parameterized placeholders (`?` or `$1`). Zero string concatenation.
14. **Validate All Input:** Validate email formats, hostnames, port ranges (1–65535), and clamp numeric parameters.
15. **Escape User Content (XSS Prevention):** Sanitize and auto-escape all user-generated strings rendered in HTML/JSX. Sanitize outbound URLs.
16. **Restrict File Uploads:** Block arbitrary file uploads unless strictly required. Enforce MIME type whitelisting and file size caps.
17. **Trim API Responses & Disable Information Disclosure:** Disable `X-Powered-By`. Suppress debug stack traces and internal database errors in production responses.
18. **Add HTTP Security Headers:** Inject `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy`, and `Permissions-Policy`.
19. **Force HTTPS / HSTS:** Injected `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` for production environments.
20. **Scan Dependencies:** Run `npm audit` (or language equivalent) to verify **0 vulnerabilities** before deploying or releasing.
