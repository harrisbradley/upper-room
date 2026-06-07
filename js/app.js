// js/app.js
// Page controllers — one init function per page, called from each HTML file.

// ─── Header auth widget ────────────────────────────────────────────────────
// Call initHeader() on every page to show user name + sign-out in the header.

function initHeader() {
    const userArea  = qs("#header-user");
    const nameEl    = qs("#header-user-name");
    const signoutBtn= qs("#header-signout");
    const signinBtn = qs("#header-signin");

    auth.onAuthStateChanged(user => {
        if (user && !user.isAnonymous) {
            if (nameEl)    nameEl.textContent = userDisplayName(user);
            if (userArea)  show(userArea);
            if (signinBtn) hide(signinBtn);
        } else {
            if (userArea)  hide(userArea);
            if (signinBtn) show(signinBtn);
        }
    });

    if (signoutBtn) {
        signoutBtn.addEventListener("click", async () => {
            await signOut();
            location.href = "index.html";
        });
    }
}

// ─── Shared helpers ────────────────────────────────────────────────────────

function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function show(el)   { if (el) el.classList.remove("hidden"); }
function hide(el)   { if (el) el.classList.add("hidden"); }
function setText(el, txt) { if (el) el.textContent = txt; }

function setError(el, msg) {
    if (!el) return;
    el.className = "msg msg-error";
    el.textContent = msg;
    show(el);
}

function setSuccess(el, msg) {
    if (!el) return;
    el.className = "msg msg-success";
    el.textContent = msg;
    show(el);
}

