"use client";

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

export type SessionDoc = {
  id: string;
  // Canonical field for scheduled datetime.
  scheduledAt?: Timestamp | null;
  // Legacy field kept for backward compatibility in older documents.
  startsAt?: Timestamp | null;
  title?: string;
  passage?: { reference?: string };
  agenda?: { questions?: string[]; leaderNotes?: string };
  recap?: {
    summary?: string;
    keyTakeaways?: string[];
    prayerIntentions?: string[];
    postedAt?: Timestamp;
    postedByUid?: string;
  };
};

type SessionDocData = Omit<SessionDoc, "id"> & Record<string, unknown>;

function normalizeSessionDoc(
  id: string,
  data: SessionDocData
): SessionDoc {
  return {
    id,
    ...data,
    scheduledAt: data.scheduledAt ?? data.startsAt ?? null,
    startsAt: data.startsAt ?? null,
  };
}

export async function listSessions(studyId: string): Promise<SessionDoc[]> {
  const q = query(
    collection(getFirebaseDb(), "studies", studyId, "sessions"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) =>
    normalizeSessionDoc(d.id, d.data() as SessionDocData)
  );
}

export async function getSession(
  studyId: string,
  sessionId: string
): Promise<SessionDoc | null> {
  const snap = await getDoc(
    doc(getFirebaseDb(), "studies", studyId, "sessions", sessionId)
  );
  if (!snap.exists()) return null;
  return normalizeSessionDoc(snap.id, snap.data() as SessionDocData);
}

export async function updateSessionBasics(
  studyId: string,
  sessionId: string,
  payload: {
    passageRef: string;
    questions: string[];
    leaderNotes: string;
  }
) {
  await updateDoc(doc(getFirebaseDb(), "studies", studyId, "sessions", sessionId), {
    "passage.reference": payload.passageRef,
    "agenda.questions": payload.questions,
    "agenda.leaderNotes": payload.leaderNotes,
    updatedAt: serverTimestamp(),
  });
}

export async function postRecap(
  studyId: string,
  sessionId: string,
  uid: string,
  payload: {
    summary: string;
    keyTakeaways: string[];
    prayerIntentions: string[];
  }
) {
  await updateDoc(doc(getFirebaseDb(), "studies", studyId, "sessions", sessionId), {
    recap: {
      summary: payload.summary,
      keyTakeaways: payload.keyTakeaways,
      prayerIntentions: payload.prayerIntentions,
      postedAt: serverTimestamp(),
      postedByUid: uid,
    },
    updatedAt: serverTimestamp(),
  });
}

export async function createSession(
  studyId: string,
  payload: {
    scheduledAt: Date | null;
    passageRef: string;
    questions: string[];
  }
) {
  const ref = await addDoc(
    collection(getFirebaseDb(), "studies", studyId, "sessions"),
    {
      order: Date.now(), // simple ordering for now
      scheduledAt: payload.scheduledAt
        ? Timestamp.fromDate(payload.scheduledAt)
        : null,
      passage: {
        reference: payload.passageRef,
      },
      agenda: {
        questions: payload.questions,
        leaderNotes: "",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  return ref.id;
}