// js/auth.js
// Authentication helpers — email/password, Google, anonymous, sign-out

// ── Sign in with email/password ──────────────────────────────────────────
async function signInWithEmail(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
}

// ── Sign up with email/password ──────────────────────────────────────────
async function signUpWithEmail(displayName, email, password) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName });
    return cred.user;
}

// ── Google sign-in (also works as sign-up) ───────────────────────────────
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const cred = await auth.signInWithPopup(provider);
    return cred.user;
}

// ── Sign out ─────────────────────────────────────────────────────────────
async function signOut() {
    await auth.signOut();
}

// ── Get current user synchronously ───────────────────────────────────────
function getCurrentUser() {
    return auth.currentUser;
}

// ── Wait for auth to resolve, then return the user (or null) ─────────────
function waitForAuth() {
    return new Promise(resolve => {
        const unsub = auth.onAuthStateChanged(user => {
            unsub();
            resolve(user);
        });
    });
}

// ── Anonymous auth (used silently for join flow) ─────────────────────────
function ensureAnonymousAuth() {
    return new Promise((resolve, reject) => {
        const unsub = auth.onAuthStateChanged(user => {
            unsub();
            if (user) {
                resolve(user);
            } else {
                auth.signInAnonymously()
                    .then(cred => resolve(cred.user))
                    .catch(reject);
            }
        });
    });
}

// ── Display name helper ──────────────────────────────────────────────────
function userDisplayName(user) {
    if (!user) return "";
    if (user.isAnonymous) return "";
    return user.displayName || user.email || "User";
}

// ─── User Profile Firestore Operations ───────────────────────────────────────

/** Get user profile from Firestore */
async function getUserProfile(uid) {
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return snap.data();
}

/** Save/update user profile in Firestore */
async function saveUserProfile(uid, { displayName, birthday, favoriteVerse, avatarUrl }) {
    const data = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (displayName !== undefined) data.displayName = displayName.trim();
    if (birthday !== undefined) data.birthday = birthday;
    if (favoriteVerse !== undefined) data.favoriteVerse = favoriteVerse.trim();
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    await db.collection("users").doc(uid).set(data, { merge: true });

    // Keep Firebase Auth displayName in sync
    const currentUser = auth.currentUser;
    if (currentUser && displayName && currentUser.displayName !== displayName) {
        await currentUser.updateProfile({ displayName: displayName.trim() });
    }

    // Keep study membership display names in sync
    if (displayName) {
        try {
            const profile = await getUserProfile(uid);
            if (profile && profile.studies) {
                const studyIds = Object.keys(profile.studies);
                const promises = studyIds.map(async studyId => {
                    const memberRef = db.collection("studies").doc(studyId).collection("members").doc(uid);
                    await memberRef.set({ displayName: displayName.trim() }, { merge: true }).catch(err => {
                        console.warn(`Failed to update display name in study ${studyId}:`, err);
                    });
                });
                await Promise.all(promises);
            }
        } catch (e) {
            console.error("Failed to sync display name with studies", e);
        }
    }
}

/** Register a study association in the user's document */
async function registerUserStudy(uid, studyId, studyName, role) {
    await db.collection("users").doc(uid).set({
        studies: {
            [studyId]: {
                name: studyName,
                role: role,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        }
    }, { merge: true });
}

/** Change user password */
async function updateUserPassword(newPassword) {
    const user = auth.currentUser;
    if (user) {
        await user.updatePassword(newPassword);
    } else {
        throw new Error("No user signed in.");
    }
}



