// js/app.js
// Page controllers — one init function per page, called from each HTML file.

// ─── Header auth widget ────────────────────────────────────────────────────
// Call initHeader() on every page to show user name + sign-out in the header.

function initHeader() {
    const userArea  = qs("#header-user");
    const nameEl    = qs("#header-user-name");
    const signoutBtn= qs("#header-signout");
    const signinBtn = qs("#header-signin");

    auth.onAuthStateChanged(async user => {
        if (user && !user.isAnonymous) {
            if (nameEl) {
                let displayName = userDisplayName(user);
                let avatarUrl = "";
                try {
                    const profile = await getUserProfile(user.uid);
                    if (profile) {
                        if (profile.displayName) displayName = profile.displayName;
                        avatarUrl = profile.avatarUrl || "";
                    }
                } catch (e) {
                    console.error("Failed to load profile for header", e);
                }
                nameEl.innerHTML = `
                    <div style="display:inline-flex;align-items:center;gap:6px;vertical-align:middle;">
                        ${getAvatarHtml(avatarUrl, displayName, 22)}
                        <span>${escapeHtml(displayName)}</span>
                    </div>
                `;
                nameEl.style.cursor = "pointer";
                nameEl.title = "View Profile";
                nameEl.onclick = (e) => {
                    e.preventDefault();
                    location.href = "profile.html";
                };
            }
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

function getAvatarHtml(avatarUrl, displayName, size = 80) {
    if (avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:"))) {
        return `<img src="${escapeHtml(avatarUrl)}" alt="Avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
    }
    const initial = displayName ? displayName.charAt(0).toUpperCase() : "?";
    
    // If avatarUrl is a hex color preset, use it directly. Otherwise, fall back to a stable hash color.
    let color = avatarUrl;
    if (!color || !color.startsWith("#")) {
        const colors = ["#1e3a5f", "#c8922a", "#16a34a", "#7c3aed", "#dc2626", "#0d9488"];
        const charCode = initial.charCodeAt(0) || 0;
        color = colors[charCode % colors.length];
    }
    
    return `
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;
                    display:flex;align-items:center;justify-content:center;font-size:${size * 0.45}px;font-weight:700;line-height:1;text-transform:uppercase;">
            ${initial}
        </div>
    `;
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

    // Leader Dashboard Logic
    if (isLeader) {
        const dashboardEl     = qs("#leader-dashboard");
        const tabRosterBtn    = qs("#tab-roster-btn");
        const tabSettingsBtn  = qs("#tab-settings-btn");
        const rosterSec       = qs("#dashboard-roster-sec");
        const settingsSec     = qs("#dashboard-settings-sec");
        const rosterList      = qs("#roster-list");
        const editStudyForm   = qs("#edit-study-form");
        const editStudyNameInput = qs("#edit-study-name");
        const editStudyMsg    = qs("#edit-study-msg");
        const saveStudyBtn    = qs("#save-study-btn");
        
        const archiveBtn      = qs("#archive-study-btn");
        const deleteBtn       = qs("#delete-study-btn");
        const dangerMsg       = qs("#danger-msg");

        show(dashboardEl);
        if (editStudyNameInput) editStudyNameInput.value = study.name;

        // Toggle Roster Tab
        tabRosterBtn.addEventListener("click", () => {
            tabRosterBtn.classList.add("active");
            tabSettingsBtn.classList.remove("active");
            show(rosterSec);
            hide(settingsSec);
        });

        // Toggle Settings Tab
        tabSettingsBtn.addEventListener("click", () => {
            tabSettingsBtn.classList.add("active");
            tabRosterBtn.classList.remove("active");
            show(settingsSec);
            hide(rosterSec);
        });

        // Load Roster
        async function loadRoster() {
            rosterList.innerHTML = `<div class="loading-block" style="padding:10px;"><div class="spinner"></div></div>`;
            try {
                const members = await getStudyMembers(studyId);
                rosterList.innerHTML = "";
                if (members.length === 0) {
                    rosterList.innerHTML = `<div class="text-muted" style="font-size:.9rem;padding:8px 0;">No members have joined yet.</div>`;
                } else {
                    members.forEach(m => {
                        const li = document.createElement("div");
                        li.className = "roster-list-item";
                        const joinedStr = m.joinedAt ? formatDate(m.joinedAt) : "Unknown Date";
                        const nameEscaped = escapeHtml(m.displayName || "Anonymous Member");
                        const roleLabel = m.role === "leader" ? `<span class="roster-role-badge leader">Leader</span>` : `<span class="roster-role-badge">Member</span>`;
                        li.innerHTML = `
                            <div>
                                <strong style="color:var(--primary);">${nameEscaped}</strong>
                                <div class="text-muted" style="font-size:.75rem;margin-top:2px;">Joined ${joinedStr}</div>
                            </div>
                            ${roleLabel}
                        `;
                        rosterList.appendChild(li);
                    });
                }
            } catch (err) {
                rosterList.innerHTML = `<div class="msg msg-error">Failed to load roster.</div>`;
                console.error(err);
            }
        }

        await loadRoster();

        // Edit Study Name Submission
        editStudyForm.addEventListener("submit", async e => {
            e.preventDefault();
            const newName = editStudyNameInput.value.trim();
            if (!newName) { setError(editStudyMsg, "Please enter a study name."); return; }
            if (newName.length > 100) { setError(editStudyMsg, "Study name cannot be longer than 100 characters."); return; }
            hide(editStudyMsg);
            saveStudyBtn.disabled = true;
            saveStudyBtn.textContent = "Saving…";
            try {
                await updateStudyName(studyId, newName);
                setSuccess(editStudyMsg, "Study name updated successfully!");
                setText(titleEl, newName);
                document.title = newName + " — Upper Room";
                study.name = newName;
            } catch (err) {
                setError(editStudyMsg, err.message || "Failed to update study name.");
            } finally {
                saveStudyBtn.disabled = false;
                saveStudyBtn.textContent = "Save Changes";
            }
        });

        // Archive Study
        archiveBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to archive this study? It will be hidden from your main list.")) return;
            archiveBtn.disabled = true;
            archiveBtn.textContent = "Archiving…";
            hide(dangerMsg);
            try {
                await archiveStudy(studyId);
                location.href = "index.html";
            } catch (err) {
                setError(dangerMsg, err.message || "Failed to archive study.");
                archiveBtn.disabled = false;
                archiveBtn.textContent = "Archive Study";
            }
        });

        // Delete Study
        deleteBtn.addEventListener("click", async () => {
            const doubleCheck = confirm("WARNING: Deleting this study will permanently remove all sessions, attendee logs, and join codes. This cannot be undone.\n\nAre you sure you want to permanently delete this study?");
            if (!doubleCheck) return;
            deleteBtn.disabled = true;
            deleteBtn.textContent = "Deleting…";
            hide(dangerMsg);
            try {
                await deleteStudy(studyId);
                location.href = "index.html";
            } catch (err) {
                setError(dangerMsg, err.message || "Failed to delete study.");
                deleteBtn.disabled = false;
                deleteBtn.textContent = "Delete Study";
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
            const joinNameEl = qs("#join-name");
            const displayName = joinNameEl ? joinNameEl.value.trim() : "";
            if (!displayName) {
                setError(joinMsg, "Please enter your name.");
                return;
            }
            hide(joinMsg);
            joinBtn.disabled = true;
            joinBtn.textContent = "Joining…";
            try {
                await joinStudy(resolvedStudyId, displayName);
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

// ─── Profile Page Controller ──────────────────────────────────────────────────

async function initProfile() {
    initHeader();
    const loadingEl = qs("#loading");
    const contentEl = qs("#content");
    const errorEl   = qs("#error");

    const profileForm = qs("#profile-form");
    const profileName = qs("#profile-name");
    const profileBirthday = qs("#profile-birthday");
    const profileVerse = qs("#profile-verse");
    const profileMsg = qs("#profile-msg");
    const saveProfileBtn = qs("#save-profile-btn");

    const avatarPreview = qs("#avatar-preview");
    const avatarPresets = qs("#avatar-presets");

    const passwordCard = qs("#password-card");
    const passwordForm = qs("#password-form");
    const profilePassword = qs("#profile-password");
    const profilePasswordConfirm = qs("#profile-password-confirm");
    const passwordMsg = qs("#password-msg");
    const savePasswordBtn = qs("#save-password-btn");

    const googleCard = qs("#google-info-card");
    const studiesListEl = qs("#profile-studies-list");

    // Wait for auth resolution
    let currentUser = null;
    try {
        currentUser = await waitForAuth();
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Could not connect to Firebase.");
        return;
    }

    if (!currentUser || currentUser.isAnonymous) {
        // Redirect anonymous / signed-out users
        location.href = "login.html?next=profile.html";
        return;
    }

    let currentAvatarUrl = "";
    let profileData = null;

    // Load user profile
    try {
        profileData = await getUserProfile(currentUser.uid);
        if (profileData) {
            profileName.value = profileData.displayName || currentUser.displayName || "";
            profileBirthday.value = profileData.birthday || "";
            profileVerse.value = profileData.favoriteVerse || "";
            currentAvatarUrl = profileData.avatarUrl || "";
        } else {
            profileName.value = currentUser.displayName || "";
        }
    } catch (err) {
        console.error("Failed to load user profile", err);
        setError(profileMsg, "Error loading profile details.");
    }

    // Render avatar preview
    function renderAvatar() {
        const nameVal = profileName.value.trim() || currentUser.email || "User";
        avatarPreview.innerHTML = getAvatarHtml(currentAvatarUrl, nameVal, 90);
        
        // Highlight active preset color if it matches
        const presets = avatarPresets.querySelectorAll(".avatar-preset-btn");
        presets.forEach(btn => {
            const color = btn.getAttribute("data-color");
            if (currentAvatarUrl === color) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }
    renderAvatar();

    // Re-render avatar if display name changes (so fallback initial color matches)
    profileName.addEventListener("input", renderAvatar);

    // Setup color preset triggers
    const presets = avatarPresets.querySelectorAll(".avatar-preset-btn");
    presets.forEach(btn => {
        btn.addEventListener("click", () => {
            const color = btn.getAttribute("data-color");
            currentAvatarUrl = color;
            renderAvatar();
        });
    });



    // Check auth provider (Google vs Email)
    const isGoogleUser = currentUser.providerData.some(p => p.providerId === "google.com");
    if (isGoogleUser) {
        show(googleCard);
        hide(passwordCard);
    } else {
        hide(googleCard);
        show(passwordCard);
    }

    // Load and render studies list
    function renderStudies() {
        studiesListEl.innerHTML = "";
        const studiesMap = (profileData && profileData.studies) ? profileData.studies : {};
        const studyIds = Object.keys(studiesMap);

        if (studyIds.length === 0) {
            studiesListEl.innerHTML = `
                <div class="text-muted" style="font-size: .9rem; text-align: center; padding: 12px 0;">
                    You are not a part of any studies yet.
                </div>
            `;
            return;
        }

        // Sort studies by joinedAt desc
        const sortedStudies = studyIds.map(id => ({
            id,
            ...studiesMap[id]
        })).sort((a, b) => {
            const ta = a.joinedAt ? (a.joinedAt.toMillis ? a.joinedAt.toMillis() : new Date(a.joinedAt).getTime()) : 0;
            const tb = b.joinedAt ? (b.joinedAt.toMillis ? b.joinedAt.toMillis() : new Date(b.joinedAt).getTime()) : 0;
            return tb - ta;
        });

        sortedStudies.forEach(s => {
            const item = document.createElement("a");
            item.href = `study.html?id=${s.id}`;
            item.className = "profile-study-item";
            
            const roleBadge = s.role === "leader" 
                ? `<span class="roster-role-badge leader">Leader</span>` 
                : `<span class="roster-role-badge">Member</span>`;

            const dateStr = s.joinedAt ? formatDate(s.joinedAt) : "";

            item.innerHTML = `
                <div>
                    <strong style="color:var(--primary); font-size: .95rem;">${escapeHtml(s.name)}</strong>
                    ${dateStr ? `<div class="text-muted" style="font-size: .75rem; margin-top: 2px;">Joined ${dateStr}</div>` : ""}
                </div>
                ${roleBadge}
            `;
            studiesListEl.appendChild(item);
        });
    }
    renderStudies();

    // Profile details submission
    profileForm.addEventListener("submit", async e => {
        e.preventDefault();
        const displayName = profileName.value.trim();
        const birthday = profileBirthday.value;
        const favoriteVerse = profileVerse.value.trim();

        if (!displayName) {
            setError(profileMsg, "Display name is required.");
            return;
        }

        hide(profileMsg);
        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving…";

        try {
            await saveUserProfile(currentUser.uid, {
                displayName,
                birthday,
                favoriteVerse,
                avatarUrl: currentAvatarUrl
            });
            setSuccess(profileMsg, "Profile details saved successfully!");
            
            // Re-fetch profile data to refresh list
            profileData = await getUserProfile(currentUser.uid);
            renderAvatar();
            
            // Reload header
            initHeader();
        } catch (err) {
            setError(profileMsg, err.message || "Failed to save profile changes.");
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Save Profile";
        }
    });

    // Password change submission
    if (passwordForm) {
        passwordForm.addEventListener("submit", async e => {
            e.preventDefault();
            const passwordVal = profilePassword.value;
            const confirmVal  = profilePasswordConfirm.value;

            if (passwordVal.length < 6) {
                setError(passwordMsg, "Password must be at least 6 characters long.");
                return;
            }

            if (passwordVal !== confirmVal) {
                setError(passwordMsg, "Passwords do not match.");
                return;
            }

            hide(passwordMsg);
            savePasswordBtn.disabled = true;
            savePasswordBtn.textContent = "Updating…";

            try {
                await updateUserPassword(passwordVal);
                setSuccess(passwordMsg, "Password updated successfully!");
                profilePassword.value = "";
                profilePasswordConfirm.value = "";
            } catch (err) {
                if (err.code === "auth/requires-recent-login") {
                    setError(passwordMsg, "For security reasons, please sign out and sign back in before changing your password.");
                } else {
                    setError(passwordMsg, friendlyAuthError(err));
                }
            } finally {
                savePasswordBtn.disabled = false;
                savePasswordBtn.textContent = "Update Password";
            }
        });
    }

    // Show content
    hide(loadingEl);
    show(contentEl);
}

