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
5. *(Optional)* Add Environment Variables under **Settings → Environment Variables**:
   - `GEMINI_API_KEY`: *(Optional)* For advanced Google Gemini 1.5 Flash extraction.
   - `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID`: *(Optional)* For urgent mobile push notifications.
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
| `NODE_ENV` | No | `production` on Vercel | Production mode disables debug traces and enables HSTS. |
| `GEMINI_API_KEY` | No | `""` | Google Gemini 1.5 Flash key for AI email deadline extraction. |
| `TELEGRAM_BOT_TOKEN` | No | `""` | Telegram bot token for instant deadline alerts. |
| `TELEGRAM_CHAT_ID` | No | `""` | Telegram user or group chat ID for notifications. |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins. |
