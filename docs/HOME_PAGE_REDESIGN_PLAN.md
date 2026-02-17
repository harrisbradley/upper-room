# Home Page Redesign Plan

## Overview
Transform the current home page from a simple landing page into a dashboard that shows the user's existing Bible studies and allows them to create new ones, all with a proper header and logo.

## Current State Analysis

### Current Home Page (`src/app/page.tsx`)
- Simple centered layout with title "Upper Room"
- "Create a study" button that links to `/create`
- Join code input form
- No user authentication state management
- No study listing functionality

### Current Create Page (`src/app/create/page.tsx`)
- Separate page with form to create a study
- Redirects to `/created/[studyId]` after creation

### Data Structure
- Studies are stored in Firestore with `createdBy` field (user uid)
- Users authenticate anonymously via Firebase
- Studies have: `id`, `name`, `joinCode`, `createdAt`, `createdBy`

## Proposed Changes

### 1. Header Component with Logo
**File**: `src/components/layout/Header.tsx` (new)

**Features**:
- Temporary logo (text-based or simple SVG icon)
- App name "Upper Room"
- Clean, minimal design matching current UI style
- Responsive layout

**Design**:
```
┌─────────────────────────────────────┐
│ [Logo] Upper Room                   │
└─────────────────────────────────────┘
```

**Implementation**:
- Create reusable Header component
- Use temporary logo (could be a simple icon or styled text)
- Position at top of page
- Sticky or fixed positioning (optional)

### 2. New Service Function: Get User's Studies
**File**: `src/lib/services/studies.ts` (modify)

**New Function**: `getMyStudies(uid: string): Promise<Study[]>`

**Implementation**:
- Query Firestore `studies` collection where `createdBy === uid`
- Order by `createdAt` descending (newest first)
- Return array of Study objects
- Handle empty state (no studies yet)

**Firestore Query**:
```typescript
const q = query(
  collection(db, "studies"),
  where("createdBy", "==", uid),
  orderBy("createdAt", "desc")
);
```

### 3. Redesigned Home Page
**File**: `src/app/page.tsx` (major rewrite)

**New Layout Structure**:
```
┌─────────────────────────────────────┐
│ Header (Logo + App Name)            │
├─────────────────────────────────────┤
│                                      │
│  My Studies                          │
│  ┌─────────────────────────────┐   │
│  │ Study Card 1                │   │
│  │ [Name] [Join Code] [Actions]│   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Study Card 2                │   │
│  └─────────────────────────────┘   │
│                                      │
│  + Create New Study                  │
│  [Form appears inline or modal]      │
│                                      │
│  ─────────── or ───────────         │
│                                      │
│  Join with Code                      │
│  [Input field + Join button]         │
└─────────────────────────────────────┘
```

**Features**:
1. **Header Section**
   - Display Header component at top
   - Full-width, consistent across app

2. **My Studies Section**
   - Show list of studies created by current user
   - Display study name, join code, creation date
   - Clickable cards that navigate to study page
   - Empty state message if no studies exist
   - Loading state while fetching

3. **Create Study Section**
   - Inline form (or modal) to create new study
   - Study name input
   - Create button
   - Success: add to list and show success message
   - Error handling

4. **Join Study Section**
   - Keep existing join code functionality
   - Move to bottom or sidebar
   - Same input + button as current

**State Management**:
- `studies`: Array of user's studies
- `loading`: Loading state for studies
- `creating`: Loading state for create action
- `showCreateForm`: Toggle for create form visibility
- `joinCode`: Join code input value
- `joinError`: Join error message

**Authentication**:
- Ensure user is authenticated (anonymous) before loading studies
- Use `ensureAnonymousAuth()` on mount
- Handle auth state changes

### 4. Study Card Component
**File**: `src/components/StudyCard.tsx` (new)

**Features**:
- Display study name
- Display join code (with copy button)
- Display creation date (formatted)
- Click to navigate to study page
- Hover effects
- Responsive design

**Props**:
```typescript
{
  study: Study;
  onClick?: () => void;
}
```

**Design**:
- Card-based layout
- Study name as title
- Join code with copy icon
- Date formatted (e.g., "Created 2 days ago")
- Arrow or link indicator

### 5. Create Study Form Component
**File**: `src/components/CreateStudyForm.tsx` (new, optional)

**Features**:
- Reusable form component
- Can be used inline or in modal
- Study name input
- Create button
- Loading and error states

**OR**: Keep form inline in home page (simpler)

