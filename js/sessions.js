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
    setDoc,
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
export async function createSession(studyId, title, passageRef, questions) {
    const ref = await addDoc(collection(db, "studies", studyId, "sessions"), {
        order:       Date.now(),
        title:       title || passageRef || "New Session",
        scheduledAt: null,
        passage:     { reference: passageRef || "" },
        agenda:      { questions: questions || [], leaderNotes: "" },
        dateTime:    "",
        facilitator: "",
        bigIdea:     "",
        reflectionTitle: "The Reflection",
        reflectionBody:  "",
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
    });
    return ref.id;
}

/**
 * Updates the editable fields of a session (scripture, questions, notes, completion).
 */
export async function updateSession(studyId, sessionId, { title, passageRef, questions, leaderNotes, completed, dateTime, facilitator, bigIdea, passageText, reflectionTitle, reflectionBody }) {
    const updateData = {
        title:              title || passageRef || "Session",
        "passage.reference": passageRef || "",
        "passage.text":      passageText || "",
        "agenda.questions":  questions  || [],
        "agenda.leaderNotes": leaderNotes || "",
        dateTime:           dateTime || "",
        facilitator:        facilitator || "",
        bigIdea:            bigIdea || "",
        reflectionTitle:    reflectionTitle || "The Reflection",
        reflectionBody:     reflectionBody || "",
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
export async function postRecap(studyId, sessionId, uid, { summary, keyTakeaways, prayerIntentions, postedAt }) {
    await updateDoc(doc(db, "studies", studyId, "sessions", sessionId), {
        recap: {
            summary,
            keyTakeaways:     keyTakeaways     || [],
            prayerIntentions: prayerIntentions || [],
            postedAt:         postedAt         || serverTimestamp(),
            postedByUid:      uid,
        },
        updatedAt: serverTimestamp(),
    });
}

/**
 * Retrieves the participant data (answers, notes) for a specific user and session.
 */
export async function getParticipantData(studyId, sessionId, uid) {
    const snap = await getDoc(doc(db, "studies", studyId, "sessions", sessionId, "participantData", uid));
    if (!snap.exists()) return null;
    return snap.data();
}

/**
 * Updates participant data (answers, notes) for a specific user and session.
 */
export async function updateParticipantData(studyId, sessionId, uid, data) {
    const ref = doc(db, "studies", studyId, "sessions", sessionId, "participantData", uid);
    await setDoc(ref, {
        ...data,
        updatedAt: serverTimestamp()
    }, { merge: true });
}
