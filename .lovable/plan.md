

# Plan: Validation, Auto-Close Calendar, and Timetable View Improvements

## Changes

### 1. Duplicate Course Name Validation (StepCourses.tsx + Generate.tsx)
- In `StepCourses.tsx`, detect duplicate names (case-insensitive) and show a red error message below the duplicate input fields
- In `Generate.tsx`, update `canNext()` for step 1 to also check for duplicate course names — disable Next button if duplicates exist

### 2. Auto-Close Date Picker on Selection (StepExamDates.tsx)
- Convert each `Popover` to a controlled component with `open` state
- On date selection (`onSelect`), set the date AND close the popover automatically

### 3. Exam Date Validation — Block Next Without Dates (Generate.tsx + StepExamDates.tsx)
- In `Generate.tsx`, update `canNext()` for step 2: every course must either have an `examDate` set OR have `noExam` checked
- Show a red error banner at the top of `StepExamDates.tsx` when the user tries to proceed without completing all dates (track with a local "attempted" state, or simply show the error when any course is missing both date and noExam)

### 4. Timetable Calendar View Improvements (TimetableView.tsx)
- Add total daily hours summary per day column
- Show course color legend below the calendar
- Display the session tip on hover or as a small subtitle
- Add rest day visual indicator (greyed out columns)
- Improve session card to show start time more prominently

## Files Changed
| File | Change |
|------|--------|
| `src/components/generator/StepCourses.tsx` | Add duplicate name detection with red error text |
| `src/components/generator/StepExamDates.tsx` | Controlled Popover that auto-closes on date pick |
| `src/pages/Generate.tsx` | Enhanced `canNext()` for steps 1 (duplicates) and 2 (missing dates), show error toasts on blocked Next |
| `src/pages/TimetableView.tsx` | Richer calendar cells with daily totals, legend, and better session detail |

