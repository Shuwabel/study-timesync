

# Updated Plan: Smart Daily Course Rotation

## The Problem
With 8 courses and 4 hours/day, the current algorithm tries to fit all 8 into every day (resulting in 30-min sessions). Instead, it should rotate courses across days — e.g., 2-3 courses per day with meaningful 1-2 hour sessions.

## Algorithm Change (in `timetableGenerator.ts`)

**New logic for daily course selection:**
1. Calculate `maxCoursesPerDay = Math.max(2, Math.floor(dailyHours / 1))` — at least 1 hour per course per day
2. Sort all active courses by urgency score (`difficulty / daysToExam`)
3. Each day, pick the top N courses (where N = maxCoursesPerDay) using a rotation system:
   - Highest-urgency courses appear more frequently (e.g., every day or every other day)
   - Lower-urgency courses rotate in on a cycle
4. Allocate the full `dailyHours` across only the selected 2-3 courses, giving meaningful session lengths (1-2h each)
5. After an exam passes, that course drops out and remaining courses get more frequent slots

**Example with 8 courses, 4h/day:**
- Day 1: Course A (2h), Course B (2h)
- Day 2: Course C (2h), Course D (2h)  
- Day 3: Course A (1.5h), Course E (1.5h), Course F (1h)
- Day 4: Course B (2h), Course G (1h), Course H (1h)
- Urgent courses (closer exams) appear more often in the rotation

## All Other Changes (Approved, Unchanged)
- Custom Logo component replacing GraduationCap
- Remove Priority step (auto-calculate from exam date + difficulty)
- Add timetable naming in Step 1
- Fix back button navigation
- Editable timetable view
- Post-exam reallocation
- `updateTimetable()` in storage

## Files Changed
Same list as before, with the key algorithmic change concentrated in `src/lib/timetableGenerator.ts`.

