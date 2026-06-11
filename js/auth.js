// js/auth.js
// Authentication helpers — email/password, Google, anonymous, sign-out

import { auth, db } from "./firebase-config.js";
export { auth };
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut as fbSignOut, 
    onAuthStateChanged,
    signInAnonymously,
    updateProfile,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Sign in with email/password ──────────────────────────────────────────
export async function signInWithEmail(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

// ── Sign up with email/password ──────────────────────────────────────────
export async function signUpWithEmail(displayName, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred.user;
}

// ── Google sign-in (also works as sign-up) ───────────────────────────────
export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
}

// ── Sign out ─────────────────────────────────────────────────────────────
export async function signOut() {
    await fbSignOut(auth);
}

// ── Get current user synchronously ───────────────────────────────────────
export function getCurrentUser() {
    return auth.currentUser;
}

// ── Wait for auth to resolve, then return the user (or null) ─────────────
export function waitForAuth() {
    return new Promise(resolve => {
        const unsub = onAuthStateChanged(auth, user => {
            unsub();
            resolve(user);
        });
    });
}

// ── Anonymous auth (used silently for join flow) ─────────────────────────
export function ensureAnonymousAuth() {
    return new Promise((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, user => {
            unsub();
            if (user) {
                resolve(user);
            } else {
                signInAnonymously(auth)
                    .then(cred => resolve(cred.user))
                    .catch(reject);
            }
        });
    });
}

// ── Display name helper ──────────────────────────────────────────────────
export function userDisplayName(user) {
    if (!user) return "";
    if (user.isAnonymous) return "";
    return user.displayName || user.email || "User";
}

// ─── User Profile Firestore Operations ───────────────────────────────────────

/** Get user profile from Firestore */
export async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return snap.data();
}

/** Save/update user profile in Firestore */
export async function saveUserProfile(uid, { displayName, birthday, favoriteVerse, avatarUrl }) {
    const data = {
        updatedAt: serverTimestamp()
    };
    if (displayName !== undefined) data.displayName = displayName.trim();
    if (birthday !== undefined) data.birthday = birthday;
    if (favoriteVerse !== undefined) data.favoriteVerse = favoriteVerse.trim();
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    await setDoc(doc(db, "users", uid), data, { merge: true });

    // Keep Firebase Auth displayName in sync
    const currentUser = auth.currentUser;
    if (currentUser && displayName && currentUser.displayName !== displayName) {
        await updateProfile(currentUser, { displayName: displayName.trim() });
    }

    // Keep study membership display names in sync
    if (displayName) {
        try {
            const profile = await getUserProfile(uid);
            if (profile && profile.studies) {
                const studyIds = Object.keys(profile.studies);
                const promises = studyIds.map(async studyId => {
                    const memberRef = doc(db, "studies", studyId, "members", uid);
                    await setDoc(memberRef, { displayName: displayName.trim() }, { merge: true }).catch(err => {
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
export async function registerUserStudy(uid, studyId, studyName, role) {
    await setDoc(doc(db, "users", uid), {
        studies: {
            [studyId]: {
                name: studyName,
                role: role,
                joinedAt: serverTimestamp()
            }
        }
    }, { merge: true });
}

/** Change user password */
export async function updateUserPassword(newPassword) {
    const user = auth.currentUser;
    if (user) {
        await updatePassword(user, newPassword);
    } else {
        throw new Error("No user signed in.");
    }
}
