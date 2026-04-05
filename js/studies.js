// js/studies.js
// Firestore operations for studies

const STUDIES    = "studies";
const JOIN_CODES = "joinCodes";

function randomJoinCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Ensures anonymous auth, then creates:
 *   studies/{studyId}                      — study doc
 *   studies/{studyId}/members/{uid}         — leader membership
 *   studies/{studyId}/sessions/{sessionId}  — first session
 *   joinCodes/{code}                        — join code mapping
 */
async function createStudy(studyName) {
    const user = await ensureAnonymousAuth();

    // Generate a unique join code
    let joinCode = randomJoinCode();
    while ((await db.collection(JOIN_CODES).doc(joinCode).get()).exists) {
        joinCode = randomJoinCode();
    }

    // Create study document
    const studyRef = db.collection(STUDIES).doc();
    const studyId  = studyRef.id;

    await studyRef.set({
        name:      studyName,
        joinCode,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
    });

    // Create first session
    const sessionRef = await db.collection(STUDIES).doc(studyId)
        .collection("sessions").add({
            title:       "Session 1",
            scheduledAt: null,
            order:       0,
            passage:     { reference: "" },
            agenda:      { questions: [], leaderNotes: "" },
            createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        });

    // Record leader membership
    await db.collection(STUDIES).doc(studyId)
        .collection("members").doc(user.uid).set({
            role:     "leader",
            joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

    // Save join code mapping
    await db.collection(JOIN_CODES).doc(joinCode).set({
        studyId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    return { studyId, joinCode, firstSessionId: sessionRef.id };
}

/** Load a single study by ID. Returns null if not found. */
async function getStudy(studyId) {
    const snap = await db.collection(STUDIES).doc(studyId).get();
    if (!snap.exists) return null;
    const d = snap.data();
    return {
        id:        snap.id,
        name:      d.name      || "",
        joinCode:  d.joinCode  || "",
        createdAt: d.createdAt || null,
        createdBy: d.createdBy || "",
    };
}

/** Load all studies created by the given uid. */
async function getMyStudies(uid) {
    // No orderBy here — avoids requiring a composite Firestore index.
    // Sort by createdAt client-side instead (newest first).
    const snap = await db.collection(STUDIES)
        .where("createdBy", "==", uid)
        .get();
    return snap.docs
        .map(d => {
            const data = d.data();
            return {
                id:        d.id,
                name:      data.name      || "",
                joinCode:  data.joinCode  || "",
                createdAt: data.createdAt || null,
                createdBy: data.createdBy || "",
            };
        })
        .sort((a, b) => {
            const ta = a.createdAt ? a.createdAt.toMillis() : 0;
            const tb = b.createdAt ? b.createdAt.toMillis() : 0;
            return tb - ta; // newest first
        });
}

/**
 * Returns the current user's role in a study: "leader", "member", or null.
 */
async function getMyRole(studyId, uid) {
    const snap = await db.collection(STUDIES).doc(studyId)
        .collection("members").doc(uid).get();
    if (!snap.exists) return null;
    return snap.data().role || null;
}

/**
 * Resolves a join code string to a studyId. Returns null if not found.
 */
async function resolveJoinCode(code) {
    const normalized = code.toUpperCase().trim();
    const snap = await db.collection(JOIN_CODES).doc(normalized).get();
    if (!snap.exists) return null;
    return snap.data().studyId || null;
}

/**
 * Joins the current user as a member of a study (idempotent).
 */
async function joinStudy(studyId) {
    const user    = await ensureAnonymousAuth();
    const ref     = db.collection(STUDIES).doc(studyId).collection("members").doc(user.uid);
    const snap    = await ref.get();
    if (snap.exists) return;
    await ref.set({
        role:     "member",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}
