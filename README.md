# ⛪ Upper Room

### *Static-Web Bible Study Organizer and Attendee Portal*

**Upper Room** is a lightweight, static web application designed to help Bible study leaders organize their studies, schedule study sessions, post session recaps, and manage rosters. It offers a premium, passwordless attendee portal where members can join via a simple access code and keep track of session materials.

---

## ✝️ Key Features

### 🏰 Study Leader Controls
- **Study Dashboard**: Create and name new Bible studies. Each study automatically generates a unique 6-character registration join code.
- **Roster & Attendance Management**: View all attendees who have registered. Promote attendees to **Co-leaders** so they can help manage sessions, or demote them back to members.
- **Session Planner**: Create individual study sessions (e.g. passage references, custom discussion questions, and private leader notes).
- **Session Completion**: Mark study sessions as completed, rendering a styled completion status on the dashboard.
- **Interactive Recaps**: Post a summary, key takeaways, and prayer requests for any completed session.

### 📖 Attendee Portal (Access Code)
- **Zero-Login Experience**: Attendees do not need to register accounts. They simply enter the study's 6-character join code and input a display name.
- **Study Feed**: View upcoming scriptures, discussion questions, completed session history, and leader recaps.
- **Roster Visibility**: See other members of the study.

---

## 🎨 Serene Premium Design
- **Serene Palette**: Tailored HSL colors with soft alpine green, deep teal highlights, and a clean, spacious typography system.
- **Responsive Layout**: Works seamlessly on mobile devices for quick reference during a study session, as well as desktop displays.
- **Zero Placeholders**: Clean icons and visual cues guide the user journey.

---

## 🛠️ Technology Stack
- **Frontend**: Plain HTML5, Vanilla CSS3 (custom styling system), and ES Modules (JavaScript ES6+).
- **Backend/Database**: Firebase v10.12.0 Modular SDK (Firestore for real-time document storage + Firebase Anonymous & Email Authentication).
- **No Bundler**: Built fully serverless and dependency-free. Imports are resolved directly via public CDNs.

---

## 📂 Codebase Structure
- `index.html` — Landing page with CTE to create a study or join with a code.
- `study.html` — Main dashboard for a study (sessions list, leader actions, and roster).
- `session.html` — Session details page (scripture passage, questions, leader notes, and recap form).
- `profile.html` — Profile page to update display name and security settings.
- `join.html` — Join landing page where users register via a code.
- `login.html` / `signup.html` — Authentication pages for leaders.
- `js/firebase-config.js` — Firebase client initialization.
- `js/auth.js` — Authentication helper operations.
- `js/studies.js` — Firestore operations for creating/managing studies and members.
- `js/sessions.js` — Firestore operations for sessions and recaps.
- `js/app.js` — Core page router and UI controller binding script.

---

## 🚀 Running Locally

### 1. Configure Firebase
Create a Firebase web project and enable:
1. **Firestore Database**
2. **Anonymous Sign-in** (under Auth providers)
3. **Email/Password Sign-in**

Add your Firebase configuration settings to [js/firebase-config.js](file:///C:/Users/hopei/Documents/GitHub/upper-room/js/firebase-config.js).

### 2. Launch Local Server
Serve the repository root directory using any local web server. For example, using Python or node's `serve`:
```bash
# Using Python
python3 -m http.server 4005

# Or using Node
npx serve -p 4005 .
```
Open [http://localhost:4005](http://localhost:4005) in your web browser.

