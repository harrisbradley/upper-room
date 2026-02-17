# Vercel Auto-Deployment Setup

## Current Issue
Vercel is not automatically redeploying when changes are pushed to the `main` branch.

## Solution: Configure Auto-Deployment in Vercel Dashboard

### Step 1: Check Vercel Project Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: **upper-room-app**
3. Go to **Settings** → **Git**

### Step 2: Verify Git Integration

Make sure:
- ✅ Your GitHub repository is connected
- ✅ **Production Branch** is set to `main`
- ✅ **Auto-deploy** is enabled for Production

### Step 3: Enable Auto-Deploy

1. In **Settings** → **Git** → **Production Branch**
   - Should be: `main`
   - **Auto-deploy** should be: **Enabled**

2. In **Settings** → **Git** → **Deploy Hooks** (optional)
   - You can create a deploy hook if needed

### Step 4: Trigger Manual Redeploy (Immediate Fix)

To deploy the current `main` branch immediately:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **three dots (⋯)** menu
4. Click **Redeploy**
5. Select **Use existing Build Cache** (optional, faster)
6. Click **Redeploy**

### Step 5: Verify Deployment

1. Check the deployment logs for any errors
2. Once deployed, visit: https://upper-room-app.vercel.app/
3. You should see:
   - Header with logo at the top
   - "My Studies" section
   - Create study form

## Troubleshooting

### If Auto-Deploy Still Doesn't Work

1. **Check GitHub Integration**:
   - Go to Vercel Settings → Git
   - Click "Disconnect" and reconnect your GitHub repo
   - Make sure you grant the necessary permissions

2. **Check Branch Protection**:
   - If you have branch protection rules on GitHub, make sure Vercel has access

3. **Check Deployment Settings**:
   - Settings → General → **Build Command**: Should be `npm run build`
   - Settings → General → **Output Directory**: Leave empty (Next.js auto-detects)
   - Settings → General → **Install Command**: Should be `npm install`

4. **Check Environment Variables**:
   - Make sure all Firebase env vars are set (they should persist across deployments)

### Manual Trigger via GitHub

If auto-deploy isn't working, you can manually trigger by:
1. Making a small change (like updating README)
2. Committing and pushing to `main`
3. This should trigger a deployment

## Expected Behavior

After setup, Vercel should:
- ✅ Automatically deploy every push to `main` branch
- ✅ Create preview deployments for other branches
- ✅ Show deployment status in Vercel dashboard
- ✅ Send notifications (if configured)

## Verification Checklist

- [ ] Git integration connected
- [ ] Production branch set to `main`
- [ ] Auto-deploy enabled for Production
- [ ] Latest `main` branch deployed
- [ ] Changes visible on https://upper-room-app.vercel.app/
