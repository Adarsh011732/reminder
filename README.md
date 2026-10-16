# 🎯 Student Deadline Radar

> **Intelligent College Notices & Mailbox Deadline Aggregator with Tri-Color Urgency Notifications**

Student Deadline Radar is a fullstack web application designed for students to track deadlines, academic notices, hackathons, and placement drives. It automatically parses academic emails (via IMAP sync or manual paste) and extracts actionable directives, deadlines, and form links using an AI extraction pipeline.

---

## ✨ Key Features

- 🚦 **Tri-Color Urgency Radar**: Dynamic urgency badges (🔴 Red: <48h, 🟡 Yellow: <7d, 🟢 Green: >7d, Overdue) recalculated continuously.
- 📬 **Live Mailbox IMAP Sync**: Connects directly to Gmail, Outlook 365, or College IMAP servers to ingest unread notifications.
- 🤖 **Dual-Engine Deadline Extractor**:
  - Heuristic pattern-matching engine with academic taxonomy (registrations, hackathons, exams, feedback forms).
  - Google Gemini 1.5 Flash LLM extraction bridge with fallback safety.
- 📱 **Multi-Channel Reminders**:
  - Native browser desktop push notifications with permission handling.
  - Direct Telegram bot alert dispatching with Markdown formatting.
  - One-click Google Calendar sync and standard `.ics` iCalendar file downloads.
- 📊 **Productivity Dashboard**: Streak counters, critical deadline counters, category filtering, and task completion archive.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Canvas Confetti.
- **Backend**: Node.js, Express, SQLite3 (`better-sqlite3` compatible), ImapFlow, Mailparser, Axios.
- **Python Bridge (Optional)**: FastAPI, SQLAlchemy, Pydantic, Dateparser.
- **Deployment**: Render, Vercel, Railway, Fly.io, Docker.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install --prefix frontend

# Install backend dependencies
npm install --prefix backend
```

### 2. Run Locally
In terminal 1 (Backend):
```bash
npm run dev --prefix backend
# Runs Express on http://localhost:8000
```

In terminal 2 (Frontend):
```bash
npm run dev --prefix frontend
# Runs Vite dev server on http://localhost:5173
```

---

## 📦 Production Build & Deployment

To deploy this project to production, see the comprehensive [Deployment Guide](DEPLOYMENT.md).

### Quick Build & Preview
```bash
# 1. Build frontend
npm run build

# 2. Start fullstack server
npm start
# Visit http://localhost:8000 to see the live production website!
```

---

## 📚 Project Documentation Hub

This project strictly adheres to the **5-Document Lifecycle Standard**. All technical and product specifications are maintained in the [`docs/`](docs/) directory:

1. 📄 [PRD (Product Requirements Document)](docs/1_PRD.md) — Problem statement, personas, and functional requirements.
2. 🏛️ [Technical Architecture Document](docs/2_TECHNICAL_ARCHITECTURE.md) — System topology, DB schemas, API contracts, and extraction pipelines.
3. 🔒 [Security & Access Document](docs/3_SECURITY_AND_ACCESS.md) — IMAP app password encryption, CORS policies, and threat mitigations.
4. 🎨 [Frontend Specification Document](docs/4_FRONTEND_SPEC.md) — Design tokens, component breakdown, and glassmorphic UI patterns.
5. 🎫 [Feature Ticket List](docs/5_FEATURE_TICKET_LIST.md) — Sprint backlog, priority rankings (P0/P1/P2), and status tracking.

---

## 📄 License
MIT License. Built for students to never miss another academic deadline.