### 6. Temporary Logo
**Options**:
1. **Text-based**: Styled "UR" or "Upper Room" text
2. **Simple SVG**: Cross icon, book icon, or simple geometric shape
3. **Emoji**: 📖 or ✝️ (temporary)
4. **CSS-based**: Simple shape using CSS

**Recommendation**: Start with a simple SVG icon (book or cross) + text

**File**: `src/components/ui/Logo.tsx` (new)

## Implementation Steps

### Phase 1: Foundation
1. ✅ Create Header component with temporary logo
2. ✅ Add `getMyStudies()` function to `studies.ts`
3. ✅ Create StudyCard component
4. ✅ Update root layout to include header (or add to each page)

### Phase 2: Home Page Redesign
5. ✅ Rewrite `src/app/page.tsx`:
   - Add Header
   - Add authentication check
   - Fetch and display user's studies
   - Add create study form (inline)
   - Keep join code functionality
   - Add loading and empty states

### Phase 3: Integration & Polish
6. ✅ Test study creation flow
7. ✅ Test study navigation
8. ✅ Add copy-to-clipboard for join codes
9. ✅ Format dates nicely
10. ✅ Add responsive design checks
11. ✅ Handle edge cases (no auth, network errors)

### Phase 4: Optional Enhancements
12. ⏸️ Add search/filter for studies
13. ⏸️ Add study deletion
14. ⏸️ Add study editing
15. ⏸️ Add modal for create form (instead of inline)
16. ⏸️ Add animations/transitions

## Technical Considerations

### Firestore Security Rules
- Ensure `getMyStudies()` query is allowed by security rules
- Query uses `where("createdBy", "==", uid)` which should be secure

### Performance
- Studies list should be relatively small per user
- Consider pagination if users create many studies (future)
- Use Firestore real-time listeners for live updates (optional)

### Authentication
- Use `ensureAnonymousAuth()` to get stable user ID
- Handle case where user isn't authenticated yet
- Consider showing loading state during auth

### Navigation
- Study cards link to `/s/[studyId]` (existing route)
- Create study redirects to `/created/[studyId]` (existing route)
- Or: redirect to home page and show success message

### Responsive Design
- Header: Stack on mobile, horizontal on desktop
- Study cards: 1 column on mobile, 2-3 columns on desktop
- Create form: Full width on mobile, centered on desktop

## File Structure

```
src/
├── app/
│   ├── page.tsx                    (MAJOR REWRITE)
│   └── layout.tsx                   (MINOR: add header if global)
├── components/
│   ├── layout/
│   │   └── Header.tsx              (NEW)
│   ├── ui/
│   │   └── Logo.tsx                (NEW - temporary logo)
│   ├── StudyCard.tsx               (NEW)
│   └── CreateStudyForm.tsx         (NEW - optional)
└── lib/
    └── services/
        └── studies.ts              (MODIFY: add getMyStudies)
```

## Design Mockup (Text)

```
┌─────────────────────────────────────────────────────┐
│ [📖] Upper Room                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  My Studies                                          │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ Romans Small Group                           │  │
│  │ Join Code: ABC123  [📋 Copy]                 │  │
│  │ Created 3 days ago                            │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ John's Bible Study                           │  │
│  │ Join Code: XYZ789  [📋 Copy]                 │  │
│  │ Created 1 week ago                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ + Create New Study                            │  │
│  │                                               │  │
│  │ Study name: [________________]                │  │
│  │ [Create Study]                                │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ──────────────── or ────────────────              │
│                                                      │
│  Have a join code?                                 │
│  [Enter code: _____] [Join]                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Success Criteria

- ✅ User can see all their created studies on home page
- ✅ User can create a new study from home page
- ✅ User can join a study with code (existing functionality preserved)
- ✅ Header with logo appears on home page
- ✅ Study cards are clickable and navigate correctly
- ✅ Loading and empty states are handled gracefully
- ✅ Responsive design works on mobile and desktop
- ✅ No breaking changes to existing routes

## Next Steps

1. Review and approve this plan
2. Start with Phase 1 (Foundation)
3. Iterate through phases
4. Test thoroughly
5. Deploy

## Questions to Consider

1. **Create Form**: Inline or modal? (Recommendation: Start inline, can refactor to modal later)
2. **After Creating**: Redirect to `/created/[studyId]` or stay on home page? (Recommendation: Stay on home, show success message)
3. **Logo Design**: What style do you prefer? (We'll start with simple SVG)
4. **Study Cards**: Show all info or summary? (Recommendation: Summary with click for details)
5. **Empty State**: What message when user has no studies? (Recommendation: Friendly message + create CTA)
