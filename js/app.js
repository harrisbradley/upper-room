// js/app.js
// Page controllers — one init function per page, called from each HTML file.

import { 
    auth, 
    signOut, 
    userDisplayName, 
    getUserProfile, 
    saveUserProfile, 
    updateUserPassword, 
    waitForAuth, 
    ensureAnonymousAuth, 
    signInWithEmail, 
    signInWithGoogle, 
    signUpWithEmail,
    removeDeletedStudiesFromProfile
} from "./auth.js";

import { 
    createStudy, 
    getStudy, 
    getMyStudies, 
    getMyRole, 
    resolveJoinCode, 
    joinStudy, 
    getStudyMembers, 
    updateStudyName, 
    archiveStudy, 
    unarchiveStudy,
    deleteStudy, 
    promoteToLeader, 
    demoteToMember 
} from "./studies.js";

import { 
    listSessions, 
    getSession, 
    createSession, 
    updateSession, 
    postRecap,
    getParticipantData,
    updateParticipantData 
} from "./sessions.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─── Header auth widget ────────────────────────────────────────────────────
// Call initHeader() on every page to show user name + sign-out in the header.

function initHeader() {
    const userArea  = qs("#header-user");
    const nameEl    = qs("#header-user-name");
    const signoutBtn= qs("#header-signout");
    const signinBtn = qs("#header-signin");

    onAuthStateChanged(auth, async user => {
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

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
            document.body.removeChild(textarea);
            return Promise.resolve();
        } catch (err) {
            document.body.removeChild(textarea);
            return Promise.reject(err);
        }
    }
}

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
    const copyLinkBtn   = qs("#copy-link-btn");
    const sessionList   = qs("#session-list");
    const newSessionBtn = qs("#new-session-btn");
    const newSessionForm = qs("#new-session-form");
    const cancelNewBtn  = qs("#cancel-new-session");
    const submitNewBtn  = qs("#submit-new-session");
    const newTitleEl    = qs("#new-title");
    const newPassageEl  = qs("#new-passage");
    const newQuestionsEl= qs("#new-questions");
    const newFormMsg    = qs("#new-session-msg");

    let currentUser = null;
    let isLeader    = false;
    let isCreator   = false;

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
        isCreator = study && currentUser && study.createdBy === currentUser.uid;
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Failed to load study.");
        console.error(err);
        return;
    }

    if (study.archived) {
        // Show an archived banner at the top of the content area
        const archiveBanner = document.createElement("div");
        archiveBanner.className = "msg msg-info";
        archiveBanner.style.marginBottom = "20px";
        archiveBanner.textContent = "This study has been archived and is hidden from the main active studies dashboard.";
        contentEl.insertBefore(archiveBanner, contentEl.firstChild);

        // Render archived status next to the title
        titleEl.innerHTML = `${escapeHtml(study.name)} <span class="roster-role-badge" style="background: var(--border); color: var(--text-muted); border: 1px solid var(--border); margin-left: 10px; font-weight: normal; font-size: 0.8rem; vertical-align: middle;">Archived</span>`;
    } else {
        setText(titleEl, study.name);
    }
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
            copyToClipboard(study.joinCode).then(() => {
                copyBtn.textContent = "Copied!";
                setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
            }).catch(err => {
                console.error("Failed to copy code: ", err);
            });
        });
    }

    // Copy share link
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener("click", () => {
            const shareUrl = shareLinkEl ? shareLinkEl.textContent : "";
            if (shareUrl) {
                copyToClipboard(shareUrl).then(() => {
                    copyLinkBtn.textContent = "Copied!";
                    setTimeout(() => { copyLinkBtn.textContent = "Copy Link"; }, 1500);
                }).catch(err => {
                    console.error("Failed to copy link: ", err);
                });
            }
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
                const passageRef  = (s.passage && s.passage.reference) ? s.passage.reference : "";
                const sessionTitle = s.title || passageRef || "Session";
                const meta        = s.scheduledAt ? formatDate(s.scheduledAt) : "";
                const showPassage = passageRef && passageRef !== sessionTitle;

                const badges = [];
                if (s.completed) {
                    badges.push(`<span class="session-badge badge-completed">✓ Completed</span>`);
                }
                if (hasRecap) {
                    badges.push(`<span class="session-badge badge-recap">Recap posted</span>`);
                }
                const badgesHtml = badges.length ? `<div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">${badges.join("")}</div>` : "";

                const a = document.createElement("a");
                a.href = `session.html?studyId=${studyId}&sessionId=${s.id}`;
                a.className = "session-item";
                a.innerHTML = `
                    <div class="session-item-num">${i + 1}</div>
                    <div class="session-item-info">
                        <div class="session-item-title">${escapeHtml(sessionTitle)}</div>
                        <div class="session-item-meta">
                            ${showPassage ? `<span class="session-item-passage">${escapeHtml(passageRef)}</span>` : ""}
                            ${meta ? `${showPassage ? " &bull; " : ""}${meta}` : ""}
                        </div>
                    </div>
                    ${badgesHtml}`;
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
            if (newTitleEl) newTitleEl.value = "";
            newPassageEl.value = "";
            newQuestionsEl.value = "";
            hide(newFormMsg);
        });
    }

    if (newSessionForm) {
        newSessionForm.addEventListener("submit", async e => {
            e.preventDefault();
            const title     = newTitleEl ? newTitleEl.value.trim() : "";
            const passage   = newPassageEl.value.trim();
            const questions = parseLines(newQuestionsEl.value);
            if (!passage) { setError(newFormMsg, "Please enter a scripture passage."); return; }
            if (passage.length > 100) { setError(newFormMsg, "Passage reference cannot be longer than 100 characters."); return; }
            if (questions.length === 0) { setError(newFormMsg, "Please enter at least one discussion question."); return; }
            hide(newFormMsg);
            submitNewBtn.disabled = true;
            submitNewBtn.textContent = "Creating…";
            try {
                await createSession(studyId, title, passage, questions);
                if (newTitleEl) newTitleEl.value = "";
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
        if (study.archived && archiveBtn) {
            archiveBtn.textContent = "Un-archive Study";
        }

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
                        
                        let roleLabel = "";
                        let actionBtn = "";
                        
                        if (m.role === "leader") {
                            roleLabel = `<span class="roster-role-badge leader">Leader</span>`;
                            if (isCreator && m.uid !== study.createdBy) {
                                actionBtn = `<button class="btn btn-xs btn-outline revoke-leader-btn" data-uid="${m.uid}" data-name="${nameEscaped}" style="margin-left: 10px; padding: 2px 6px; font-size: 0.75rem; color: #dc2626; border-color: #dc2626;">Remove Co-Leader</button>`;
                            }
                        } else {
                            roleLabel = `<span class="roster-role-badge">Member</span>`;
                            if (isCreator) {
                                actionBtn = `<button class="btn btn-xs btn-outline make-leader-btn" data-uid="${m.uid}" data-name="${nameEscaped}" style="margin-left: 10px; padding: 2px 6px; font-size: 0.75rem;">Make Co-Leader</button>`;
                            }
                        }

                        li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <div>
                                    <strong style="color:var(--primary);">${nameEscaped}</strong>
                                    <div class="text-muted" style="font-size:.75rem;margin-top:2px;">Joined ${joinedStr}</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    ${roleLabel}
                                    ${actionBtn}
                                </div>
                            </div>
                        `;
                        rosterList.appendChild(li);
                    });

                    // Bind click listeners to "Make Co-Leader" buttons
                    rosterList.querySelectorAll(".make-leader-btn").forEach(btn => {
                        btn.addEventListener("click", async () => {
                            const memberUid = btn.getAttribute("data-uid");
                            const memberName = btn.getAttribute("data-name");
                            if (confirm(`Are you sure you want to make "${memberName}" a co-leader of this study?`)) {
                                btn.disabled = true;
                                btn.textContent = "Updating...";
                                try {
                                    await promoteToLeader(studyId, memberUid);
                                    await loadRoster();
                                } catch (err) {
                                    alert("Failed to promote member: " + err.message);
                                    btn.disabled = false;
                                    btn.textContent = "Make Co-Leader";
                                }
                            }
                        });
                    });

                    // Bind click listeners to "Remove Co-Leader" buttons
                    rosterList.querySelectorAll(".revoke-leader-btn").forEach(btn => {
                        btn.addEventListener("click", async () => {
                            const memberUid = btn.getAttribute("data-uid");
                            const memberName = btn.getAttribute("data-name");
                            if (confirm(`Are you sure you want to remove "${memberName}" as a co-leader?`)) {
                                btn.disabled = true;
                                btn.textContent = "Updating...";
                                try {
                                    await demoteToMember(studyId, memberUid);
                                    await loadRoster();
                                } catch (err) {
                                    alert("Failed to remove leader status: " + err.message);
                                    btn.disabled = false;
                                    btn.textContent = "Remove Co-Leader";
                                }
                            }
                        });
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
            if (study.archived) {
                if (!confirm("Are you sure you want to un-archive this study? It will show up on your main active list again.")) return;
                archiveBtn.disabled = true;
                archiveBtn.textContent = "Un-archiving…";
                hide(dangerMsg);
                try {
                    await unarchiveStudy(studyId);
                    location.reload();
                } catch (err) {
                    setError(dangerMsg, err.message || "Failed to un-archive study.");
                    archiveBtn.disabled = false;
                    archiveBtn.textContent = "Un-archive Study";
                }
            } else {
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
    const sessionTitleEl= qs("#session-title");
    const passageEl     = qs("#passage-ref");
    const passageTextContainer= qs("#passage-text-container");
    const passageTextEl = qs("#passage-text");
    const theWordView   = qs("#the-word-view");
    const theWordEdit   = qs("#the-word-edit");
    const theWordDisplay= qs("#the-word-display");
    const theWordInput  = qs("#the-word-input");
    const saveTheWordBtn= qs("#save-the-word-btn");
    const editTheWordBtn= qs("#edit-the-word-btn");
    const theWordMsg    = qs("#the-word-msg");
    const questionsEl   = qs("#questions-list");
    const leaderNotesSec= qs("#leader-notes-section");
    const leaderNotesEl = qs("#leader-notes");
    const lectioViewSec = qs("#lectio-view-section");
    const questionsSec  = qs("#questions-section");

    // Meditatio section
    const meditatioCard = qs("#meditatio-card");
    const reflectionDisplayTitle = qs("#reflection-display-title");
    const reflectionDisplayBody = qs("#reflection-display-body");
    const hitsHomeInput = qs("#hits-home-input");
    const hitsHomeStatus = qs("#hits-home-status");
    const meditatioInfoCard = qs("#meditatio-info-card");
    const closeMeditatioInfo = qs("#close-meditatio-info");

    const editReflectionTitle = qs("#edit-reflection-title");
    const editReflectionBody  = qs("#edit-reflection-body");

    // Session Header section
    const sessionHeaderSec= qs("#session-header-section");
    const sessionDatetime = qs("#session-datetime");
    const sessionFacilitator= qs("#session-facilitator");
    const sessionBigIdea  = qs("#session-big-idea");
    const datetimeContainer = qs("#datetime-container");
    const facilitatorContainer = qs("#facilitator-container");
    const bigIdeaContainer = qs("#big-idea-container");

    // Edit section
    const editSection   = qs("#edit-section");
    const editBtn       = qs("#edit-btn");
    const editForm      = qs("#edit-form");
    const editTitle     = qs("#edit-title");
    const editDatetime  = qs("#edit-datetime");
    const editFacilitator= qs("#edit-facilitator");
    const editBigIdea   = qs("#edit-big-idea");
    const editPassage   = qs("#edit-passage");
    const editPassageText= qs("#edit-passage-text");
    const editQuestions = qs("#edit-questions");
    const editNotes     = qs("#edit-leader-notes");
    const editCompleted = qs("#edit-completed");
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
    const editRecapSec  = qs("#edit-recap-section");
    const editRecapBtn  = qs("#edit-recap-btn");
    const recapFormTitle = qs("#recap-form-title");

    let currentUser = null;
    let isLeader    = false;
    let session     = null;
    let lastSavedNotes = "";

    try {
        currentUser = await ensureAnonymousAuth();
    } catch (err) {
        hide(loadingEl);
        setError(errorEl, "Could not connect to Firebase.");
        return;
    }

    // Set study link
    if (studyLinkEl) studyLinkEl.href = `study.html?id=${studyId}`;

    let participantData = null;

    // Load session + role + participant data
    try {
        const [loadedSession, loadedParticipantData] = await Promise.all([
            getSession(studyId, sessionId),
            getParticipantData(studyId, sessionId, currentUser.uid)
        ]);
        session = loadedSession;
        participantData = loadedParticipantData;

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
        const sessionTitle = session.title || (session.passage && session.passage.reference) || "Session";
        const passageRef = (session.passage && session.passage.reference) ? session.passage.reference : "";
        const questions  = (session.agenda  && session.agenda.questions)  ? session.agenda.questions  : [];
        const notes      = (session.agenda  && session.agenda.leaderNotes)? session.agenda.leaderNotes: "";

        document.title = sessionTitle + " — Upper Room";
        if (sessionTitleEl) sessionTitleEl.textContent = sessionTitle;

        if (passageEl) {
            if (passageRef) {
                passageEl.textContent = passageRef;
                passageEl.parentElement && show(passageEl.parentElement);
            } else {
                passageEl.parentElement && hide(passageEl.parentElement);
            }
        }

        // Render scripture Focus and Text
        const passageText = (session.passage && session.passage.text) ? session.passage.text : "";
        if (passageTextEl) {
            if (passageText) {
                passageTextEl.textContent = passageText;
                if (passageTextContainer) show(passageTextContainer);
            } else {
                if (passageTextContainer) hide(passageTextContainer);
            }
        }

        // Render participant "The Word" box
        const savedWord = (participantData && participantData.word) ? participantData.word : "";
        if (savedWord) {
            // View mode
            if (theWordDisplay) theWordDisplay.textContent = `"${savedWord}"`;
            if (theWordView) show(theWordView);
            if (theWordEdit) hide(theWordEdit);
        } else {
            // Edit mode
            if (theWordInput) theWordInput.value = "";
            if (theWordView) hide(theWordView);
            if (theWordEdit) show(theWordEdit);
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
        } else if (leaderNotesSec) {
            hide(leaderNotesSec);
        }

        // Render header details
        const dateTime = session.dateTime || "";
        const facilitator = session.facilitator || "";
        const bigIdea = session.bigIdea || "";

        if (sessionDatetime) sessionDatetime.textContent = dateTime || "—";
        if (sessionFacilitator) sessionFacilitator.textContent = facilitator || "—";
        if (sessionBigIdea) sessionBigIdea.textContent = bigIdea || "—";

        const hasHeaderData = dateTime || facilitator || bigIdea;
        if (sessionHeaderSec) {
            if (hasHeaderData || isLeader) {
                show(sessionHeaderSec);
                if (datetimeContainer) {
                    if (dateTime) {
                        show(datetimeContainer);
                    } else if (isLeader) {
                        show(datetimeContainer);
                        sessionDatetime.textContent = "—";
                    } else {
                        hide(datetimeContainer);
                    }
                }
                if (facilitatorContainer) {
                    if (facilitator) {
                        show(facilitatorContainer);
                    } else if (isLeader) {
                        show(facilitatorContainer);
                        sessionFacilitator.textContent = "—";
                    } else {
                        hide(facilitatorContainer);
                    }
                }
                if (bigIdeaContainer) {
                    if (bigIdea) {
                        show(bigIdeaContainer);
                    } else if (isLeader) {
                        show(bigIdeaContainer);
                        sessionBigIdea.textContent = "—";
                    } else {
                        hide(bigIdeaContainer);
                    }
                }
            } else {
                hide(sessionHeaderSec);
            }
        }

        // Populate edit form
        if (editTitle)       editTitle.value       = session.title || "";
        if (editDatetime)    editDatetime.value    = dateTime;
        if (editFacilitator)  editFacilitator.value  = facilitator;
        if (editBigIdea)      editBigIdea.value      = bigIdea;
        if (editPassage)   editPassage.value   = passageRef;
        if (editPassageText)  editPassageText.value  = passageText;
        if (editQuestions) editQuestions.value = questions.join("\n");
        if (editNotes)     editNotes.value     = notes;
        if (editCompleted) editCompleted.checked = !!session.completed;
        if (editReflectionTitle) editReflectionTitle.value = session.reflectionTitle || "";
        if (editReflectionBody)  editReflectionBody.value  = session.reflectionBody || "";

        // Render Meditatio (Reflection)
        const refTitle = session.reflectionTitle || "The Reflection";
        const refBody  = session.reflectionBody  || "";
        
        if (meditatioCard) {
            if (refBody) {
                show(meditatioCard);
                if (reflectionDisplayTitle) reflectionDisplayTitle.textContent = refTitle;
                if (reflectionDisplayBody) reflectionDisplayBody.textContent = refBody;
                
                // Load participant's hitsHomeNotes
                const savedNotes = (participantData && participantData.hitsHomeNotes) ? participantData.hitsHomeNotes : "";
                if (hitsHomeInput) {
                    hitsHomeInput.value = savedNotes;
                    lastSavedNotes = savedNotes;
                }
            } else {
                hide(meditatioCard);
            }
        }

        // Render recap
        renderRecap();
    }

    function renderRecap() {
        if (!session.recap) {
            hide(recapViewSec);
            if (isLeader && recapFormSec) {
                show(recapFormSec);
                show(postRecapBtn);
                hide(recapForm);
                if (recapFormTitle) recapFormTitle.textContent = "Post a Recap";
                if (saveRecapBtn) saveRecapBtn.textContent = "Post Recap";
            }
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

        // Show/hide edit button based on leader status
        if (isLeader && editRecapSec) {
            show(editRecapSec);
        } else if (editRecapSec) {
            hide(editRecapSec);
        }
    }

    renderSession();

    // Edit controls (leader only)
    if (isLeader && editSection) {
        show(editSection);

        editBtn.addEventListener("click", () => {
            hide(editBtn);
            show(editForm);
            
            // Hide other read-only display sections during editing
            if (sessionHeaderSec) hide(sessionHeaderSec);
            if (lectioViewSec) hide(lectioViewSec);
            if (questionsSec) hide(questionsSec);
            if (leaderNotesSec) hide(leaderNotesSec);
            if (recapViewSec) hide(recapViewSec);
            if (recapFormSec) hide(recapFormSec);
            if (meditatioCard) hide(meditatioCard);
            
            // Set title to "Edit Session"
            if (sessionTitleEl) sessionTitleEl.textContent = "Edit Session";
            
            editPassage.focus();
        });

        cancelEditBtn.addEventListener("click", () => {
            show(editBtn);
            hide(editForm);
            hide(editMsg);
            
            // Restore visibility of standard view sections
            if (lectioViewSec) show(lectioViewSec);
            if (questionsSec) show(questionsSec);
            
            // renderSession will restore the rest (title, header, notes, recap)
            renderSession();
        });

        editForm.addEventListener("submit", async e => {
            e.preventDefault();
            const title     = editTitle ? editTitle.value.trim() : "";
            const dateTime  = editDatetime ? editDatetime.value.trim() : "";
            const facilitator = editFacilitator ? editFacilitator.value.trim() : "";
            const bigIdea   = editBigIdea ? editBigIdea.value.trim() : "";
            const passage   = editPassage.value.trim();
            const passageText = editPassageText ? editPassageText.value.trim() : "";
            const questions = parseLines(editQuestions.value);
            const notes     = editNotes ? editNotes.value.trim() : "";
            const completed = editCompleted ? editCompleted.checked : false;
            
            // New Meditatio fields
            const reflectionTitle = editReflectionTitle ? editReflectionTitle.value.trim() : "";
            const reflectionBody  = editReflectionBody ? editReflectionBody.value.trim() : "";
            
            if (!passage) { setError(editMsg, "Please enter a scripture passage."); return; }
            if (passage.length > 100) { setError(editMsg, "Passage reference cannot be longer than 100 characters."); return; }
            if (questions.length === 0) { setError(editMsg, "Please enter at least one discussion question."); return; }
            hide(editMsg);
            saveEditBtn.disabled = true;
            saveEditBtn.textContent = "Saving…";
            try {
                await updateSession(studyId, sessionId, { 
                    title, 
                    passageRef: passage, 
                    questions, 
                    leaderNotes: notes, 
                    completed,
                    dateTime,
                    facilitator,
                    bigIdea,
                    passageText,
                    reflectionTitle,
                    reflectionBody
                });
                session = await getSession(studyId, sessionId);
                
                // Restore visibility of standard view sections
                if (lectioViewSec) show(lectioViewSec);
                if (questionsSec) show(questionsSec);
                
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

    // Participant: The Word
    if (saveTheWordBtn) {
        saveTheWordBtn.addEventListener("click", async () => {
            const word = (theWordInput && theWordInput.value.trim()) || "";
            if (!word) { setError(theWordMsg, "Please enter a word or phrase."); return; }
            hide(theWordMsg);
            saveTheWordBtn.disabled = true;
            saveTheWordBtn.textContent = "Saving…";
            try {
                await updateParticipantData(studyId, sessionId, currentUser.uid, { word });
                participantData = { ...participantData, word };
                
                // Show view mode and hide edit mode
                if (theWordDisplay) theWordDisplay.textContent = `"${word}"`;
                if (theWordView) show(theWordView);
                if (theWordEdit) hide(theWordEdit);
                
                setSuccess(theWordMsg, "Saved!");
                setTimeout(() => {
                    hide(theWordMsg);
                }, 2500);
            } catch (err) {
                setError(theWordMsg, err.message || "Failed to save.");
            } finally {
                saveTheWordBtn.disabled = false;
                saveTheWordBtn.textContent = "Save";
            }
        });
    }

    if (editTheWordBtn) {
        editTheWordBtn.addEventListener("click", () => {
            const savedWord = (participantData && participantData.word) ? participantData.word : "";
            if (theWordInput) {
                theWordInput.value = savedWord;
            }
            // Switch to edit mode
            if (theWordView) hide(theWordView);
            if (theWordEdit) show(theWordEdit);
            if (theWordInput) theWordInput.focus();
        });
    }

    // Participant: Meditatio private notes autosave
    if (hitsHomeInput) {
        let debounceTimer;

        const saveNotes = async () => {
            const val = hitsHomeInput.value;
            if (val === lastSavedNotes) return; // No change, don't save
            
            if (hitsHomeStatus) {
                hitsHomeStatus.textContent = "Saving…";
                hitsHomeStatus.style.color = "var(--accent)";
                hitsHomeStatus.style.fontWeight = "600";
                show(hitsHomeStatus);
            }
            try {
                await updateParticipantData(studyId, sessionId, currentUser.uid, { hitsHomeNotes: val });
                participantData = { ...participantData, hitsHomeNotes: val };
                lastSavedNotes = val;
                if (hitsHomeStatus) {
                    hitsHomeStatus.textContent = "Saved";
                    hitsHomeStatus.style.color = "var(--success)";
                    hitsHomeStatus.style.fontWeight = "600";
                    setTimeout(() => {
                        if (hitsHomeStatus.textContent === "Saved") {
                            hide(hitsHomeStatus);
                        }
                    }, 2000);
                }
            } catch (err) {
                console.error("Autosave failed:", err);
                if (hitsHomeStatus) {
                    hitsHomeStatus.textContent = "Error saving";
                    hitsHomeStatus.style.color = "var(--error)";
                    hitsHomeStatus.style.fontWeight = "600";
                }
            }
        };

        hitsHomeInput.addEventListener("input", () => {
            if (hitsHomeStatus) {
                hitsHomeStatus.textContent = "Saving…";
                hitsHomeStatus.style.color = "var(--accent)";
                hitsHomeStatus.style.fontWeight = "600";
                show(hitsHomeStatus);
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(saveNotes, 1000);
        });

        hitsHomeInput.addEventListener("blur", () => {
            clearTimeout(debounceTimer);
            saveNotes();
        });
    }

    // Meditatio Info Card dismissal
    if (closeMeditatioInfo && meditatioInfoCard) {
        if (localStorage.getItem("meditatio-info-dismissed") === "true") {
            hide(meditatioInfoCard);
        }
        closeMeditatioInfo.addEventListener("click", () => {
            hide(meditatioInfoCard);
            localStorage.setItem("meditatio-info-dismissed", "true");
        });
    }

    // Recap form (leader only, no recap yet)
    if (isLeader && postRecapBtn) {
        postRecapBtn.addEventListener("click", () => {
            if (recapFormTitle) recapFormTitle.textContent = "Post a Recap";
            if (saveRecapBtn) saveRecapBtn.textContent = "Post Recap";
            hide(postRecapBtn);
            show(recapForm);
            if (recapSummaryEl) recapSummaryEl.focus();
        });
    }

    if (isLeader && editRecapBtn) {
        editRecapBtn.addEventListener("click", () => {
            const r = session.recap || {};
            // Populate form
            if (recapSummaryEl) recapSummaryEl.value = r.summary || "";
            if (recapTakeaways) recapTakeaways.value = (r.keyTakeaways || []).join("\n");
            if (recapPrayers) recapPrayers.value = (r.prayerIntentions || []).join("\n");

            // Adjust form UI for editing
            if (recapFormTitle) recapFormTitle.textContent = "Edit Recap";
            if (saveRecapBtn) saveRecapBtn.textContent = "Save Changes";

            // Toggle visibility
            hide(recapViewSec);
            show(recapFormSec);
            hide(postRecapBtn);
            show(recapForm);

            if (recapSummaryEl) recapSummaryEl.focus();
        });
    }

    if (cancelRecap) {
        cancelRecap.addEventListener("click", () => {
            if (session.recap) {
                // If there's already a recap, return to the read view
                hide(recapFormSec);
                show(recapViewSec);
            } else {
                // Otherwise return to the "Post Recap" button state
                show(postRecapBtn);
                hide(recapForm);
            }
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
            saveRecapBtn.textContent = session.recap ? "Saving…" : "Posting…";
            const postedAt = session.recap ? session.recap.postedAt : null;
            try {
                await postRecap(studyId, sessionId, currentUser.uid, { summary, keyTakeaways, prayerIntentions, postedAt });
                session = await getSession(studyId, sessionId);
                renderSession();
            } catch (err) {
                setError(recapMsg, err.message || "Failed to save recap.");
                saveRecapBtn.disabled = false;
                saveRecapBtn.textContent = session.recap ? "Save Changes" : "Post Recap";
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
    async function renderStudies() {
        studiesListEl.innerHTML = `
            <div class="text-muted" style="font-size: .9rem; text-align: center; padding: 12px 0;">
                Loading studies...
            </div>
        `;
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

        const resolvedStudies = [];
        const deletedStudyIds = [];

        try {
            await Promise.all(studyIds.map(async id => {
                const actualStudy = await getStudy(id);
                if (actualStudy) {
                    resolvedStudies.push({
                        id,
                        name: actualStudy.name || studiesMap[id].name || "Bible Study",
                        role: studiesMap[id].role || "member",
                        joinedAt: studiesMap[id].joinedAt || null,
                        archived: actualStudy.archived || false
                    });
                } else {
                    deletedStudyIds.push(id);
                }
            }));
        } catch (err) {
            console.error("Error resolving user studies from Firestore:", err);
            // Fallback: use stored local mapping if resolve fails (e.g. offline/network issue)
            studyIds.forEach(id => {
                resolvedStudies.push({
                    id,
                    ...studiesMap[id],
                    archived: false
                });
            });
        }

        // Clean up deleted studies from the user document in Firestore asynchronously (don't block UI)
        if (deletedStudyIds.length > 0) {
            removeDeletedStudiesFromProfile(currentUser.uid, deletedStudyIds).catch(err => {
                console.error("Failed to clean up deleted studies on user profile:", err);
            });
        }

        if (resolvedStudies.length === 0) {
            studiesListEl.innerHTML = `
                <div class="text-muted" style="font-size: .9rem; text-align: center; padding: 12px 0;">
                    You are not a part of any studies yet.
                </div>
            `;
            return;
        }

        // Sort studies by joinedAt desc
        resolvedStudies.sort((a, b) => {
            const ta = a.joinedAt ? (a.joinedAt.toMillis ? a.joinedAt.toMillis() : new Date(a.joinedAt).getTime()) : 0;
            const tb = b.joinedAt ? (b.joinedAt.toMillis ? b.joinedAt.toMillis() : new Date(b.joinedAt).getTime()) : 0;
            return tb - ta;
        });

        studiesListEl.innerHTML = "";
        resolvedStudies.forEach(s => {
            const item = document.createElement("a");
            item.href = `study.html?id=${s.id}`;
            item.className = "profile-study-item";
            
            const roleBadge = s.role === "leader" 
                ? `<span class="roster-role-badge leader">Leader</span>` 
                : `<span class="roster-role-badge">Member</span>`;

            const dateStr = s.joinedAt ? formatDate(s.joinedAt) : "";
            
            const archivedBadge = s.archived 
                ? `<span class="roster-role-badge" style="background: var(--border); color: var(--text-muted); border: 1px solid var(--border); margin-right: 6px;">Archived</span>` 
                : "";

            item.innerHTML = `
                <div>
                    <strong style="color:var(--primary); font-size: .95rem;">${escapeHtml(s.name)}</strong>
                    ${dateStr ? `<div class="text-muted" style="font-size: .75rem; margin-top: 2px;">Joined ${dateStr}</div>` : ""}
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    ${archivedBadge}
                    ${roleBadge}
                </div>
            `;
            studiesListEl.appendChild(item);
        });
    }
    await renderStudies();

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

// Attach controller functions to global window scope so legacy HTML scripts can access them
window.initHome = initHome;
window.initStudy = initStudy;
window.initSession = initSession;
window.initJoin = initJoin;
window.initLogin = initLogin;
window.initSignup = initSignup;
window.initProfile = initProfile;

