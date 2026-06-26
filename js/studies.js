// js/studies.js
// Firestore operations for studies

import { db } from "./firebase-config.js";
import { 
    ensureAnonymousAuth, 
    getUserProfile, 
    registerUserStudy 
} from "./auth.js";
import { 
    doc, 
    collection, 
    addDoc, 
    getDoc, 
    setDoc, 
    getDocs, 
    updateDoc, 
    query, 
    where, 
    writeBatch, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
export async function createStudy(studyName) {
    const user = await ensureAnonymousAuth();

    // Generate a unique join code
    let joinCode = randomJoinCode();
    while ((await getDoc(doc(db, JOIN_CODES, joinCode))).exists()) {
        joinCode = randomJoinCode();
    }

    // Create study document
    const studyRef = doc(collection(db, STUDIES));
    const studyId  = studyRef.id;

    await setDoc(studyRef, {
        name:      studyName,
        joinCode,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
    });

    // Create first session
    const sessionRef = await addDoc(collection(db, STUDIES, studyId, "sessions"), {
        title:       "Session 1",
        scheduledAt: null,
        order:       0,
        passage:     { reference: "" },
        agenda:      { questions: [], leaderNotes: "" },
        createdAt:   serverTimestamp(),
    });

    // Record leader membership
    let displayName = "Leader";
    if (!user.isAnonymous) {
        try {
            const profile = await getUserProfile(user.uid);
            if (profile && profile.displayName) {
                displayName = profile.displayName;
            } else if (user.displayName) {
                displayName = user.displayName;
            } else if (user.email) {
                displayName = user.email;
            }
        } catch (e) {
            console.error("Failed to fetch user profile for leader name", e);
            if (user.displayName) displayName = user.displayName;
            else if (user.email) displayName = user.email;
        }
    } else {
        if (user.displayName) displayName = user.displayName;
        else if (user.email) displayName = user.email;
    }

    const leaderData = {
        role:        "leader",
        joinedAt:    serverTimestamp(),
        displayName: displayName,
    };
    await setDoc(doc(db, STUDIES, studyId, "members", user.uid), leaderData);

    // Save join code mapping
    await setDoc(doc(db, JOIN_CODES, joinCode), {
        studyId,
        createdAt: serverTimestamp(),
    });

    // Also register on user profile if logged in
    if (!user.isAnonymous) {
        await registerUserStudy(user.uid, studyId, studyName, "leader");
    }

    return { studyId, joinCode, firstSessionId: sessionRef.id };
}

/** Load a single study by ID. Returns null if not found. */
export async function getStudy(studyId) {
    const snap = await getDoc(doc(db, STUDIES, studyId));
    if (!snap.exists()) return null;
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
export async function getMyStudies(uid) {
    // No orderBy here — avoids requiring a composite Firestore index.
    // Sort by createdAt client-side instead (newest first).
    const q = query(collection(db, STUDIES), where("createdBy", "==", uid));
    const snap = await getDocs(q);
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
            const ta = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
            const tb = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
            return tb - ta; // newest first
        });
}

/**
 * Returns the current user's role in a study: "leader", "member", or null.
 */
export async function getMyRole(studyId, uid) {
    const snap = await getDoc(doc(db, STUDIES, studyId, "members", uid));
    if (snap.exists()) {
        return snap.data().role || null;
    }
    // Fallback: if they created the study, they are a leader
    try {
        const study = await getStudy(studyId);
        if (study && study.createdBy === uid) {
            return "leader";
        }
    } catch (e) {
        console.error("Failed to load study for role fallback check", e);
    }
    return null;
}

/**
 * Resolves a join code string to a studyId. Returns null if not found.
 */
export async function resolveJoinCode(code) {
    const normalized = code.toUpperCase().trim();
    const snap = await getDoc(doc(db, JOIN_CODES, normalized));
    if (!snap.exists()) return null;
    return snap.data().studyId || null;
}

/**
 * Joins the current user as a member of a study (idempotent).
 */
export async function joinStudy(studyId, displayName) {
    const user    = await ensureAnonymousAuth();
    const ref     = doc(db, STUDIES, studyId, "members", user.uid);
    
    // We update name even if member already exists (merge name updates)
    const data = {
        role:     "member",
        joinedAt: serverTimestamp(),
    };
    if (displayName) {
        data.displayName = displayName.trim();
    }
    await setDoc(ref, data, { merge: true });

    // Also register on user profile if logged in
    if (!user.isAnonymous) {
        const study = await getStudy(studyId);
        const studyName = study ? study.name : "Bible Study";
        await registerUserStudy(user.uid, studyId, studyName, "member");
    }
}

/**
 * Retrieve all members (attendees) for a study, sorted by joinedAt.
 */
export async function getStudyMembers(studyId) {
    const snap = await getDocs(collection(db, STUDIES, studyId, "members"));
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
            const ta = a.joinedAt ? (a.joinedAt.toMillis ? a.joinedAt.toMillis() : new Date(a.joinedAt).getTime()) : 0;
            const tb = b.joinedAt ? (b.joinedAt.toMillis ? b.joinedAt.toMillis() : new Date(b.joinedAt).getTime()) : 0;
            return ta - tb; // oldest first (chronological roster)
        });
}

/**
 * Update the study name.
 */
export async function updateStudyName(studyId, newName) {
    await updateDoc(doc(db, STUDIES, studyId), {
        name: newName,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Archive a study (soft delete, hides from active dashboard).
 */
export async function archiveStudy(studyId) {
    await updateDoc(doc(db, STUDIES, studyId), {
        archived: true,
        archivedAt: serverTimestamp(),
    });
}

/**
 * Delete a study, its join code mapping, and all its sessions and members.
 */
export async function deleteStudy(studyId) {
    const study = await getStudy(studyId);
    const joinCode = study ? study.joinCode : null;

    // Fetch all subcollection docs to delete in a batch
    const sessionsSnap = await getDocs(collection(db, STUDIES, studyId, "sessions"));
    const membersSnap = await getDocs(collection(db, STUDIES, studyId, "members"));

    const batch = writeBatch(db);

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
        batch.delete(doc(db, JOIN_CODES, joinCode));
    }

    // Delete primary study document
    batch.delete(doc(db, STUDIES, studyId));

    await batch.commit();
}

/**
 * Promotes a member to leader role (co-leader).
 */
export async function promoteToLeader(studyId, memberUid) {
    // 1. Update in the study members subcollection
    const memberRef = doc(db, STUDIES, studyId, "members", memberUid);
    await updateDoc(memberRef, { role: "leader" });

    // 2. Also update in the user's profile document if it exists
    const userRef = doc(db, "users", memberUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.studies && data.studies[studyId]) {
            await updateDoc(userRef, {
                [`studies.${studyId}.role`]: "leader"
            });
        }
    }
}

/**
 * Demotes a leader back to member role.
 */
export async function demoteToMember(studyId, memberUid) {
    // 1. Update in the study members subcollection
    const memberRef = doc(db, STUDIES, studyId, "members", memberUid);
    await updateDoc(memberRef, { role: "member" });

    // 2. Also update in the user's profile document if it exists
    const userRef = doc(db, "users", memberUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.studies && data.studies[studyId]) {
            await updateDoc(userRef, {
                [`studies.${studyId}.role`]: "member"
            });
        }
    }
}
