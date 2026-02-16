# Upper Room — Test Plans

## Full test plan (QA / pre-merge)

**Prerequisites:** Firebase configured, `npm run dev` running.

| # | Flow | Steps | Pass criteria |
|---|------|-------|---------------|
| 1 | Create study | Home → Create a study → Enter name → Create | Redirects to `/created/[id]`, study name shown, share link visible |
| 2 | Copy share link | On created page → Copy | Clipboard contains `/join/[CODE]`, "Copied!" flashes |
| 3 | Join via code (home) | Home → Enter join code → Join | Redirects to join page, study name and next session shown |
| 4 | Join study | On join page → Join study | "You've joined this study!" → Go to study works |
| 5 | Invalid join code | Home → Enter bogus code (e.g. `ZZZ999`) → Join | "Invalid or expired" message, Back home works |
| 6 | Study dashboard (leader) | Go to `/s/[studyId]` as creator | See study name, Next session, New session, Edit, Recap links |
| 7 | New session | As leader → New session → Fill passage, questions, date → Create | Redirects to study, new session in list |
| 8 | Edit session | As leader → Edit session → Change fields → Save | Changes persist, success feedback |
| 9 | Post recap | As leader → Post recap → Add summary → Save | Recap appears on session card |
| 10 | View recap (participant) | As participant → Recap link on session | Recap view loads, summary visible |
| 11 | Participant view session | As participant → View session | Read-only view, no Edit/Save |
| 12 | Direct URLs | Open `/created/[id]`, `/join/[code]`, `/s/[id]` directly | Pages load, no crashes |

---

## Quick tour (5–10 min)

Use this to walk through the main flows and spot obvious bugs.

1. **Create** — Home → Create a study → Enter a name → Create. Confirm share link appears.
2. **Copy** — Click Copy. Confirm link copies.
3. **Join** — Open a new incognito/private window (or another browser) → Paste link or enter join code on home → Join study.
4. **Study** — As leader: click New session, add a passage and questions, create. As participant: open study and view session.
5. **Recap** — As leader: Post recap on a session. As participant: open Recap link.
6. **Invalid code** — Home → Enter `XXX111` → Join. Should show “invalid or expired.”

**Bug hunting:** Watch for blank screens, console errors, missing buttons, copy failures, or wrong data. Note anything odd.
