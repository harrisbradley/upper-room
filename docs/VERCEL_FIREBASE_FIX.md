# Quick Fix: Firebase `auth/invalid-api-key` Error on Vercel

If you're seeing `Firebase: Error (auth/invalid-api-key)` on your Vercel deployment, your environment variables aren't set correctly.

## Step-by-Step Fix

### 1. Get Your Firebase Config Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon ⚙️** → **Project Settings**
4. Scroll down to **"Your apps"** section
5. Click on your **web app** (the one with `</>` icon)
6. You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX" // optional
};
```

### 2. Add Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: **upper-room-app**
3. Go to **Settings** → **Environment Variables**
4. Add each variable one by one:

   | Variable Name | Value (from Firebase config) |
   |--------------|------------------------------|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | Copy `apiKey` value |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Copy `authDomain` value |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Copy `projectId` value |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Copy `storageBucket` value |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Copy `messagingSenderId` value |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | Copy `appId` value |
   | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Copy `measurementId` value (optional) |

5. For each variable:
   - Select **Production** (and optionally Preview/Development)
   - Click **Save**
   - Click **Add** to add the next one

### 3. Redeploy Your App

1. Go to **Deployments** tab
2. Find your latest deployment
3. Click the **three dots (⋯)** menu
4. Click **Redeploy**
5. Wait for the deployment to complete (1-2 minutes)

### 4. Verify It Works

1. Visit your app: https://upper-room-app.vercel.app/
2. Try creating a study
3. The error should be gone!

## Common Mistakes to Avoid

❌ **Don't** include quotes around the values in Vercel  
✅ **Do** paste the raw values (e.g., `AIzaSy...` not `"AIzaSy..."`)

❌ **Don't** add extra spaces before/after values  
✅ **Do** copy-paste directly from Firebase Console

❌ **Don't** forget to set variables for Production environment  
✅ **Do** make sure Production is selected when adding variables

❌ **Don't** forget to redeploy after adding variables  
✅ **Do** redeploy so the new variables take effect

## Still Not Working?

1. **Check browser console** (F12) for more detailed error messages
2. **Verify in Vercel** that all 6 required variables are set (check the list)
3. **Compare values** with your local `.env.local` file - they should match
4. **Check Firebase Console** → Authentication → Settings → Authorized domains
   - Make sure `upper-room-app.vercel.app` is listed
   - If not, click "Add domain" and add it

## Need More Help?

See the full deployment guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
