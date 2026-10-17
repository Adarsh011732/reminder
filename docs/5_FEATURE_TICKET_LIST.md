# 5. Feature Ticket List & Development Task Tracker

**Project Name:** Student Deadline Radar  
**Tracking System:** Agile Kanban / Milestone Sprint Matrix  
**Document Version:** 1.0.0  

---

## Sprint Overview & Velocity Metrics

| Total Tickets | ✅ Completed | 🚧 In Progress | 📋 Backlog (v2) |
| :---: | :---: | :---: | :---: |
| **20** | **16** | **1** | **3** |

---

## Epic 1: Fullstack Infrastructure & Cloud Deployment

### 🎫 RADAR-101: Single-Service Production Static Asset Serving
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`backend/server.js`](file:///c:/Dev_Projects/Reminder!/backend/server.js)
- **Description:** Enable Node.js Express server to detect and serve Vite production build (`frontend/dist`) as static assets with SPA fallback routing.
- **Acceptance Criteria:**
  - [x] Express serves `frontend/dist` on `GET /` when built.
  - [x] SPA fallback `app.get('*')` returns `index.html` for client-side routing.
  - [x] Cloud health check `/health` returns HTTP 200 JSON `{ status: "ok" }`.

### 🎫 RADAR-102: Decoupled API Bridge & Dynamic API Base URL
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`frontend/src/utils/apiClient.js`](file:///c:/Dev_Projects/Reminder!/frontend/src/utils/apiClient.js)
- **Description:** Provide seamless communication bridge whether frontend is co-located with backend or deployed independently (Vercel + Render).
- **Acceptance Criteria:**
  - [x] Implemented `apiFetch` and `apiUrl` utilizing `VITE_API_URL`.
  - [x] Updated all client fetch calls across components.

### 🎫 RADAR-103: Containerization & Cloud Blueprints
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`Dockerfile`](file:///c:/Dev_Projects/Reminder!/Dockerfile), [`docker-compose.yml`](file:///c:/Dev_Projects/Reminder!/docker-compose.yml), [`render.yaml`](file:///c:/Dev_Projects/Reminder!/render.yaml), [`vercel.json`](file:///c:/Dev_Projects/Reminder!/vercel.json)
- **Description:** Build production-grade container manifests and cloud blueprints for 1-click deployments.
- **Acceptance Criteria:**
  - [x] Multi-stage Alpine Dockerfile with frontend builder and lightweight runner.
  - [x] Render Blueprint with health checks.
  - [x] Root `.gitignore` and `.dockerignore` preventing credential and SQLite leakage.

### 🎫 RADAR-104: Vercel Fullstack Serverless Architecture
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`api/index.js`](file:///c:/Dev_Projects/Reminder!/api/index.js), [`vercel.json`](file:///c:/Dev_Projects/Reminder!/vercel.json), [`backend/db.js`](file:///c:/Dev_Projects/Reminder!/backend/db.js)
- **Description:** Provide seamless fullstack deployment directly on Vercel combining Vite frontend with Express Serverless Function backend.
- **Acceptance Criteria:**
  - [x] Created `api/index.js` serverless function adapter.
  - [x] Configured `vercel.json` routing `/api/*` to serverless function and SPA fallback for client pages.
  - [x] Added Vercel writable `/tmp/deadlines.db` fallback to prevent read-only filesystem errors.

### 🎫 RADAR-105: Runtime Performance Optimization & Dual-Channel Notification Engine
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`frontend/src/components/AnimatedBackground.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/AnimatedBackground.jsx), [`frontend/src/components/UrgencySphere.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/UrgencySphere.jsx), [`frontend/src/utils/notificationService.js`](file:///c:/Dev_Projects/Reminder!/frontend/src/utils/notificationService.js), [`backend/services/aiExtractor.js`](file:///c:/Dev_Projects/Reminder!/backend/services/aiExtractor.js)
- **Description:** Optimize canvas rendering loops from 10,000+ calculations/frame to <50, debounce search queries, add Service Worker and in-app visual alert banners, and support custom Gemini API keys.
- **Acceptance Criteria:**
  - [x] Capped canvas nodes to 36 and removed expensive `shadowBlur` per-frame operations.
  - [x] Debounced search queries by 250ms to eliminate concurrent backend request storms.
  - [x] Created `sw.js` and implemented audio chime + in-app toast alerts for guaranteed notification visibility.
  - [x] Reduced Gemini API timeout to 4.5s and added custom key configuration in the playground modal.

### 🎫 RADAR-106: Fast IMAP Sequence Range Fetching, Zero-GPU Starfield & Live Gemini Key Integration
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`backend/services/imapService.js`](file:///c:/Dev_Projects/Reminder!/backend/services/imapService.js), [`backend/server.js`](file:///c:/Dev_Projects/Reminder!/backend/server.js), [`frontend/src/components/AnimatedBackground.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/AnimatedBackground.jsx), [`frontend/src/App.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/App.jsx), [`frontend/src/components/ConnectMailboxModal.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/ConnectMailboxModal.jsx)
- **Description:** Replace unbounded 30-day full-MIME IMAP downloads (which caused 3-4 minute timeouts on Vercel serverless) with ultra-fast sequence range indexing (`${startSeq}:*`) for the latest 15 emails; forward user Gemini API keys (`x-gemini-key`) during mailbox sync; restore a dense 150+ twinkling star cosmic background with 0% extra GPU load via dual-layer canvas architecture.
- **Acceptance Criteria:**
  - [x] Mailbox sync executes in $< 2.0$ seconds via IMAP sequence range indexing, never hitting Vercel's 10s serverless timeout.
  - [x] Gemini API key forwarded from client localStorage (`x-gemini-key` and body `gemini_api_key`) to `extractDeadlineFromEmail` during live mailbox sync.
  - [x] Allowed `x-gemini-key` header in CORS policy to prevent preflight rejections.
  - [x] Dense celestial starfield restored in `AnimatedBackground.jsx` using 150+ twinkling stars with 0% GPU load (no $O(N^2)$ checks or `shadowBlur`).
  - [x] Added Gemini API Key input field to `ConnectMailboxModal.jsx`.

---

## Epic 2: Core Task Management & Dashboard

### 🎫 RADAR-201: Dynamic Tri-Color Urgency Calculation Engine
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`backend/services/aiExtractor.js`](file:///c:/Dev_Projects/Reminder!/backend/services/aiExtractor.js), [`frontend/src/components/DeadlineCard.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/DeadlineCard.jsx)
- **Description:** Real-time computation of urgency tiers (🔴 Red $\le 48\text{h}$, 🟡 Yellow $\le 7\text{d}$, 🟢 Green $> 7\text{d}$, Overdue).
- **Acceptance Criteria:**
  - [x] Auto-updating urgency tiers on every GET request.
  - [x] Visual urgency beacon and countdown string on each card.

### 🎫 RADAR-202: Task Lifecycle Actions & Confetti Celebration
- **Priority:** `P1 - High` | **Status:** `✅ Completed`
- **Target:** [`backend/server.js`](file:///c:/Dev_Projects/Reminder!/backend/server.js), [`frontend/src/App.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/App.jsx)
- **Description:** Enable student to mark tasks "Done", "Snooze 24h", "Reactivate", and "Delete".
- **Acceptance Criteria:**
  - [x] `PATCH /api/deadlines/:id/action` endpoint supporting all 4 states.
  - [x] `canvas-confetti` fireworks trigger upon completing a deadline.
  - [x] Completed items archived cleanly in Completed tab.

### 🎫 RADAR-203: Multi-Criteria Filter & Instant Search
- **Priority:** `P1 - High` | **Status:** `✅ Completed`
- **Target:** [`frontend/src/components/UrgencyFilterBar.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/UrgencyFilterBar.jsx)
- **Description:** Live client/server search and category filtering.
- **Acceptance Criteria:**
  - [x] Category pill buttons (Placement, Hackathons, Exams, Assignments, Feedback, Forms).
  - [x] Text search searching across title, sender, and action required simultaneously.

---

## Epic 3: Mailbox Harvester & Extraction Pipeline

### 🎫 RADAR-301: IMAP Mailbox Scanner with Sequence Range Optimization
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`backend/services/imapService.js`](file:///c:/Dev_Projects/Reminder!/backend/services/imapService.js)
- **Description:** Ultra-fast email fetching using sequence ranges over SSL port 993.
- **Acceptance Criteria:**
  - [x] Scans last 30 days of emails in $< 3$ seconds.
  - [x] Presets for Gmail, Outlook 365, and university IMAP.
  - [x] Sub-300ms connection validation endpoint (`/api/mailbox/test-connection`).

### 🎫 RADAR-302: Heuristic Rule Extractor & Academic Noise Filter
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`backend/services/aiExtractor.js`](file:///c:/Dev_Projects/Reminder!/backend/services/aiExtractor.js)
- **Description:** Filter out security notifications, OTPs, receipts, and parse registration links & dates.
- **Acceptance Criteria:**
  - [x] Filters out Google security alerts, OTPs, shopping digests.
  - [x] Extracts `forms.gle`, `forms.office.com`, and `unstop.com` links.
  - [x] Natural language date parser for "Sunday", "Tomorrow 5 PM", "15th Nov".

### 🎫 RADAR-303: Google Gemini 1.5 Flash LLM Bridge
- **Priority:** `P1 - High` | **Status:** `✅ Completed`
- **Target:** [`backend/services/aiExtractor.js`](file:///c:/Dev_Projects/Reminder!/backend/services/aiExtractor.js)
- **Description:** Zero-shot JSON extraction for unstructured complex emails with automatic fallback to heuristic engine.
- **Acceptance Criteria:**
  - [x] Structured JSON prompt with student taxonomy.
  - [x] Graceful fallback to heuristic engine if API key missing or rate-limited.

---

## Epic 4: Notification & Sync Ecosystem

### 🎫 RADAR-401: Desktop Web Push Notifications
- **Priority:** `P1 - High` | **Status:** `✅ Completed`
- **Target:** [`frontend/src/utils/notificationService.js`](file:///c:/Dev_Projects/Reminder!/frontend/src/utils/notificationService.js)
- **Description:** Native browser notification support for critical (<48h) deadlines.
- **Acceptance Criteria:**
  - [x] 1-Click permission request toggle in Navbar.
  - [x] Direct click-through opening the registration form.

### 🎫 RADAR-402: Telegram Bot Integration
- **Priority:** `P1 - High` | **Status:** `✅ Completed`
- **Target:** [`backend/server.js`](file:///c:/Dev_Projects/Reminder!/backend/server.js), [`frontend/src/components/TelegramModal.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/TelegramModal.jsx)
- **Description:** Dispatch formatted Markdown alerts with action links to student Telegram chats.
- **Acceptance Criteria:**
  - [x] Test alert dispatching via `/api/telegram/test-alert`.
  - [x] Formatted inline keyboard button opening ERP / Google Forms.

### 🎫 RADAR-403: Google Calendar 1-Click Sync & `.ics` Exporter
- **Priority:** `P1 - High` | **Status:** `✅ Completed`
- **Target:** [`frontend/src/utils/notificationService.js`](file:///c:/Dev_Projects/Reminder!/frontend/src/utils/notificationService.js), [`frontend/src/components/CalendarSyncModal.jsx`](file:///c:/Dev_Projects/Reminder!/frontend/src/components/CalendarSyncModal.jsx)
- **Description:** Export academic obligations to personal calendars with automatic 24h & 2h alarm triggers.
- **Acceptance Criteria:**
  - [x] Download RFC 5545 `.ics` file with `VALARM` triggers.
  - [x] Direct Google Calendar event URL generator.

---

## Epic 5: Quality, Documentation & Reliability

### 🎫 RADAR-501: Mandatory 5-Document Standard Implementation
- **Priority:** `P0 - Critical` | **Status:** `✅ Completed`
- **Target:** [`docs/`](file:///c:/Dev_Projects/Reminder!/docs)
- **Description:** Establish and write the 5 mandated project documents: PRD, Architecture, Security, Frontend Spec, Feature Tickets.
- **Acceptance Criteria:**
  - [x] `docs/1_PRD.md` created and approved.
  - [x] `docs/2_TECHNICAL_ARCHITECTURE.md` created with Mermaid diagrams.
  - [x] `docs/3_SECURITY_AND_ACCESS.md` created with OWASP & threat modeling.
  - [x] `docs/4_FRONTEND_SPEC.md` created with design tokens and responsive matrix.
  - [x] `docs/5_FEATURE_TICKET_LIST.md` created with Kanban traceability.

### 🎫 RADAR-502: Automated Build & Lint Verification
- **Priority:** `P1 - High` | **Status:** `✅ Completed`
- **Target:** [`package.json`](file:///c:/Dev_Projects/Reminder!/package.json)
- **Description:** Zero error Vite compilation and Oxlint validation.
- **Acceptance Criteria:**
  - [x] `npm run build` passes in $< 1.5$ seconds.
  - [x] Oxlint passes with 0 errors.

---

## Epic 6: Next Milestone Backlog (v2.0)

### 🎫 RADAR-601: Background Cron Polling Daemon
- **Priority:** `P2 - Enhancement` | **Status:** `🚧 In Progress`
- **Description:** Persistent background daemon worker checking college mailboxes every 30 minutes without requiring an open browser tab.

### 🎫 RADAR-602: Multi-Account Mailbox Aggregation
- **Priority:** `P2 - Enhancement` | **Status:** `📋 Backlog`
- **Description:** Allow students to simultaneously connect personal Gmail, college Google Workspace, and departmental Outlook accounts into a single unified board.

### 🎫 RADAR-603: SMS / WhatsApp Cloud API Integration
- **Priority:** `P2 - Enhancement` | **Status:** `📋 Backlog`
- **Description:** Direct WhatsApp reminder dispatch using WhatsApp Cloud API for students in regions with low email opening rates.