function formatDate(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getParam(name) {
    return new URLSearchParams(location.search).get(name) || "";
}

// Split a textarea value into a trimmed, non-empty array of lines
function parseLines(str) {
    return str.split("\n").map(s => s.trim()).filter(Boolean);
}

// ─── Home page ─────────────────────────────────────────────────────────────

async function initHome() {
    initHeader();

    const studyList    = qs("#study-list");
    const emptyState   = qs("#empty-state");
    const loadingEl    = qs("#loading");
    const contentEl    = qs("#content");
    const msgEl        = qs("#msg");
    const myStudiesSec = qs("#my-studies-section");
    const signedOutSec = qs("#signed-out-section");

    // Create form elements
    const createBtn   = qs("#create-btn");
    const createForm  = qs("#create-form");
    const studyNameEl = qs("#study-name");
    const cancelBtn   = qs("#cancel-create");
    const submitBtn   = qs("#submit-create");

    // Join form elements
    const joinForm  = qs("#join-form");
    const joinCode  = qs("#join-code");
    const joinMsgEl = qs("#join-msg");

    // Wait for Firebase auth to resolve
    const currentUser = await waitForAuth();
    const isLoggedIn  = currentUser && !currentUser.isAnonymous;

    // Load studies (only if logged in)
    async function loadStudies() {
        hide(emptyState);
        studyList.innerHTML = "";
        try {
            const studies = await getMyStudies(currentUser.uid);
            if (studies.length === 0) {
                show(emptyState);
            } else {
                studies.forEach(s => {
                    const a = document.createElement("a");
                    a.href = `study.html?id=${s.id}`;
                    a.className = "study-card";
                    a.innerHTML = `
                        <div>
                            <div class="study-card-name">${escapeHtml(s.name)}</div>
                            <div class="study-card-meta">Code: ${s.joinCode} &bull; Created ${formatDate(s.createdAt)}</div>
                        </div>
                        <span class="study-card-arrow">›</span>`;
                    studyList.appendChild(a);
                });
            }
        } catch (err) {
            console.error("Failed to load studies:", err);
        }
    }

    hide(loadingEl);
    show(contentEl);

    if (isLoggedIn) {
        show(myStudiesSec);
        hide(signedOutSec);
        await loadStudies();
    } else {
        hide(myStudiesSec);
        show(signedOutSec);
    }

    // Toggle create form
    createBtn.addEventListener("click", () => {
        hide(createBtn);
        show(createForm);
        studyNameEl.focus();
    });

    cancelBtn.addEventListener("click", () => {
        show(createBtn);
        hide(createForm);
        studyNameEl.value = "";
        hide(msgEl);
    });

    // Create study submission
    createForm.addEventListener("submit", async e => {
        e.preventDefault();
        const name = studyNameEl.value.trim();
        if (!name) { setError(msgEl, "Please enter a study name."); return; }
        if (name.length > 100) { setError(msgEl, "Study name cannot be longer than 100 characters."); return; }
        hide(msgEl);
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating…";
        try {
            const { studyId } = await createStudy(name);
            location.href = `study.html?id=${studyId}`;
        } catch (err) {
            setError(msgEl, err.message || "Something went wrong.");
            submitBtn.disabled = false;
            submitBtn.textContent = "Create Study";
        }
    });

    // Join form submission
    joinForm.addEventListener("submit", async e => {
        e.preventDefault();
        const code = joinCode.value.trim().toUpperCase();
        if (!code) { setError(joinMsgEl, "Please enter a join code."); return; }
        if (!/^[A-Z0-9]{6}$/.test(code)) { setError(joinMsgEl, "Join code must be exactly 6 alphanumeric characters."); return; }
        hide(joinMsgEl);
        location.href = `join.html?code=${code}`;
    });
}

// ─── Study dashboard ────────────────────────────────────────────────────────

async function initStudy() {
    initHeader();
    const studyId = getParam("id");
    if (!studyId) { location.href = "index.html"; return; }

    const titleEl       = qs("#study-title");
    const loadingEl     = qs("#loading");
    const contentEl     = qs("#content");
    const errorEl       = qs("#error");
    const joinCodeEl    = qs("#join-code-value");
    const copyBtn       = qs("#copy-code-btn");
    const sessionList   = qs("#session-list");
    const newSessionBtn = qs("#new-session-btn");
    const newSessionForm = qs("#new-session-form");
    const cancelNewBtn  = qs("#cancel-new-session");
    const submitNewBtn  = qs("#submit-new-session");
    const newPassageEl  = qs("#new-passage");
    const newQuestionsEl= qs("#new-questions");
    const newFormMsg    = qs("#new-session-msg");

    let currentUser = null;
    let isLeader    = false;

    try {
        currentUser = await ensureAnonymousAuth();
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Could not connect to Firebase.");
        return;
    }

    // Load study + role + sessions
    let study;
    try {
        study = await getStudy(studyId);
        if (!study) {
            hide(loadingEl);
            setError(errorEl, "Study not found.");
            return;
        }
        const role = await getMyRole(studyId, currentUser.uid);
        isLeader = role === "leader";
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Failed to load study.");
        console.error(err);
        return;
    }

    setText(titleEl, study.name);
    document.title = study.name + " — Upper Room";
    if (joinCodeEl) joinCodeEl.textContent = study.joinCode;

    // Build share link
    const shareLinkEl = document.getElementById("share-link");
    if (shareLinkEl) {
        const base = location.href.replace(/study\.html.*$/, "");
        shareLinkEl.textContent = base + "join.html?code=" + study.joinCode;
    }

    // Copy join code
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(study.joinCode).then(() => {
                copyBtn.textContent = "Copied!";
                setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
            });
        });
    }

    // Render sessions
    async function loadSessions() {
        sessionList.innerHTML = "";
        const sessions = await listSessions(studyId);
        if (sessions.length === 0) {
            sessionList.innerHTML = `<div class="empty-state"><p>No sessions yet. Create the first one below.</p></div>`;
        } else {
            sessions.forEach((s, i) => {
                const hasRecap    = !!s.recap;
                const passageRef  = (s.passage && s.passage.reference) ? s.passage.reference : s.title || "Session";
                const meta        = s.scheduledAt ? formatDate(s.scheduledAt) : "";

                const a = document.createElement("a");
                a.href = `session.html?studyId=${studyId}&sessionId=${s.id}`;
                a.className = "session-item";
                a.innerHTML = `
                    <div class="session-item-num">${i + 1}</div>
                    <div class="session-item-info">
                        <div class="session-item-title">${escapeHtml(passageRef)}</div>
                        ${meta ? `<div class="session-item-meta">${meta}</div>` : ""}
                    </div>
                    ${hasRecap ? `<span class="session-badge badge-recap">Recap posted</span>` : ""}`;
                sessionList.appendChild(a);
            });
        }
    }

    await loadSessions();

    // Show leader controls
    if (isLeader && newSessionBtn) {
        show(newSessionBtn);
        newSessionBtn.addEventListener("click", () => {
            hide(newSessionBtn);
            show(newSessionForm);
            newPassageEl.focus();
        });
    }

    if (cancelNewBtn) {
        cancelNewBtn.addEventListener("click", () => {
            show(newSessionBtn);
            hide(newSessionForm);
            newPassageEl.value = "";
            newQuestionsEl.value = "";
            hide(newFormMsg);
        });
    }

    if (newSessionForm) {
        newSessionForm.addEventListener("submit", async e => {
            e.preventDefault();
            const passage   = newPassageEl.value.trim();
            const questions = parseLines(newQuestionsEl.value);
            if (!passage) { setError(newFormMsg, "Please enter a scripture passage."); return; }
            if (passage.length > 100) { setError(newFormMsg, "Passage reference cannot be longer than 100 characters."); return; }
            if (questions.length === 0) { setError(newFormMsg, "Please enter at least one discussion question."); return; }
            hide(newFormMsg);
            submitNewBtn.disabled = true;
            submitNewBtn.textContent = "Creating…";
            try {
                await createSession(studyId, passage, questions);
                newPassageEl.value = "";
                newQuestionsEl.value = "";
                show(newSessionBtn);
                hide(newSessionForm);
                await loadSessions();
            } catch (err) {
                setError(newFormMsg, err.message || "Failed to create session.");
            } finally {
                submitNewBtn.disabled = false;
                submitNewBtn.textContent = "Add Session";
            }
        });
    }

    // Show main content
    hide(loadingEl);
    show(contentEl);
}

