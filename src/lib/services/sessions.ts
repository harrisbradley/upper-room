"use client";

import { getFirebaseDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

export type SessionDoc = {
  id: string;
  startsAt?: Timestamp;
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

export async function listSessions(studyId: string): Promise<SessionDoc[]> {
  const q = query(
    collection(getFirebaseDb(), "studies", studyId, "sessions"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getSession(
  studyId: string,
  sessionId: string
): Promise<SessionDoc | null> {
  const snap = await getDoc(
    doc(getFirebaseDb(), "studies", studyId, "sessions", sessionId)
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
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

import { addDoc } from "firebase/firestore";

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