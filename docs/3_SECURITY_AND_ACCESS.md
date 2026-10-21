# 3. Security & Access Document

**Project Name:** Student Deadline Radar  
**Security Baseline:** OWASP Top 10 Aligned, Zero-Leakage & Privacy-Preserving  
**Document Version:** 1.2.0  
**Audit Status:** Hardened & Re-Verified — full security audit + fix pass (2026-10-21), 42 automated security tests green 

---

## 1. Security Scope & Principles
Student Deadline Radar interacts directly with university email systems, potentially handling sensitive student identifiers, academic records, and communication metadata.

The system is engineered around **Three Core Security Principles**:
1. **Zero Persistent Credential Storage:** Student mailbox passwords are never stored in the database and never in browser `localStorage` — only session-scoped storage (cleared when the tab closes).
2. **Ephemeral Mail Ingestion:** Only actionable academic deadlines are retained; non-actionable emails, personal communications, and OTPs are filtered and discarded; email log bodies are capped at 200 characters.
3. **Least Privilege & Defense-in-Depth:** Parameterized database interactions, strict CORS validation (wildcards never combined with credentials), HTTP security headers incl. CSP, SSRF-guarded IMAP targets, sliding-window rate limiting, sanitized hrefs everywhere.
4. **Deny-by-Default Mutations:** All state-changing endpoints require an HMAC-signed HttpOnly session cookie (minted only after a successful IMAP credential proof) plus a double-submit CSRF header.

---

## 2. 20-Point Security Hardening & Audit Checklist

Verified against project requirements in `Checks.txt`:

| # | Security Control | Implementation & Verification Status | Component / Code Target |
| :-: | :--- | :--- | :--- |
| **1** | **Hide API Keys** | `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, and `TELEGRAM_CHAT_ID` are loaded via `process.env` from `.env` or cloud container environments. None are exposed in frontend bundles or client logs. | `backend/server.js`, `backend/services/aiExtractor.js` |
| **2** | **Purge Git Secrets** | `.gitignore` and `.vercelignore` actively exclude `.env*`, `*.db`, `node_modules`, and cache files. Git repository was verified free of leaked secrets. | `.gitignore`, `.vercelignore` |
| **3** | **Use Public DB Key / Secure Access** | Database access is bound locally to the server process (`sqlite3`). No public network port is exposed for database connectivity. | `backend/db.js` |
| **4** | **Enable Row-Level Security / Task Scoping** | All task operations are scoped by strict integer IDs (`id = ?`) with parameterization. | `backend/server.js` |
| **5** | **Encrypt Sensitive Data** | All transport traffic uses TLS/HTTPS in transit; IMAP sessions enforce SSL port 993 (`secure: true`). | `backend/services/imapService.js` |
| **6** | **Enforce Server-Side Auth** | True server-side session auth: HMAC-signed HttpOnly `radar_session` cookie minted only after a proven IMAP login. Mutating endpoints (`PATCH …/action`, `parse-raw` with `auto_save`, telegram dispatch) additionally require the double-submit `x-radar-csrf` header. **Verified in regression tests (42/42).** | `backend/server.js`, `backend/security.js` |
| **7** | **Lock Record Access** | Unauthenticated raw SQL execution is impossible. Endpoints only allow predetermined CRUD operations. | `backend/server.js` |
| **8** | **Block Field Tampering** | Strict field whitelisting on `status`, `category`, and `action` parameters. Unrecognized parameters are rejected with HTTP 400. | `backend/server.js` |
| **9** | **Secure Session / Local Storage** | Mailbox credentials kept in browser `sessionStorage` only (cleared when the tab closes); server keeps an HttpOnly session cookie instead. Legacy `localStorage` copies are deleted on first run. `Secure`+`HttpOnly`+`SameSite=Lax` flags on the session cookie. | `frontend/src/components/LoginPage.jsx`, `backend/security.js` |
| **10** | **Hash Passwords / Credential Protection** | Backend never stores passwords in plaintext or at all. Passwords exist only ephemerally in memory during active IMAP SSL socket handshakes. | `backend/db.js`, `backend/services/imapService.js` |
| **11** | **Rate Limit Login / Sensitive Endpoints** | Sensitive endpoints (`/api/mailbox/*`, `/api/telegram/*`, `/api/deadlines/parse-raw`) capped at **20 req/min per IP**; general API capped at **120 req/min per IP**. | `backend/server.js` |
| **12** | **Add Bot Protection** | Rate limiting returns HTTP 429 with `Retry-After` header. Request body size strictly capped at **500kb** to prevent buffer exhaustion bots. | `backend/server.js` |
| **13** | **Parameterize Queries** | 100% of SQL statements (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) use `?` parameter placeholders. Zero string concatenation. | `backend/server.js`, `backend/db.js` |
| **14** | **Validate All Input** | RFC 5322 regex for emails, hostname regex for servers, numeric integer clamping for ports (1–65535), emails (1–50), and days (1–90). | `backend/server.js` |
| **15** | **Escape User Content** | React JSX automatically escapes all rendered task titles, senders, and descriptions, preventing reflected XSS. | `frontend/src/components/DeadlineCard.jsx` |
| **16** | **Restrict File Uploads** | No arbitrary file uploads permitted. The application only accepts structured JSON payloads with strict MIME enforcement. | `backend/server.js` |
| **17** | **Trim API Responses** | Disabled `X-Powered-By: Express`. Error messages in production suppress stack traces and internal database errors (`NODE_ENV === 'production'`). | `backend/server.js` |
| **18** | **Add Security Headers** | Injected `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`, `X-Permitted-Cross-Domain-Policies: none`, plus a restrictive **Content-Security-Policy** (`default-src 'self'`, no external scripts, Google Fonts only for styles/fonts). | `backend/server.js` |
| **19** | **Force HTTPS** | Injected `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` for all production traffic. | `backend/server.js` |
| **20** | **Scan Dependencies** | `npm audit` verified **0 vulnerabilities** in both backend and frontend after the 2026-10-21 audit patch (patched `follow-redirects` via axios, patched `vite`/`launch-editor`). Security regression suite: `npm run test:security` (backend) — **42/42 passing**. | `backend/package-lock.json`, `frontend/package-lock.json`, `backend/tests/security.test.js` |
| **21** | **Sanitize Outbound URLs (stored-XSS kill switch)** | Every task link passes dual sanitizers (server & client) before `href`, `window.open`, Telegram keyboards, or ICS output: only normalized `http(s)` URLs survive; `javascript:`/`data:`/CRLF payloads are dropped. | `backend/security.js`, `frontend/src/utils/safeUrl.js` |
| **22** | **SSRF Guard on IMAP targets** | IMAP hostnames must be public FQDNs and every resolved address must be globally routable — private ranges (10/8, 172.16/12, 192.168/16, CGNAT 100.64/10), loopback, link-local incl. cloud metadata (169.254.169.254), ULA/IPv6 internals are rejected before any socket opens. TLS restricted to port **993 only**. | `backend/security.js`, `backend/server.js` |
| **23** | **LLM Output Schema Enforcement** | Gemini output is whitelist-scrubbed before persistence: exact categories, clamped string lengths, numeric ranges, ISO deadline sanity window (2000–2100); unknown/injected fields are discarded (anti mass-assignment). | `backend/security.js` |
| **24** | **CORS never wildcard+credentials** | Explicit origin allowlist OR same-origin-only default; wildcard CORS is only available when explicitly requested and always without credentials. | `backend/server.js` |

---

## 3. Network & Transport Security

```mermaid
graph LR
    subgraph Client ["Client Browser"]
        Creds[IMAP Credentials in Memory / LocalStorage]
    end

    subgraph Server ["Hardened Backend Server (Express + Vercel)"]
        SecHeaders[Security Headers & HSTS]
        RateLimiter[Sliding-Window Rate Limiter]
        Validator[RFC 5322 Input Validator]
        Worker[IMAP Worker Client]
    end

    subgraph MailServer ["University Mail Server"]
        IMAPPort[SSL Port 993]
    end

    Creds -->|HTTPS POST (Rate-Limited)| SecHeaders
    SecHeaders --> RateLimiter
    RateLimiter --> Validator
    Validator --> Worker
    Worker -->|Encrypted TLS Handshake| IMAPPort
    Worker -.->|Credential Cleared from Memory| Worker
```

### 3.1 Transport Encryption
- **Client-to-Server:** All production communication routes through HTTPS/TLS 1.3 reverse proxies (Vercel Edge, Render, or Cloudflare).
- **Server-to-Mailbox:** IMAP sessions enforce explicit TLS/SSL on port 993 (`secure: true`).
- **Server-to-Telegram:** Direct HTTPS connection to `https://api.telegram.org/bot<TOKEN>/sendMessage`.

### 3.2 CORS (Cross-Origin Resource Sharing)
Strict allowlist policy — wildcard CORS is never combined with credentialed requests:
```javascript
app.use(cors(buildCorsConfig()));
// explicit list  -> exact-match allowlist, credentials: true
// explicit "*"   -> wildcard, credentials: false
// unset in prod  -> same-origin only (recommended default; Vercel rewrites keep SPA+API same-origin)
// unset in dev   -> localhost origins only (Vite proxies /api same-origin anyway)
```

---

## 4. Threat Modeling & Security Mitigations

| Threat Vector | Severity | Attack Scenario | Mitigation in Codebase |
| :--- | :---: | :--- | :--- |
| **SQL Injection (SQLi)** | High | Malicious student crafts email subject containing SQL escape sequences. | **Parameterized Queries:** All database operations (`run`, `get`, `all`) use strictly bound parameter placeholders (`?`). No dynamic string concatenation in SQL statements. |
| **Cross-Site Scripting (XSS)** | High | Malicious sender embeds `<script>` tags in email body or form link. | **Automatic JSX Escaping & Link Sanitization:** React escapes all rendered string variables by default. The link extractor parses URLs with strict regex (`https?://`) and strips trailing punctuation. |
| **IMAP Socket Exhaustion (DoS)** | Medium | Network interruption hangs open socket connections to mail server. | **Lock & Release Pattern:** All IMAP mailbox locks are bound to `try...finally` blocks ensuring locks release and `logout()` triggers even on connection errors. |
| **Process Crashing / Unhandled Exceptions** | Medium | Mailbox sends malformed MIME payload or unexpected socket reset. | **Safety Handlers:** `process.on('uncaughtException')` and `process.on('unhandledRejection')` prevent unhandled edge-case drops. |
| **Credential / Secret Exposure** | Critical | Accidental commit of production SQLite database containing student task history or `.env` secrets. | **Git Barrier:** `.gitignore` and `.vercelignore` explicitly blacklist `*.db`, `*.sqlite`, `.env*`, and `backend/deadlines.db`. |
| **Brute Force & Flooding** | High | Automated script bombards IMAP authentication or parsing endpoints. | **Multi-Tier Rate Limiting:** Sliding-window rate limiter returns HTTP 429 with `Retry-After` after 20 attempts/min on sensitive routes. |

---

## 5. Data Privacy & Academic Compliance (FERPA / GDPR)

1. **Noise Filtering & Privacy Guard:**
   - Emails from banking, healthcare, delivery services (Amazon, Swiggy, Zomato), social networks, and OTP providers are filtered at the ingestion boundary and **never written to disk**.
2. **Data Minimization:**
   - Raw email bodies are truncated to a maximum of 200 characters (`raw_snippet`). Full original email bodies are never stored in the primary `deadline_tasks` table.
3. **Right to Erasure (Task Deletion):**
   - The user has complete agency to delete any individual task via `PATCH /api/deadlines/:id/action` with action `"delete"`, immediately issuing an unrecoverable `DELETE FROM deadline_tasks WHERE id = ?`.