// ─── Session page ───────────────────────────────────────────────────────────

async function initSession() {
    initHeader();
    const studyId   = getParam("studyId");
    const sessionId = getParam("sessionId");
    if (!studyId || !sessionId) { location.href = "index.html"; return; }

    const loadingEl     = qs("#loading");
    const contentEl     = qs("#content");
    const errorEl       = qs("#error");
    const studyLinkEl   = qs("#study-link");
    const passageEl     = qs("#passage-ref");
    const questionsEl   = qs("#questions-list");
    const leaderNotesSec= qs("#leader-notes-section");
    const leaderNotesEl = qs("#leader-notes");

    // Edit section
    const editSection   = qs("#edit-section");
    const editBtn       = qs("#edit-btn");
    const editForm      = qs("#edit-form");
    const editPassage   = qs("#edit-passage");
    const editQuestions = qs("#edit-questions");
    const editNotes     = qs("#edit-leader-notes");
    const cancelEditBtn = qs("#cancel-edit");
    const saveEditBtn   = qs("#save-edit");
    const editMsg       = qs("#edit-msg");

    // Recap section
    const recapViewSec  = qs("#recap-view");
    const recapFormSec  = qs("#recap-form-section");
    const postRecapBtn  = qs("#post-recap-btn");
    const recapForm     = qs("#recap-form");
    const cancelRecap   = qs("#cancel-recap");
    const saveRecapBtn  = qs("#save-recap");
    const recapMsg      = qs("#recap-msg");
    const recapSummaryEl= qs("#recap-summary-input");
    const recapTakeaways= qs("#recap-takeaways");
    const recapPrayers  = qs("#recap-prayers");

    let currentUser = null;
    let isLeader    = false;
    let session     = null;

    try {
        currentUser = await ensureAnonymousAuth();
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Could not connect to Firebase.");
        return;
    }

    // Set study link
    if (studyLinkEl) studyLinkEl.href = `study.html?id=${studyId}`;

    // Load session + role
    try {
        [session] = await Promise.all([
            getSession(studyId, sessionId),
        ]);
        if (!session) {
            hide(loadingEl);
            setError(errorEl, "Session not found.");
            return;
        }
        const role = await getMyRole(studyId, currentUser.uid);
        isLeader = role === "leader";
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Failed to load session.");
        console.error(err);
        return;
    }

    function renderSession() {
        const passageRef = (session.passage && session.passage.reference) ? session.passage.reference : "";
        const questions  = (session.agenda  && session.agenda.questions)  ? session.agenda.questions  : [];
        const notes      = (session.agenda  && session.agenda.leaderNotes)? session.agenda.leaderNotes: "";

        document.title = (passageRef || "Session") + " — Upper Room";

        if (passageEl) {
            if (passageRef) {
                passageEl.textContent = passageRef;
                passageEl.parentElement && show(passageEl.parentElement);
            } else {
                passageEl.parentElement && hide(passageEl.parentElement);
            }
        }

        if (questionsEl) {
            if (questions.length) {
                questionsEl.innerHTML = questions.map(q =>
                    `<li>${escapeHtml(q)}</li>`
                ).join("");
            } else {
                questionsEl.innerHTML = `<li class="text-muted">No questions added yet.</li>`;
            }
        }

        if (isLeader && notes && leaderNotesSec) {
            if (leaderNotesEl) leaderNotesEl.textContent = notes;
            show(leaderNotesSec);
        }

        // Populate edit form
        if (editPassage)   editPassage.value   = passageRef;
        if (editQuestions) editQuestions.value = questions.join("\n");
        if (editNotes)     editNotes.value     = notes;

        // Render recap
        renderRecap();
    }

    function renderRecap() {
        if (!session.recap) {
            hide(recapViewSec);
            if (isLeader && recapFormSec) show(recapFormSec);
            return;
        }
        // Has recap — show view
        hide(recapFormSec);
        if (!recapViewSec) return;
        show(recapViewSec);
        const r = session.recap;
        const recapSummary   = qs("#recap-summary-text");
        const recapTkEl      = qs("#recap-takeaways-list");
        const recapPrayersEl = qs("#recap-prayers-list");
        const recapDateEl    = qs("#recap-date");
        if (recapSummary)   recapSummary.textContent   = r.summary || "";
        if (recapDateEl)    recapDateEl.textContent    = r.postedAt ? formatDate(r.postedAt) : "";
        if (recapTkEl) {
            recapTkEl.innerHTML = (r.keyTakeaways || []).map(t => `<li>${escapeHtml(t)}</li>`).join("") || "<li>—</li>";
        }
        if (recapPrayersEl) {
            recapPrayersEl.innerHTML = (r.prayerIntentions || []).map(p => `<li>${escapeHtml(p)}</li>`).join("") || "<li>—</li>";
        }
    }

    renderSession();

    // Edit controls (leader only)
    if (isLeader && editSection) {
        show(editSection);

        editBtn.addEventListener("click", () => {
            hide(editBtn);
            show(editForm);
            editPassage.focus();
        });

        cancelEditBtn.addEventListener("click", () => {
            show(editBtn);
            hide(editForm);
            hide(editMsg);
        });

        editForm.addEventListener("submit", async e => {
            e.preventDefault();
            const passage   = editPassage.value.trim();
            const questions = parseLines(editQuestions.value);
            const notes     = editNotes ? editNotes.value.trim() : "";
            if (!passage) { setError(editMsg, "Please enter a scripture passage."); return; }
            if (passage.length > 100) { setError(editMsg, "Passage reference cannot be longer than 100 characters."); return; }
            if (questions.length === 0) { setError(editMsg, "Please enter at least one discussion question."); return; }
            hide(editMsg);
            saveEditBtn.disabled = true;
            saveEditBtn.textContent = "Saving…";
            try {
                await updateSession(studyId, sessionId, { passageRef: passage, questions, leaderNotes: notes });
                session = await getSession(studyId, sessionId);
                renderSession();
                show(editBtn);
                hide(editForm);
            } catch (err) {
                setError(editMsg, err.message || "Failed to save changes.");
            } finally {
                saveEditBtn.disabled = false;
                saveEditBtn.textContent = "Save Changes";
            }
        });
    }

    // Recap form (leader only, no recap yet)
    if (isLeader && postRecapBtn) {
        postRecapBtn.addEventListener("click", () => {
            hide(postRecapBtn);
            show(recapForm);
            if (recapSummaryEl) recapSummaryEl.focus();
        });
    }

    if (cancelRecap) {
        cancelRecap.addEventListener("click", () => {
            show(postRecapBtn);
            hide(recapForm);
            hide(recapMsg);
        });
    }

    if (recapForm) {
        recapForm.addEventListener("submit", async e => {
            e.preventDefault();
            const summary         = (recapSummaryEl  && recapSummaryEl.value.trim())  || "";
            const keyTakeaways    = parseLines(recapTakeaways  ? recapTakeaways.value  : "");
            const prayerIntentions= parseLines(recapPrayers    ? recapPrayers.value    : "");
            if (!summary) { setError(recapMsg, "Please enter a summary."); return; }
            if (summary.length > 500) { setError(recapMsg, "Summary cannot be longer than 500 characters."); return; }
            hide(recapMsg);
            saveRecapBtn.disabled = true;
            saveRecapBtn.textContent = "Posting…";
            try {
                await postRecap(studyId, sessionId, currentUser.uid, { summary, keyTakeaways, prayerIntentions });
                session = await getSession(studyId, sessionId);
                renderSession();
            } catch (err) {
                setError(recapMsg, err.message || "Failed to post recap.");
                saveRecapBtn.disabled = false;
                saveRecapBtn.textContent = "Post Recap";
            }
        });
    }

    hide(loadingEl);
    show(contentEl);
}

