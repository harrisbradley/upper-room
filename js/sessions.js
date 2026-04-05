// js/sessions.js
// Firestore operations for sessions

/**
 * Returns all sessions for a study, ordered by `order` asc.
 */
async function listSessions(studyId) {
    const snap = await db.collection("studies").doc(studyId)
        .collection("sessions")
        .orderBy("order", "asc")
        .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Returns a single session document.
 */
async function getSession(studyId, sessionId) {
    const snap = await db.collection("studies").doc(studyId)
        .collection("sessions").doc(sessionId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Creates a new session in a study.
 * order uses Date.now() for simple append-to-bottom behavior.
 */
async function createSession(studyId, passageRef, questions) {
    const ref = await db.collection("studies").doc(studyId)
        .collection("sessions").add({
            order:       Date.now(),
            title:       passageRef || "New Session",
            scheduledAt: null,
            passage:     { reference: passageRef || "" },
            agenda:      { questions: questions || [], leaderNotes: "" },
            createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
        });
    return ref.id;
}

/**
 * Updates the editable fields of a session (scripture, questions, notes).
 */
async function updateSession(studyId, sessionId, { passageRef, questions, leaderNotes }) {
    await db.collection("studies").doc(studyId)
        .collection("sessions").doc(sessionId).update({
            title:              passageRef || "Session",
            "passage.reference": passageRef || "",
            "agenda.questions":  questions  || [],
            "agenda.leaderNotes": leaderNotes || "",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
}

/**
 * Posts a recap to a session document.
 */
async function postRecap(studyId, sessionId, uid, { summary, keyTakeaways, prayerIntentions }) {
    await db.collection("studies").doc(studyId)
        .collection("sessions").doc(sessionId).update({
            recap: {
                summary,
                keyTakeaways:     keyTakeaways     || [],
                prayerIntentions: prayerIntentions || [],
                postedAt:         firebase.firestore.FieldValue.serverTimestamp(),
                postedByUid:      uid,
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
}
