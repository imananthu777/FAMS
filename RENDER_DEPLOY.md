# Deploying FAMS to Render.com

## ⚠️ Important: Data Persistence Warning

Render's free tier uses **ephemeral file storage** - any data stored in Excel files will be **lost when the service restarts**. 

**Options:**
1. **For demo/testing only:** Deploy as-is (data resets on each deploy)
2. **For production:** Migrate to PostgreSQL database (Render offers free PostgreSQL)

---

## Quick Deployment Steps

### Option A: Using render.yaml (Recommended)

1. **Push your code to GitHub:**
   ```bash
   cd /home/homeserver/FAMS/webroot
   git add .
   git commit -m "Add Render deployment config"
   git push origin main
   ```

2. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml` and configure everything

3. **Deploy:**
   - Click "Apply" to create the service
   - Wait 2-5 minutes for build and deployment

---

### Option B: Manual Configuration

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Click **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - Select your GitHub repository containing FAMS

3. **Configure Service:**
   | Setting | Value |
   |---------|-------|
   | Name | `fams` |
   | Region | Singapore (or nearest) |
   | Branch | `main` |
   | Runtime | Node |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm run start` |
   | Plan | Free |

4. **Add Environment Variables:**
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render assigns this automatically)

5. **Click "Create Web Service"**

---

## After Deployment

Your app will be available at:
```
https://fams-xxxx.onrender.com
```

### Custom Domain Setup

1. Go to your service → **Settings** → **Custom Domains**
2. Add your domain (e.g., `fams-render.ananthureghu.co.in`)
3. Add the CNAME record to your DNS:
   ```
   CNAME: fams-render → fams-xxxx.onrender.com
   ```

---

## Troubleshooting

### Build Fails
- Check the build logs in Render dashboard
- Ensure all dependencies are in `package.json`

### App Not Starting
- Check start command: `npm run start`
- Verify `dist/index.cjs` exists after build

### Data Not Persisting
- This is expected on Render's free tier
- Consider upgrading to paid plan with disk storage
- Or migrate to PostgreSQL
