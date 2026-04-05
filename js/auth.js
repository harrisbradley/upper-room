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
