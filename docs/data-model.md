# Data Model Overview (Firestore)

## Top-Level Collections

### studies/{studyId}

Core Bible study group.

Fields:
- title  
- description  
- visibility  
- schedule { cadence, dayOfWeek, timeLocal, timezone }  
- startDate  
- meeting { mode, zoomUrl, locationName, address }  
- join { joinCode, requireApproval }  
- createdByUid  
- timestamps  

---

### joinCodes/{code}

Maps short code → studyId.

Used for fast `/join/:code` resolution.

---

### users/{uid} (optional but recommended)

Basic user profile + study references.

---

## Subcollections

### studies/{studyId}/members/{uid}

Tracks:
- role (leader, co_leader, member)  
- status (active, pending, removed)  
- joinedAt  

---

### studies/{studyId}/sessions/{sessionId}

Tracks:

**Before meeting**
- startsAt  
- passage.reference  
- agenda.questions[]  
- leaderNotes  

**After meeting**
- recap.summary  
- recap.keyTakeaways[]  
- recap.prayerIntentions[]  
- recap.postedAt  

---

## Design Philosophy

- **Study-centric structure**  
- **Simple reads for MVP**  
- **Expandable without migrations**  
- **Security-rule friendly**
