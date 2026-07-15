# VeriSight — Railway Deployment Guide

## Prerequisites

- A [Railway](https://railway.app) account (GitHub login)
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- Git (`git --version`)
- Railway CLI (optional): `npm install -g @railway/cli`

---

## Step 1: Prepare the Repository

```bash
# From the project root
git init
git add .
git commit -m "Initial commit for Railway deployment"
```

Push to GitHub (Railway can also deploy directly from a public repo).

---

## Step 2: Create a Railway Project

### Option A — Railway Dashboard (recommended)

1. Go to https://railway.app/dashboard
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository

### Option B — Railway CLI

```bash
railway login
railway init
railway link
```

---

## Step 3: Provision a PostgreSQL Database

1. In your Railway project dashboard, click **New** → **Database** → **Add PostgreSQL**
2. Railway will auto-inject the `DATABASE_URL` environment variable into your app
3. No manual configuration needed — `ProductionConfig.get_database_uri()` detects it automatically

---

## Step 4: Set Environment Variables

In the Railway Dashboard → **Variables** tab, set:

| Variable | Required | Description |
|---|---|---|
| `FLASK_ENV` | Yes | Must be `production` |
| `SECRET_KEY` | Yes | Random 64-char hex string |
| `JWT_SECRET` | Yes | Random 64-char hex string (different from above) |
| `JWT_EXPIRATION_HOURS` | No | Defaults to `24` |
| `MAX_CONTENT_LENGTH` | No | Defaults to `104857600` (100 MB) |
| `UPLOAD_FOLDER` | No | Defaults to `uploads` |
| `MODEL_CONFIDENCE_THRESHOLD` | No | Defaults to `0.5` |
| `FRAME_SAMPLE_RATE` | No | Defaults to `1` |

> `DATABASE_URL` is set **automatically** by the PostgreSQL plugin — do not set it manually.

Generate secrets locally:

```bash
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32)); print('JWT_SECRET=' + secrets.token_hex(32))"
```

---

## Step 5: Configure the Build

Railway uses the included `railway.json` (Nixpacks). No manual steps needed.

Key build details defined in `railway.json`:
- System dependencies: Python 3, GCC, OpenBLAS, CMake, libjpeg
- Installs via `pip install -r requirements.txt`
- Start command: `gunicorn wsgi:app` with 2 workers, 300s timeout, access logging

---

## Step 6: Deploy

If connected via GitHub: each push to the default branch triggers an automatic deploy.

Manual deploy via CLI:

```bash
railway up
```

---

## Step 7: Run Database Migrations

After the first deploy, run migrations to create the schema.

**Via Railway Dashboard**:

1. Go to your project → **Variables** tab
2. Copy the `DATABASE_URL` value (includes your Neon credentials)
3. Open a **Shell** session from the Railway dashboard
4. Run:

```bash
flask db upgrade
```

**Via CLI** (if you have Railway CLI connected):

```bash
railway run flask db upgrade
```

---

## Step 8: Verify the Deployment

1. In your Railway dashboard, click the **Deployments** tab
2. Once the status shows **Running**, click the **Generate Domain** button in the **Settings** tab or use the auto-generated `.railway.app` URL
3. Visit `https://your-project.up.railway.app/` — you should see the VeriSight landing page

---

## Railway-Specific Notes

### File Uploads (Ephemeral Storage)

Railway uses **ephemeral filesystems** — any uploaded video stored in the `uploads/` directory is lost on every deploy or restart.

**For production with file persistence**, use a cloud storage service:
- AWS S3 / DigitalOcean Spaces / Google Cloud Storage
- Update `app/services/detection_service.py` to download from cloud storage before analysis

### Worker Count

`railway.json` configures **2 gunicorn workers**. Railway's free tier provides 512 MB RAM.
- If the app exceeds memory, reduce workers to `1` in `railway.json`
- If you upgrade to a paid plan, increase workers to match CPU cores

### Health Checks

Railway automatically pings the root path (`/`) every 30 seconds. The app responds with the landing page. If it fails 3 consecutive checks, the instance is restarted.

### Logs

View logs in the Railway Dashboard → **Deployments** → **View Logs**.
Gunicorn access and error logs are streamed to stdout (configured in `railway.json`).

---

## Updating After Deployment

```bash
# Make changes, then:
git add .
git commit -m "Description of changes"
git push
```

Railway auto-deploys when the default branch is pushed. If auto-deploy is off:

```bash
railway up
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Build fails with `gcc` error | Missing system deps for `psycopg2` or `opencv` | Already handled in `railway.json`; verify NixPkgs list |
| App crashes on start | Missing `DATABASE_URL` | Add a PostgreSQL plugin or set the variable manually |
| `ModuleNotFoundError: torch` | Build timeout downloading PyTorch | Railway Nixpacks build may have a 5-minute limit; consider using a smaller wheel or pre-building |
| 502 Bad Gateway | App takes >30s to respond | Ensure gunicorn `--timeout 300` is used (set in `railway.json`) |
| Upload fails with 413 | File exceeds limit | Increase `MAX_CONTENT_LENGTH` or reduce video size |
| Static files 404 | Whitenoise not configured | Verify `whitenoise` is in `requirements.txt` and `_init_production_static` runs in `create_app` |
| Model import error | torch/timm not installed | Check build logs; install may have timed out. Add `torch` and `timm` to a pre-build phase if needed |
