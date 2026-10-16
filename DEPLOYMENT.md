# 🚀 Production Deployment Guide - Student Deadline Radar

Student Deadline Radar is now 100% **deployment ready**. It is pre-configured for:
1. **Fullstack Single-Service Deployment** (Recommended: Render, Railway, Fly.io, Heroku, Docker) — Node.js Express automatically serves both the backend REST APIs and the high-performance Vite React frontend from a single URL.
2. **Decoupled Architecture** (Frontend on Vercel/Netlify, Backend on Render/Railway) — Pre-wired with `VITE_API_URL` environment variable support.
3. **Containerized Deployment** (Docker & Docker Compose) — Multi-stage Alpine container ready for any VPS or cloud container platform.

---

## ⚡ Option 1: Deploy Fullstack (Frontend + Backend Together) on Vercel

You can now deploy both the **React Frontend** and the **Node.js Express Backend** together on Vercel with **zero configuration** using Vercel Serverless Functions.

### How it works:
- [`vercel.json`](vercel.json) routes all `/api/*` requests to the serverless function entrypoint [`api/index.js`](api/index.js).
- All web pages and assets are built from `frontend/` and served globally via Vercel Edge CDN.
- SQLite is initialized automatically in `/tmp/deadlines.db` on cold start.

### Steps to Deploy:
1. Push your repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Select this repository.
4. Leave settings as default:
   - **Framework Preset:** `Other` (or `Vite`)
   - **Root Directory:** `./` (leave at root!)
5. (Optional) Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini key.
   - `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID`: *(Optional)* For Telegram alerts.
6. Click **Deploy**!
   - Vercel builds the React frontend and packages the Express backend as a Serverless function.
   - Both your frontend and backend will be live under a single domain (e.g., `https://your-project.vercel.app`)!

---

## ⚡ Option 2: 1-Click / Blueprint on Render (Recommended for Permanent SQLite Disk)

Deploying as a single fullstack service on [Render.com](https://render.com) is the simplest and cleanest way.

### Steps:
1. Push your repository to **GitHub** or **GitLab**.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint** (or **Web Service**).
4. Connect your GitHub repository.
5. Render will automatically detect [`render.yaml`](render.yaml):
   - **Runtime**: `Node`
   - **Build Command**: `npm install --prefix frontend && npm run build --prefix frontend && npm install --prefix backend --production`
   - **Start Command**: `node backend/server.js`
   - **Health Check Path**: `/health`
6. Under **Environment Variables**, add any optional keys:
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key for AI email parsing.
   - `TELEGRAM_BOT_TOKEN`: *(Optional)* Your Telegram Bot token from `@BotFather`.
   - `TELEGRAM_CHAT_ID`: *(Optional)* Your target Telegram Chat ID.
7. Click **Apply / Deploy**.
8. Once deployed, Render provides a free SSL URL (e.g., `https://student-deadline-radar.onrender.com`).

---

## ⚡ Option 2: Decoupled (Vercel Frontend + Render/Railway Backend)

If you prefer hosting the React client on [Vercel](https://vercel.com) and the Node API on [Render](https://render.com) or [Railway](https://railway.app):

### Step A: Deploy the Backend
1. In Render or Railway, create a **Web Service** pointing to your repository.
2. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install --production`
   - **Start Command**: `node server.js`
3. Add environment variable `CORS_ORIGIN=*` (or your Vercel frontend URL).
4. Copy your backend URL (e.g., `https://radar-backend.onrender.com`).

### Step B: Deploy the Frontend to Vercel
1. Go to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
2. Select your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: Set to your deployed backend URL (e.g., `https://radar-backend.onrender.com`).
5. Click **Deploy**. Vercel will build and serve the client app with full routing support via [`frontend/vercel.json`](frontend/vercel.json).

---

## 🐳 Option 3: Docker Container Deployment (VPS, AWS, DigitalOcean)

The project includes an optimized multi-stage [`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml).

### Run with Docker Compose:
```bash
# 1. (Optional) Copy and configure environment variables
cp .env.example .env

# 2. Build and launch container in background
docker compose up -d --build

# 3. Check logs
docker compose logs -f
```
Your app will be live at `http://localhost:8000`. The SQLite database is automatically persisted in the `radar_data` Docker volume.

### Run with plain Docker:
```bash
# Build the production image
docker build -t student-deadline-radar .

# Run the container with persistent volume
docker run -d -p 8000:8000 \
  -v radar_volume:/app/data \
  --name deadline-radar \
  student-deadline-radar
```

---

## 🚂 Option 4: Railway / Heroku

Both Railway and Heroku are supported out of the box via the root [`package.json`](package.json) and [`Procfile`](Procfile).

1. In Railway/Heroku, connect your repo.
2. Platform detects Node.js and executes:
   - Build: `npm run build` (builds the Vite frontend)
   - Start: `npm start` (executes `node backend/server.js`)
3. Health check path: `/health`

---

## 🔑 Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `8000` | Port for the web server (automatically set by Render/Heroku/Railway). |
| `NODE_ENV` | Optional | `production` | Node environment mode. |
| `DATABASE_PATH` | Optional | `./backend/deadlines.db` | Custom path to SQLite file (set to `/app/data/deadlines.db` in Docker). |
| `CORS_ORIGIN` | Optional | `*` | Allowed CORS origins for API requests (comma-separated). |
| `GEMINI_API_KEY` | Optional | `""` | Google Gemini API key for advanced AI email deadline extraction. |
| `TELEGRAM_BOT_TOKEN` | Optional | `""` | Telegram Bot token for push notifications. |
| `TELEGRAM_CHAT_ID` | Optional | `""` | Default Telegram chat ID for reminders. |
| `VITE_API_URL` | Optional | `""` | Backend API URL for decoupled deployments (leave blank for single-service). |

---

## 🧪 Pre-Flight Verification Checklist

- [x] **Frontend Builds Without Errors**: `npm run build` generates optimized assets in `frontend/dist`.
- [x] **Static SPA Serving**: Express serves `frontend/dist` with client-side fallback routing (`*`).
- [x] **Production Health Check**: `GET /health` and `GET /api/health` return HTTP 200 with uptime and status.
- [x] **Database Auto-Migration**: SQLite automatically initializes tables and seed data if empty.
- [x] **Persistent Storage Ready**: `DATABASE_PATH` allows mounting external persistent disks/volumes.
- [x] **Git & Secret Hygiene**: Root `.gitignore` prevents committing `.env`, local `.db` files, and `node_modules`.
- [x] **Graceful Shutdown**: Node listens for `SIGTERM`/`SIGINT` to cleanly close database connections on cloud container restarts.
