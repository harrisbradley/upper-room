// js/sessions.js
// Firestore operations for sessions

import { db } from "./firebase-config.js";
import { 
    doc, 
    collection, 
    addDoc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Returns all sessions for a study, ordered by `order` asc.
 */
export async function listSessions(studyId) {
    const q = query(
        collection(db, "studies", studyId, "sessions"),
        orderBy("order", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Returns a single session document.
 */
export async function getSession(studyId, sessionId) {
    const snap = await getDoc(doc(db, "studies", studyId, "sessions", sessionId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Creates a new session in a study.
 * order uses Date.now() for simple append-to-bottom behavior.
 */
export async function createSession(studyId, passageRef, questions) {
    const ref = await addDoc(collection(db, "studies", studyId, "sessions"), {
        order:       Date.now(),
        title:       passageRef || "New Session",
        scheduledAt: null,
        passage:     { reference: passageRef || "" },
        agenda:      { questions: questions || [], leaderNotes: "" },
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
    });
    return ref.id;
}

/**
 * Updates the editable fields of a session (scripture, questions, notes, completion).
 */
export async function updateSession(studyId, sessionId, { passageRef, questions, leaderNotes, completed }) {
    const updateData = {
        title:              passageRef || "Session",
        "passage.reference": passageRef || "",
        "agenda.questions":  questions  || [],
        "agenda.leaderNotes": leaderNotes || "",
        updatedAt: serverTimestamp(),
    };
    if (completed !== undefined) {
        updateData.completed = !!completed;
        if (completed) {
            updateData.completedAt = serverTimestamp();
        } else {
            updateData.completedAt = null;
        }
    }
    await updateDoc(doc(db, "studies", studyId, "sessions", sessionId), updateData);
}

/**
 * Posts a recap to a session document.
 */
export async function postRecap(studyId, sessionId, uid, { summary, keyTakeaways, prayerIntentions }) {
    await updateDoc(doc(db, "studies", studyId, "sessions", sessionId), {
        recap: {
            summary,
            keyTakeaways:     keyTakeaways     || [],
            prayerIntentions: prayerIntentions || [],
            postedAt:         serverTimestamp(),
            postedByUid:      uid,
        },
        updatedAt: serverTimestamp(),
    });
}