// ─── Join page ──────────────────────────────────────────────────────────────

async function initJoin() {
    initHeader();
    const codeParam   = getParam("code");
    const loadingEl   = qs("#loading");
    const contentEl   = qs("#content");
    const errorEl     = qs("#error");

    // Code entry form (shown when no ?code param)
    const codeFormSec = qs("#code-form-section");
    const codeFormEl  = qs("#code-form");
    const codeInput   = qs("#code-input");
    const codeMsg     = qs("#code-msg");

    // Study preview
    const studyPreview = qs("#study-preview");
    const studyNameEl  = qs("#preview-study-name");
    const joinBtn      = qs("#join-btn");
    const joinMsg      = qs("#join-msg");

    let resolvedStudyId = null;

    if (!codeParam) {
        // Show code entry form
        hide(loadingEl);
        show(codeFormSec);

        codeFormEl.addEventListener("submit", async e => {
            e.preventDefault();
            const code = codeInput.value.trim().toUpperCase();
            if (!code) { setError(codeMsg, "Please enter a join code."); return; }
            if (!/^[A-Z0-9]{6}$/.test(code)) { setError(codeMsg, "Join code must be exactly 6 alphanumeric characters."); return; }
            hide(codeMsg);
            location.href = `join.html?code=${code}`;
        });
        return;
    }

    // Validate join code parameter format before Firestore query
    if (codeParam && !/^[A-Z0-9]{6}$/.test(codeParam.trim().toUpperCase())) {
        hide(loadingEl);
        setError(errorEl, `"${codeParam}" is not a valid join code. It must be exactly 6 alphanumeric characters.`);
        return;
    }

    // Resolve the code
    try {
        resolvedStudyId = await resolveJoinCode(codeParam);
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Error looking up join code.");
        return;
    }

    if (!resolvedStudyId) {
        hide(loadingEl);
        setError(errorEl, `"${codeParam}" is not a valid join code. Double-check with your study leader.`);
        return;
    }

    // Load study info
    let study;
    try {
        study = await getStudy(resolvedStudyId);
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Could not load study details.");
        return;
    }

    if (!study) {
        hide(loadingEl);
        setError(errorEl, "Study not found.");
        return;
    }

    // Show preview
    if (studyNameEl) studyNameEl.textContent = study.name;
    hide(loadingEl);
    show(studyPreview);

    // Join button
    if (joinBtn) {
        joinBtn.addEventListener("click", async () => {
            joinBtn.disabled = true;
            joinBtn.textContent = "Joining…";
            try {
                await joinStudy(resolvedStudyId);
                location.href = `study.html?id=${resolvedStudyId}`;
            } catch (err) {
                setError(joinMsg, err.message || "Failed to join study.");
                joinBtn.disabled = false;
                joinBtn.textContent = "Join This Study";
            }
        });
    }
}

