# Vercel Deployment Guide

This guide will help you deploy the Upper Room app to Vercel.

## Prerequisites

- A GitHub account (your code should be in a GitHub repository)
- A Vercel account (sign up at [vercel.com](https://vercel.com) - free tier available)
- Firebase project configured (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))

## Step 1: Push Your Code to GitHub

If you haven't already, make sure your code is pushed to a GitHub repository:

```bash
git remote -v  # Check if you have a remote
# If not, add your GitHub repo:
# git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - If this is your first time, you may need to authorize Vercel to access your GitHub
   - Select the repository containing your Upper Room app
   - Click **"Import"**

## Step 3: Configure Project Settings

Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset**: Next.js (should be auto-detected)
- **Root Directory**: `./` (leave as default unless your Next.js app is in a subdirectory)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default, Vercel handles this automatically)
- **Install Command**: `npm install` (default)

## Step 4: Add Environment Variables

This is **critical** - you need to add your Firebase configuration:

1. In the Vercel project setup page, expand **"Environment Variables"**
2. Add each of the following variables (get values from your Firebase Console → Project Settings → General → Your apps → Web app config):

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id (optional)
   ```

3. Make sure to add these for **all environments** (Production, Preview, Development) or at least Production
4. Click **"Add"** after each variable

## Step 5: Deploy

1. Click **"Deploy"** button
2. Vercel will:
   - Install dependencies
   - Run the build
   - Deploy your app
3. Wait for the deployment to complete (usually 1-3 minutes)

## Step 6: Verify Deployment

1. Once deployment completes, Vercel will provide you with a URL like:
   - `https://your-project-name.vercel.app`
2. Click the URL to test your app
3. Verify:
   - The app loads correctly
   - Firebase authentication works
   - You can create/join studies

## Step 7: Configure Custom Domain (Optional)

If you want to use a custom domain:

1. Go to your project settings in Vercel
2. Navigate to **"Domains"**
3. Add your custom domain
4. Follow Vercel's instructions to configure DNS

## Important Notes

### Firebase Configuration

- Make sure your Firebase project allows requests from your Vercel domain
- In Firebase Console → Authentication → Settings → Authorized domains, add:
  - `your-project-name.vercel.app`
  - Your custom domain (if using one)
  - `localhost` (for local development)

### Firestore Security Rules

- Ensure your Firestore security rules are properly configured for production
- Test that anonymous authentication works correctly

### Environment Variables

- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Always use Vercel's environment variables interface for production secrets

## Troubleshooting

### Build Fails

- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18.x by default, which should work)

### Firebase Errors

#### Error: `auth/invalid-api-key`

This error means your Firebase environment variables are not set correctly in Vercel. Follow these steps:

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables

2. **Verify all required variables are set:**
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

3. **Get the correct values from Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Click the gear icon ⚙️ → Project Settings
   - Scroll to "Your apps" section
   - Click on your web app (or create one if needed)
   - Copy the values from the `firebaseConfig` object

4. **Important checks:**
   - Make sure there are **no extra spaces** before/after the values
   - Make sure values are set for **Production** environment (or all environments)
   - Values should match exactly what's in your `.env.local` file

5. **After updating variables:**
   - Go to Deployments tab
   - Click the three dots (⋯) on the latest deployment
   - Click "Redeploy" to trigger a new build with the updated variables

#### Other Firebase Errors

- Verify all environment variables are set correctly
- Check Firebase Console for authorized domains
- Ensure Firestore security rules allow anonymous access

### App Works Locally But Not on Vercel

- Double-check environment variables are set in Vercel
- Clear Vercel build cache and redeploy
- Check browser console for errors

## Automatic Deployments

Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every push to other branches (creates unique preview URLs)

You can disable automatic deployments in project settings if needed.

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- Check deployment logs in Vercel dashboard for detailed error messages
