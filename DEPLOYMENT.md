# 🚀 Deployment Guide - Student Deadline Radar

Student Deadline Radar is built with a modern **fullstack JavaScript/React** architecture, fully optimized for deployment on **Vercel** and local execution.

---

## ⚡ 1-Click Deployment on Vercel (Frontend + Backend Fullstack)

Both the **React Vite Frontend** and the **Node.js Express Backend** deploy together under a single domain on Vercel with zero server maintenance.

### Architecture on Vercel:
- **Frontend:** Built automatically from `frontend/` and served at global edge CDN speeds.
- **Backend API:** Packaged as a high-performance serverless function via [`api/index.js`](api/index.js) and routed through [`vercel.json`](vercel.json).
- **Database:** Auto-initialized in `/tmp/deadlines.db` on cold start.

### Steps to Deploy:
1. Push your repository to **GitHub**: [https://github.com/Adarsh011732/reminder](https://github.com/Adarsh011732/reminder)
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Select the repository **`reminder`**.
4. Configure Project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `frontend/dist`
5. Add Environment Variables under **Settings → Environment Variables**:
   - `SESSION_SECRET`: **REQUIRED** for stable server-side login sessions — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   - `GEMINI_API_KEY`: *(Optional)* For Google Gemini Flash extraction (heuristic engine works without it).
   - `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID`: *(Optional)* For urgent mobile push notifications.
   - `CORS_ORIGIN`: *(Optional)* Only set this for split-domain deployments (e.g. Render API + Vercel SPA). Leave unset for the standard single-domain Vercel setup — the backend is same-origin only by default.
6. Click **Deploy**!

---

## 💻 Running Locally

### 1. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Start Services
```bash
# Terminal 1: Start Node.js Express backend (Port 8000)
node backend/server.js

# Terminal 2: Start Vite React frontend (Port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` to view the dashboard!

---

## 🔑 Environment Variables Reference

| Variable | Required? | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `8000` | Port for local Node.js backend. |
| `NODE_ENV` | No | `production` on Vercel | Production mode enables HSTS + upgrade-insecure-requests and disables debug traces. |
| `SESSION_SECRET` | **Yes (prod)** | ephemeral | HMAC key signing the HttpOnly session cookie (min 32 chars). Ephemeral fallback keeps dev working but does not survive restarts. |
| `CORS_ORIGIN` | No | same-origin only | Comma-separated exact origins. Wildcard `*` is allowed but never combined with credentials. |
| `GEMINI_API_KEY` | No | `""` | Google Gemini key for AI email deadline extraction. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Primary Gemini model id (`gemini-1.5-flash` was retired by Google in 2025). |
| `GEMINI_FALLBACK_MODEL` | No | `gemini-2.0-flash` | Retry target when the primary model is retired/missing. |
| `TELEGRAM_BOT_TOKEN` | No | `""` | Telegram bot token for instant deadline alerts. |
| `TELEGRAM_CHAT_ID` | No | `""` | Telegram user or group chat ID for notifications. |

### Security-related deployment notes
- **Session auth:** all mutating endpoints (`PATCH /api/deadlines/:id/action`, `parse-raw` with `auto_save`, telegram dispatch, websocket-free mailbox scans) require an HttpOnly `radar_session` cookie plus the double-submit `x-radar-csrf` header — both minted only after a successful IMAP credential proof.
- **SSRF:** IMAP targets accept public hostnames only (private/loopback/link-local/metadata ranges rejected; TLS `secure` port restricted to `993`).
- **URLs:** every stored/rendered link passes the server-side and client-side URL sanitizers; `javascript:`/`data:` URLs can never reach an `href`.
