import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { ensureAnonymousAuth } from "@/lib/firebase/auth";

const STUDIES = "studies";
const JOIN_CODES = "joinCodes";

export type Study = {
  id: string;
  name: string;
  joinCode: string;
  createdAt: unknown;
  createdBy: string;
};

export type Session = {
  id: string;
  studyId: string;
  title: string;
  scheduledAt: unknown | null;
  order: number;
};

function randomJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export type CreateStudyResult = {
  studyId: string;
  joinCode: string;
  firstSessionId: string;
};

/**
 * Signs in anonymously (if needed), then creates:
 * - study doc
 * - leader membership in studies/{studyId}/members/{uid}
 * - join code mapping in joinCodes/{code}
 * - first session in studies/{studyId}/sessions
 */
export async function createStudy(studyName: string): Promise<CreateStudyResult> {
  const user = await ensureAnonymousAuth();
  const db = getFirebaseDb();

  const studyRef = doc(collection(db, STUDIES));
  const studyId = studyRef.id;

  const membersRef = collection(db, STUDIES, studyId, "members");
  const leaderRef = doc(membersRef, user.uid);

  let joinCode = randomJoinCode();
  const joinCodeRef = doc(db, JOIN_CODES, joinCode);
  let exists = (await getDoc(joinCodeRef)).exists();
  while (exists) {
    joinCode = randomJoinCode();
    const ref = doc(db, JOIN_CODES, joinCode);
    exists = (await getDoc(ref)).exists();
  }

  // Create study first — session rule uses get(study) to check createdBy, so study must exist
  await setDoc(studyRef, {
    name: studyName,
    joinCode,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  });

  const sessionsRef = collection(db, STUDIES, studyId, "sessions");
  const firstSessionRef = await addDoc(sessionsRef, {
    title: "Session 1",
    scheduledAt: null,
    order: 0,
    createdAt: serverTimestamp(),
  });

  await setDoc(leaderRef, {
    role: "leader",
    joinedAt: serverTimestamp(),
  });

  await setDoc(doc(db, JOIN_CODES, joinCode), {
    studyId,
    createdAt: serverTimestamp(),
  });

  return {
    studyId,
    joinCode,
    firstSessionId: firstSessionRef.id,
  };
}

/**
 * Loads a study by id. Returns null if not found.
 */
export async function getStudy(studyId: string): Promise<Study | null> {
  const db = getFirebaseDb();
  const studyRef = doc(db, STUDIES, studyId);
  const snap = await getDoc(studyRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name ?? "",
    joinCode: data.joinCode ?? "",
    createdAt: data.createdAt,
    createdBy: data.createdBy ?? "",
  };
}

/**
 * Fetches the next (or first) session for a study. For MVP we treat "next" as the first session by order.
 */
export async function getNextSession(
  studyId: string
): Promise<Session | null> {
  const db = getFirebaseDb();
  const { getDocs, query, orderBy, limit } = await import("firebase/firestore");
  const sessionsRef = collection(db, STUDIES, studyId, "sessions");
  const q = query(
    sessionsRef,
    orderBy("order", "asc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return {
    id: d.id,
    studyId,
    title: data.title ?? "Session",
    scheduledAt: data.scheduledAt ?? null,
    order: data.order ?? 0,
  };
}

export async function getMyRole(
  studyId: string,
  uid: string
): Promise<"leader" | "participant" | null> {
  const snap = await getDoc(
    doc(getFirebaseDb(), "studies", studyId, "members", uid)
  );

  if (!snap.exists()) return null;

  return snap.data().role ?? null;
};