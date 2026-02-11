import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

/**
 * Ensures the user is signed in anonymously. If already signed in (anonymous or otherwise), returns the current user.
 * Call this before creating a study so the leader has a stable uid.
 */
export async function ensureAnonymousAuth(): Promise<User> {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (currentUser) {
    return currentUser;
  }
  return new Promise((resolve, reject) => {
    const unsubscribe: Unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });
    signInAnonymously(auth).then((cred) => resolve(cred.user)).catch((err) => {
      unsubscribe();
      reject(err);
    });
  });
}

/**
 * Placeholder: link anonymous account to a permanent provider (e.g. email/password or Google).
 * Use linkWithCredential or linkWithPopup after the user chooses to upgrade their account.
 */
export async function linkAnonymousToProvider(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || !user.isAnonymous) {
    throw new Error("No anonymous user to link.");
  }
  // When implementing: import EmailAuthProvider or use linkWithPopup with GoogleAuthProvider
  // return linkWithCredential(auth, user, credential);
  throw new Error("Provider linking not implemented.");
}

/**
 * Placeholder: sign in with a permanent provider (e.g. Google). For existing anonymous users,
 * consider linking instead so study membership is preserved.
 */
export async function signInWithProvider(): Promise<User> {
  // When implementing: signInWithPopup(auth, new GoogleAuthProvider()) or signInWithEmailAndPassword
  throw new Error("Provider sign-in not implemented.");
}