// ─── Login page ──────────────────────────────────────────────────────────────

async function initLogin() {
    // Redirect already-logged-in users
    const existing = await waitForAuth();
    if (existing && !existing.isAnonymous) {
        location.href = "index.html";
        return;
    }

    const emailInput  = qs("#login-email");
    const passInput   = qs("#login-password");
    const loginForm   = qs("#login-form");
    const loginMsg    = qs("#login-msg");
    const submitBtn   = qs("#login-submit");
    const googleBtn   = qs("#google-signin");

    if (loginForm) {
        loginForm.addEventListener("submit", async e => {
            e.preventDefault();
            const email    = emailInput.value.trim();
            const password = passInput.value;
            if (!email || !password) { setError(loginMsg, "Please enter your email and password."); return; }
            hide(loginMsg);
            submitBtn.disabled = true;
            submitBtn.textContent = "Signing in…";
            try {
                await signInWithEmail(email, password);
                location.href = getParam("next") || "index.html";
            } catch (err) {
                setError(loginMsg, friendlyAuthError(err));
                submitBtn.disabled = false;
                submitBtn.textContent = "Sign In";
            }
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            hide(loginMsg);
            googleBtn.disabled = true;
            try {
                await signInWithGoogle();
                location.href = getParam("next") || "index.html";
            } catch (err) {
                if (err.code !== "auth/popup-closed-by-user") {
                    setError(loginMsg, friendlyAuthError(err));
                }
                googleBtn.disabled = false;
            }
        });
    }
}

