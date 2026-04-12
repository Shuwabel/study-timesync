
# StudySync MVP — Full Build Plan

## Overview
Build StudySync, an AI-powered study timetable generator, as a single-page React app with multiple routes. Uses mock AI (algorithmic generation) and no auth for now.

## Pages to Build

### 1. Landing Page (`/`)
- **Hero section** with headline "Your exams. Your pace. Your plan.", subheadline, animated gradient background, CTA button → `/generate`
- **How It Works** — 4 numbered icon cards (Enter courses → Set dates → Set preferences → Get timetable)
- **Features section** — icon grid: AI-generated, difficulty-aware, exportable, editable
- **Footer** with logo, copyright, links

### 2. Generator Page (`/generate`) — 6-Step Multi-Step Form
State managed with Zustand store. Step indicator with progress bar at top.

- **Step 1 — Courses**: Number stepper (1–15), dynamic course name inputs with auto-assigned color dots, animated row entry
- **Step 2 — Exam Dates**: Date picker per course, "no fixed exam" checkbox, live "X days away" counter, past-date validation
- **Step 3 — Priority**: Drag-and-drop reorder list (using @dnd-kit), pre-sorted by exam date, shows course color + days remaining
- **Step 4 — Difficulty**: 1–5 star/dot rating per course, default 3, descriptive labels
- **Step 5 — Availability**: Hours slider (0.5–12), preferred time radio (Morning/Afternoon/Evening/Flexible), rest day toggle buttons (Mon–Sun), start date picker
- **Step 6 — Review**: Summary cards for all inputs, edit links per section, large "Generate My Timetable" button with loading overlay

### 3. Timetable View (`/timetable/:id`)
- **Calendar view** (default): Weekly grid with color-coded study session blocks
- **List view**: Day-by-day chronological list (mobile-friendly)
- Each session shows: course name + color, duration, session type (Focus/Review/Practice), AI tip
- **Export toolbar**: Download PDF (jsPDF), Add to Calendar (.ics), Copy shareable link
- Save prompt banner (non-blocking, for future auth)

### 4. Dashboard (`/dashboard`)
- Grid of saved timetable cards (stored in localStorage for now)
- Each card: title, date created, course count, quick actions (View, Delete)
- Empty state with illustration and CTA
- "Create New Timetable" button

### 5. Custom 404 Page
- Styled consistently with app theme

## Mock AI Timetable Generation
- Algorithmic scheduler that distributes study hours based on priority, difficulty, available days, and rest days
- Front-loads harder/higher-priority courses
- Respects daily hours cap and rest days
- Generates session types (Focus, Review, Practice) and placeholder tips
- Returns same JSON structure as the doc specifies, making it easy to swap in real AI later

## Design System
- **Theme**: Clean indigo/electric blue accent on white, mobile-first
- **Animations**: Framer Motion for step transitions and micro-interactions
- **Components**: shadcn/ui base, Lucide icons
- **Typography**: Inter font
- **Course colors**: Preset palette auto-assigned (indigo, green, amber, rose, cyan, purple, orange, teal, pink, blue, lime, red, fuchsia, emerald, sky)

## State Management
- Zustand store for generator form state (persists across steps)
- localStorage for saving timetables (until auth/DB is added)

## Key Libraries to Add
- `zustand` — form state management
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag-and-drop priority ranking
- `framer-motion` — animations
- `date-fns` — date utilities
- `jspdf` — PDF export
- `ics` — calendar export
- `lucide-react` — icons (already available)
