import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";
import type { Study } from "./studies";

const STUDIES = "studies";
const JOIN_CODES = "joinCodes";

/**
 * Resolves a join code to the corresponding studyId. Returns null if code is invalid.
 */
export async function resolveJoinCode(code: string): Promise<string | null> {
  const db = getFirebaseDb();
  const normalized = code.toUpperCase().trim();
  const ref = doc(db, JOIN_CODES, normalized);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().studyId ?? null;
}

/**
 * Loads the study for a join code. Returns null if code or study not found.
 */
export async function getStudyByJoinCode(code: string): Promise<Study | null> {
  const studyId = await resolveJoinCode(code);
  if (!studyId) return null;
  const { getStudy } = await import("./studies");
  return getStudy(studyId);
}

/**
 * Adds the current user as a member of the study (anonymous auth if needed).
 * Idempotent: if already a member, no-op.
 */
export async function joinStudy(studyId: string): Promise<void> {
  const user = await ensureAnonymousAuth();
  const db = getFirebaseDb();
  const memberRef = doc(db, STUDIES, studyId, "members", user.uid);
  const snap = await getDoc(memberRef);
  if (snap.exists()) return;
  await setDoc(memberRef, {
    role: "member",
    joinedAt: serverTimestamp(),
  });
}
