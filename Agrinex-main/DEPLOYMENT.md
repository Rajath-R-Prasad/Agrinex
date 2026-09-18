# Agrinex Deployment & Dockerization Guide

This guide details how to build, run with Docker, and deploy Agrinex to production (including Vercel).

---

## 1. Local & Production Docker Setup

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)

### Option A: One-Command Full-Stack (Frontend + Backend)
Run from the `Agrinex-main` root directory:
```bash
docker compose up --build
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **API Docs (Swagger)**: `http://localhost:8000/docs`

To stop:
```bash
docker compose down
```

---

### Option B: Building Individual Containers

#### 1. Backend (FastAPI + ML Engine)
```bash
cd backend
docker build -t agrinex-backend .
docker run -p 8000:8000 agrinex-backend
```

#### 2. Frontend (React + Vite + Nginx)
```bash
cd frontend
docker build --build-arg VITE_API_URL=http://localhost:8000 -t agrinex-frontend .
docker run -p 5173:80 agrinex-frontend
```

---

## 2. Deploying to Vercel

### Method A: Deploy Frontend on Vercel (Recommended)
Vercel is optimized for static and Single Page Applications like Vite React:

1. **Push your repository** to GitHub.
2. In the [Vercel Dashboard](https://vercel.com):
   - Click **"Add New Project"** and select your GitHub repo.
   - **Root Directory**: Set to `frontend` (or `Agrinex-main/frontend`).
   - **Framework Preset**: `Vite`.
   - **Build Command**: `npm run build`.
   - **Output Directory**: `dist`.
3. **Environment Variables**:
   - `VITE_API_URL`: Set to your deployed backend URL (e.g. `https://agrinex-backend.onrender.com` or `https://agrinex-api.up.railway.app`).
4. Click **Deploy**.

---

### Method B: Deploy Backend Container
FastAPI with Scikit-learn ML models runs best on persistent container hosts (with free tiers):

#### 1. Deploy on Render
1. Go to [render.com](https://render.com) -> **New Web Service**.
2. Connect your repository.
3. Select **Docker** environment.
4. Set **Root Directory** to `backend` (or `Agrinex-main/backend`).
5. Port: `8000`.
6. Click **Create Web Service**.

#### 2. Deploy on Railway / Fly.io / Cloud Run
- Deploy directly using the provided [`backend/Dockerfile`](backend/Dockerfile).
- Set the exposed port to `8000`.

---

## 3. Configuration Files Summary

| File | Purpose |
|------|---------|
| [`backend/Dockerfile`](backend/Dockerfile) | Production Python 3.12-slim image with FastAPI, ML pipelines, and healthchecks. |
| [`frontend/Dockerfile`](frontend/Dockerfile) | Multi-stage build producing a high-performance Nginx static server. |
| [`frontend/nginx.conf`](frontend/nginx.conf) | Nginx SPA configuration with gzip compression and client-side routing. |
| [`docker-compose.yml`](docker-compose.yml) | Multi-container composition linking frontend and backend together. |
| [`frontend/vercel.json`](frontend/vercel.json) | Vercel configuration for SPA client routing and Vite build. |
| [`vercel.json`](vercel.json) | Root monorepo configuration for full-stack Vercel deployments. |
