# Firebase Console Setup — Step-by-Step

This guide walks you through everything you need to do in the Firebase Console so the Upper Room app can create studies, join codes, and sessions.

---

## 1. Open Firebase and sign in

1. Go to **https://console.firebase.google.com**
2. Sign in with your Google account.
3. You’ll see the Firebase Console home (list of your projects or “Create a project”).

---

## 2. Create a new project (or use an existing one)

### If you don’t have a project yet

1. Click **“Create a project”** (or “Add project”).
2. **Project name:** e.g. `upper-room` or `my-bible-studies`. Click **Continue**.
3. **Google Analytics:** You can turn **Off** for this MVP, or leave **On** if you want basic analytics. Click **Continue** (and **Create project** if you see it).
4. Wait for the project to be created, then click **Continue** to open the project.

### If you already have a project

1. On the Firebase home page, click your project name to open it.

---

## 3. Register your app as a “Web” app

You need to add a “Web” app so Firebase gives you the config that goes in `.env.local`.

1. On the project overview page, find the **“Get started by adding Firebase to your app”** section (or the **</>** icon under “Get started”).
2. Click the **</>** (Web) icon.
3. **App nickname:** e.g. `Upper Room Web`. Leave “Firebase Hosting” unchecked for now. Click **Register app**.
4. On the next screen you’ll see a code block with something like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
5. You don’t need to copy that code into your app (we use env vars). Click **Continue**, then **Continue to console**.

**You’ll use these values in step 7** when filling `.env.local`. Keep the project open.

---

## 4. Enable Anonymous Authentication

The app uses anonymous sign-in so users can create and join studies without creating an account.

1. In the left sidebar, click **Build** → **Authentication** (or the “Authentication” card on the overview).
2. Click **Get started** if you see it.
3. Open the **Sign-in method** tab.
4. In the list of providers, find **Anonymous**.
5. Click **Anonymous** to expand it.
6. Turn the **Enable** switch **On**.
7. Click **Save**.

You should see “Anonymous” listed as enabled in the Sign-in method list.

---

## 5. Create a Firestore database

Firestore is where studies, join codes, members, and sessions are stored.

1. In the left sidebar, click **Build** → **Firestore Database** (or the “Firestore” card).
2. Click **Create database**.
3. **Security rules:**
   - Choose **Start in production mode** (we’ll add rules in the next step). Click **Next**.
4. **Location:**
   - Pick a region close to you (e.g. `us-central1`, `europe-west1`). You can’t change it later. Click **Enable**.
5. Wait until the database is created. You’ll see an empty “Data” tab and a “Rules” tab.

---

## 6. Set Firestore security rules

Rules control who can read and write which documents. These rules allow:

- Anyone to read a study if they know its ID or the join code.
- Only signed-in users to create studies and join; only the study creator (leader) could be extended later.

1. In Firestore, open the **Rules** tab.
2. Replace the entire rules content with the following (then we’ll explain it):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Studies: anyone can read (for join flow); only authenticated users can create
    match /studies/{studyId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.createdBy;
    }

    // Join codes: anyone can read (to resolve code -> studyId); only auth can create
    match /joinCodes/{code} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }

    // Members: only members of the study can read; auth users can add themselves (join)
    match /studies/{studyId}/members/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if request.auth != null && (request.auth.uid == userId || resource.data.role == 'leader');
    }

    // Sessions: anyone can read (for join page); only study creator can write
    match /studies/{studyId}/sessions/{sessionId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null && get(/databases/$(database)/documents/studies/$(studyId)).data.createdBy == request.auth.uid;
    }
  }
}
```

3. Click **Publish**. If you see a warning about “get()”, that’s expected; the rule uses `get()` to check the study’s `createdBy`.

**What this does in short:**

- **studies** – Read by anyone (so join page can load study by code). Only logged-in users can create; only the creator can update/delete.
- **joinCodes** – Read by anyone (to resolve code → studyId). Only logged-in users can create; no one can update/delete (codes stay stable).
- **studies/…/members** – Only signed-in users can read; a user can only create their own membership (join); members can update/delete only their own doc (or a leader can manage).
- **studies/…/sessions** – Read by anyone; only the study creator can add/edit/delete sessions.

---

## 7. Put your config in `.env.local`

Your app reads Firebase config from environment variables so you don’t commit secrets.

1. In your project folder, copy the example env file:
   - **Windows (PowerShell):** `Copy-Item .env.local.example .env.local`
   - **Mac/Linux:** `cp .env.local.example .env.local`
2. Open **`.env.local`** in your editor.
3. In Firebase Console, get your web config again:
   - Click the **gear icon** next to “Project overview” in the left sidebar → **Project settings**.
   - Scroll to **“Your apps”** and click your Web app (e.g. “Upper Room Web”).
   - You’ll see `apiKey`, `authDomain`, `projectId`, etc.
4. Fill `.env.local` with those values (no quotes, no spaces around `=`):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_number
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

5. Save the file. **Do not commit `.env.local`** (it’s in `.gitignore`).

---

## 8. (Optional) Create the Firestore index for “next session”

When someone opens a study that has sessions, the app queries sessions by `order`. Firestore may ask for a composite index the first time you run that query.

1. Run the app (`npm run dev`) and open a study that has at least one session (e.g. after creating one from `/create`).
2. If you see an error in the browser console or in the Firebase Console that includes a **link** to create an index, click that link. It will open the Firebase Console with the index pre-filled.
3. Click **Create index** and wait until it’s built (usually 1–2 minutes).

If you prefer to create the index before testing:

1. In Firebase Console go to **Firestore** → **Indexes** tab.
2. Click **Create index**.
3. **Collection ID:** `sessions` (this is a subcollection, so you’ll choose the parent path).
   - For subcollections: Collection group is often “sessions”, or you select collection `studies` → subcollection `sessions`.
4. Add a field: **Field path** `order`, **Order** Ascending.
5. **Query scope:** Collection (or Collection group if you use that).
6. Click **Create**.

*(If the exact UI doesn’t match, use the link from the error message when you first load a study with sessions—that’s the most reliable.)*

---

## Quick checklist

- [ ] Firebase project created (or selected).
- [ ] Web app registered; config copied for `.env.local`.
- [ ] **Authentication** → Sign-in method → **Anonymous** enabled.
- [ ] **Firestore** database created (production mode, then rules updated).
- [ ] **Firestore** → Rules tab: rules pasted and **Publish**ed.
- [ ] **`.env.local`** filled with `NEXT_PUBLIC_FIREBASE_*` values.
- [ ] (Optional) Index created when Firestore prompts you (or via Indexes tab).

After this, run `npm run dev`, open the app, and use **Create a study** from the home page. If something fails, check the browser console and the **Authentication** and **Firestore** sections in Firebase Console for errors or permission messages.
