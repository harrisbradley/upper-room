# Upper Room — Bible Study Organizer (MVP)

Next.js (App Router) MVP for creating and joining Bible studies with shareable links.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Firebase**  
   Follow the step-by-step guide: **[docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)**. It covers creating a project, registering the web app, enabling Anonymous sign-in, creating Firestore, security rules, and filling `.env.local`.

3. **Environment**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Firebase web app config in `.env.local`.

4. **Firestore index (optional)**  
   When you first load a study with sessions, Firestore may prompt you to create a composite index for `studies/{id}/sessions` with `order` (Ascending). Use the link in the error to create it.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

To deploy to Vercel, follow the step-by-step guide: **[docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)**.

## Routes

- **/** — Landing; CTA to create a study.
- **/create** — Quick create form (anonymous sign-in, creates study + leader + join code + first session).
- **/created/[studyId]** — Created study; share link `/join/[code]` and copy button.
- **/join/[code]** — Resolve code → study; show study and next session; “Join study” button.

## Structure

- `src/lib/firebase/` — Firebase app, auth (`ensureAnonymousAuth`, provider placeholders).
- `src/lib/services/studies.ts` — `createStudy()`, `getStudy()`, `getNextSession()`.
- `src/lib/services/join.ts` — `resolveJoinCode()`, `getStudyByJoinCode()`, `joinStudy()`.
- `src/components/ui/` — Button, Input, Card.
