# 1. Product Requirements Document (PRD)

**Project Name:** Student Deadline Radar  
**Document Version:** 1.0.0  
**Status:** Approved & Implemented  
**Target Release:** Production v1.0  

---

## 1. Executive Summary
University students receive dozens of high-stakes emails weekly from disparate departmental senders (Dean's Office, Training & Placement Cell, HOD, Exam Controller, Event Clubs). Crucial action items, mandatory feedback surveys, hackathon registrations, and placement deadlines get buried under informational noise, leading to missed opportunities and disciplinary academic penalties.

**Student Deadline Radar** is an intelligent academic mailbox deadline aggregator. It connects directly to student mailboxes via secure IMAP, extracts actionable obligations using a hybrid AI and rule-based heuristic extractor, classifies items into structured categories, calculates tri-color urgency tiers, and escalates impending deadlines via Web Push, Telegram, and Calendar integrations.

---

## 2. Problem Statement
1. **Inbox Tsunami & Noise:** Academic notices are formatted inconsistently (plain text, formatted HTML, forwarded threads, embedded forms). Over 85% of incoming student emails are non-actionable notifications (system logins, newsletters, broad announcements).
2. **High Cost of Missed Deadlines:** Missing a Placement Cell registration closes job eligibility for an entire semester; missing an exam form leads to late fines or semester debarment; missing mandatory NAAC/IQAC faculty feedback locks grade cards.
3. **Fragmented Workflows:** Students have to manually copy dates into calendars, hunt for Google Form links inside paragraphs, and set manual alarm reminders.

---

## 3. User Personas

### Persona A: "Aarav" — Final Year Placement Aspirant
- **Profile:** B.Tech Computer Science senior applying to campus hiring drives.
- **Pain Point:** Drives announce registration deadlines with 4-hour to 24-hour turnarounds. Aarav missed a tier-1 company test because the email arrived at 11:30 PM with a cutoff of 8:00 AM next morning.
- **Needs:** Instant 🔴 Red urgency alerts pushed directly to his phone via Telegram and desktop push notifications with direct links to the registration form.

### Persona B: "Priya" — Pre-Final Year Academic Achiever & Club Lead
- **Profile:** 3rd year student balancing club events, hackathons, and lab submissions.
- **Pain Point:** Overwhelmed by emails from 6 different faculty members giving informal assignments and project submission deadlines.
- **Needs:** A clean Kanban and list view categorized by `hackathon`, `assignment`, `exam`, and `feedback` with 1-click Google Calendar integration.

---

## 4. Product Vision & Value Proposition
> *"Transform every student mailbox from an anxiety-inducing inbox into an automated, color-coded mission control dashboard that guarantees zero missed deadlines."*

---

## 5. Functional Requirements (FR)

### FR-1: Intelligent Mailbox Sync & Harvester
- **FR-1.1:** Support 1-click preset connections for Gmail / Google Workspace (`imap.gmail.com:993`), Outlook / Microsoft 365 (`outlook.office365.com:993`), and custom university mail servers (`mail.college.edu`).
- **FR-1.2:** Safe background scanning using sequence ranges (fetching last 10–30 days of unread or recent messages in <3 seconds).
- **FR-1.3:** Filter out non-actionable noise: security alerts, login notifications, OTPs, promotional newsletters, and receipts.

### FR-2: Dual-Engine AI Extraction Pipeline
- **FR-2.1:** **Heuristic Extractor:** Instant zero-network rule engine parsing regex patterns, natural language dates ("Tomorrow 5 PM", "by Sunday", "15th Nov"), and extracting Google Form / registration URLs.
- **FR-2.2:** **Gemini 1.5 Flash LLM Extractor:** Structured JSON generation for nuanced college emails requiring semantic contextualization.
- **FR-2.3:** Categorization Taxonomy:
  - `placement`: Campus drives, shortlists, interview rounds.
  - `registration`: Competitive programming, certifications, hackathons.
  - `exam`: Hall tickets, back paper registration, exam fee deadlines.
  - `assignment`: Practical submissions, lab records, homework.
  - `feedback`: Mandatory faculty evaluation, NAAC, course exit surveys.
  - `event`: Cultural/technical fests, webinars, workshops.
  - `other`: General administrative circulars.

### FR-3: Tri-Color Urgency Radar Board
- **FR-3.1:** Dynamic urgency calculation relative to real-time clock:
  - 🔴 **Red (Critical):** Deadline $\le 48\text{ hours}$ remaining.
  - 🟡 **Yellow (Approaching):** Deadline $\le 7\text{ days}$ remaining.
  - 🟢 **Green (Normal):** Deadline $> 7\text{ days}$ remaining.
  - ⚫ **Overdue:** Past deadline timestamp with active status.
- **FR-3.2:** Live countdown timer on each card displaying exact remaining hours/minutes.
- **FR-3.3:** Quick filters by urgency tier, category, and live text search across titles, senders, and action descriptions.

### FR-4: Task Lifecycle Management
- **FR-4.1:** **Mark as Done:** Moves task to completed archive with dynamic canvas confetti celebration.
- **FR-4.2:** **Snooze 24h:** Temporarily hides urgent tasks until the next morning.
- **FR-4.3:** **Reactivate:** Restore completed or snoozed items back to active board.
- **FR-4.4:** **Delete:** Permanent cleanup of unwanted notices.

### FR-5: Multi-Channel Reminder Hub
- **FR-5.1:** **Desktop Web Push Notifications:** Native browser notification dispatch with permission toggle and direct link clickout.
- **FR-5.2:** **Telegram Bot Integration:** Formatted Markdown alerts dispatched to student Telegram accounts with interactive inline URL buttons.
- **FR-5.3:** **Calendar Sync:** Instant `.ics` calendar export with configured 24h & 2h alarms, plus 1-click Google Calendar event generation.

### FR-6: Interactive Email Parser Simulator
- **FR-6.1:** Dedicated playground modal allowing students to paste raw email text to test the extractor.
- **FR-6.2:** Instant visual preview of parsed entities (Title, Due Date, Urgency, Primary Link, Mandatory flag).
- **FR-6.3:** One-click "Add to Board" option to persist manually parsed notices into the active database.

---

## 6. Non-Functional Requirements (NFR)

| Area | Requirement | Metric / Target |
| :--- | :--- | :--- |
| **Performance** | Initial dashboard load & paint | $< 800\text{ms}$ on standard 4G connections. |
| **Extraction Latency** | Heuristic date/link extraction | $< 15\text{ms}$ per email. |
| **LLM Fallback** | Gemini failure or rate limit | Seamless graceful fallback to heuristic engine in $< 50\text{ms}$. |
| **Availability** | Server uptime | $99.9\%$ on standard container runtimes. |
| **Data Privacy** | Mailbox password security | App passwords stored in browser `localStorage` or session memory; never committed to git or exposed via logging. |
| **Mobile Responsiveness** | Breakpoints | Flawless UX across Mobile (360px+), Tablet (768px+), and Desktop (1280px+). |

---

## 7. Success Metrics & Key Performance Indicators (KPIs)
- **Zero Missed Deadlines:** 100% of critical placement/exam notices detected with $\le 48\text{h}$ warning lead time.
- **Noise Reduction Rate:** $\ge 80\%$ of spam, OTPs, and promotional emails filtered out automatically.
- **Extraction Accuracy:** $\ge 95\%$ accuracy on date and actionable link extraction across Indian university email patterns.
- **Engagement:** Daily active usage during peak exam/placement cycles.

---

## 8. Out of Scope (Phase 1)
- Bi-directional email sending (e.g., auto-replying to professors).
- WhatsApp Cloud Business API (deferred to Phase 2 due to Meta verification overhead; Telegram provided as instant alternative).
- Multi-tenant university admin panel (Phase 1 is student-centric single-user / personal desktop assistant).