// ─── Signup page ─────────────────────────────────────────────────────────────

async function initSignup() {
    // Redirect already-logged-in users
    const existing = await waitForAuth();
    if (existing && !existing.isAnonymous) {
        location.href = "index.html";
        return;
    }

    const nameInput   = qs("#signup-name");
    const emailInput  = qs("#signup-email");
    const passInput   = qs("#signup-password");
    const signupForm  = qs("#signup-form");
    const signupMsg   = qs("#signup-msg");
    const submitBtn   = qs("#signup-submit");
    const googleBtn   = qs("#google-signup");

    if (signupForm) {
        signupForm.addEventListener("submit", async e => {
            e.preventDefault();
            const name     = nameInput.value.trim();
            const email    = emailInput.value.trim();
            const password = passInput.value;
            if (!name)     { setError(signupMsg, "Please enter your name.");     return; }
            if (!email)    { setError(signupMsg, "Please enter your email.");    return; }
            if (password.length < 6) { setError(signupMsg, "Password must be at least 6 characters."); return; }
            hide(signupMsg);
            submitBtn.disabled = true;
            submitBtn.textContent = "Creating account…";
            try {
                await signUpWithEmail(name, email, password);
                location.href = "index.html";
            } catch (err) {
                setError(signupMsg, friendlyAuthError(err));
                submitBtn.disabled = false;
                submitBtn.textContent = "Create Account";
            }
        });
    }

    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            hide(signupMsg);
            googleBtn.disabled = true;
            try {
                await signInWithGoogle();
                location.href = "index.html";
            } catch (err) {
                if (err.code !== "auth/popup-closed-by-user") {
                    setError(signupMsg, friendlyAuthError(err));
                }
                googleBtn.disabled = false;
            }
        });
    }
}

// ─── Auth error messages ─────────────────────────────────────────────────────

function friendlyAuthError(err) {
    switch (err.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Incorrect email or password.";
        case "auth/email-already-in-use":
            return "An account with that email already exists.";
        case "auth/weak-password":
            return "Password must be at least 6 characters.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a moment and try again.";
        default:
            return err.message || "Something went wrong.";
    }
}

// ─── XSS helper ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
