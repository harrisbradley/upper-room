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
    const leaderData = {
        role:     "leader",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (user.displayName) {
        leaderData.displayName = user.displayName;
    } else if (user.email) {
        leaderData.displayName = user.email;
    } else {
        leaderData.displayName = "Leader";
    }
    await db.collection(STUDIES).doc(studyId)
        .collection("members").doc(user.uid).set(leaderData);

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
        archived:  d.archived  || false,
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
                archived:  data.archived  || false,
            };
        })
        .filter(s => !s.archived) // Hide archived studies from the main dashboard
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
async function joinStudy(studyId, displayName) {
    const user    = await ensureAnonymousAuth();
    const ref     = db.collection(STUDIES).doc(studyId).collection("members").doc(user.uid);
    const snap    = await ref.get();
    
    // We update name even if member already exists (merge name updates)
    const data = {
        role:     "member",
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (displayName) {
        data.displayName = displayName.trim();
    }
    await ref.set(data, { merge: true });
}

/**
 * Retrieve all members (attendees) for a study, sorted by joinedAt.
 */
async function getStudyMembers(studyId) {
    const snap = await db.collection(STUDIES).doc(studyId)
        .collection("members").get();
    return snap.docs
        .map(d => {
            const data = d.data();
            return {
                uid:       d.id,
                role:      data.role || "member",
                joinedAt:  data.joinedAt || null,
                displayName: data.displayName || "",
            };
        })
        .sort((a, b) => {
            const ta = a.joinedAt ? a.joinedAt.toMillis() : 0;
            const tb = b.joinedAt ? b.joinedAt.toMillis() : 0;
            return ta - tb; // oldest first (chronological roster)
        });
}

/**
 * Update the study name.
 */
async function updateStudyName(studyId, newName) {
    await db.collection(STUDIES).doc(studyId).update({
        name: newName,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Archive a study (soft delete, hides from active dashboard).
 */
async function archiveStudy(studyId) {
    await db.collection(STUDIES).doc(studyId).update({
        archived: true,
        archivedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Delete a study, its join code mapping, and all its sessions and members.
 */
async function deleteStudy(studyId) {
    const study = await getStudy(studyId);
    const joinCode = study ? study.joinCode : null;

    // Fetch all subcollection docs to delete in a batch
    const sessionsSnap = await db.collection(STUDIES).doc(studyId).collection("sessions").get();
    const membersSnap = await db.collection(STUDIES).doc(studyId).collection("members").get();

    const batch = db.batch();

    // Delete sessions
    sessionsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    // Delete members
    membersSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    // Delete join code mapping if it exists
    if (joinCode) {
        batch.delete(db.collection(JOIN_CODES).doc(joinCode));
    }

    // Delete primary study document
    batch.delete(db.collection(STUDIES).doc(studyId));

    await batch.commit();
}

