# ==========================================
# Stage 1: Build Frontend Single-Page App
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install Python & build tools (optional, supports Python NLP bridge if used)
RUN apk add --no-cache python3 py3-pip

ENV NODE_ENV=production
ENV PORT=8000
ENV DATABASE_PATH=/app/data/deadlines.db

# Install backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Persistent data directory for SQLite database
RUN mkdir -p /app/data && chown -R node:node /app
VOLUME ["/app/data"]

USER node
EXPOSE 8000

CMD ["node", "server.js"]
