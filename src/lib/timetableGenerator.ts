import { Course, StudySession, Timetable } from './types';
import { addDays, format, differenceInDays, isBefore } from 'date-fns';
import { dayKey, examDayKey } from './schedule';

const TIPS = {
  Focus: [
    'Eliminate distractions and study in 25-min Pomodoro blocks.',
    'Start with the hardest concepts while your mind is fresh.',
    'Write summary notes as you read through the material.',
    'Try teaching the concepts to an imaginary student.',
  ],
  Review: [
    'Use flashcards to test your recall on key terms.',
    'Go through your notes and highlight unclear areas.',
    'Try practice questions from past papers.',
    'Create mind maps connecting related concepts.',
  ],
  Practice: [
    'Work through sample problems without looking at solutions.',
    'Time yourself to simulate exam conditions.',
    'Focus on question types you find challenging.',
    'Review mistakes carefully — they reveal gaps in understanding.',
  ],
};

function getRandomTip(type: 'Focus' | 'Review' | 'Practice'): string {
  const tips = TIPS[type];
  return tips[Math.floor(Math.random() * tips.length)];
}

function getTimeSlot(pref: string): number {
  switch (pref) {
    case 'Morning': return 8;
    case 'Afternoon': return 13;
    case 'Evening': return 18;
    default: return 9;
  }
}

/** Auto-calculate urgency score: higher = more urgent */
function getUrgencyScore(course: Course, currentDate: Date): number {
  if (course.noExam || !course.examDate) {
    // No exam → low baseline urgency, scaled by difficulty
    return course.difficulty * 0.1;
  }
  const daysLeft = Math.max(1, differenceInDays(new Date(course.examDate), currentDate));
  return course.difficulty / daysLeft;
}

/** Determine session type based on days to exam */
function getSessionType(course: Course, currentDate: Date, startDate: Date): 'Focus' | 'Review' | 'Practice' {
  if (course.examDate && !course.noExam) {
    const daysLeft = differenceInDays(new Date(course.examDate), currentDate);
    if (daysLeft <= 3) return 'Practice';
    if (daysLeft <= 7) return 'Review';
    return 'Focus';
  }
  const daysSinceStart = differenceInDays(currentDate, startDate);
  const types: ('Focus' | 'Review' | 'Practice')[] = ['Focus', 'Review', 'Practice'];
  return types[daysSinceStart % 3];
}

/** Round to nearest 15 minutes (in hours) */
function roundTo15(hours: number): number {
  return Math.round(hours * 4) / 4;
}

export function generateTimetable(
  courses: Course[],
  dailyHours: number,
  timePreference: string,
  restDays: string[],
  startDate: Date,
  timetableName?: string,
  timetableDescription?: string
): Timetable {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Determine end date — latest exam or 4 weeks from start
  let endDate = addDays(startDate, 28);
  const examCourses = courses.filter((c) => c.examDate && !c.noExam);
  if (examCourses.length > 0) {
    const latestExam = examCourses.reduce((latest, c) => {
      const d = new Date(c.examDate!);
      return d > latest ? d : latest;
    }, new Date(0));
    if (latestExam > endDate) endDate = latestExam;
  }

  const sessions: StudySession[] = [];
  let sessionCounter = 0;
  let currentDate = new Date(startDate);

  // Track how many days since each course was last studied (for rotation fairness)
  const lastStudied: Record<string, number> = {};
  courses.forEach((c) => { lastStudied[c.id] = -999; });
  let dayIndex = 0;

  while (isBefore(currentDate, endDate)) {
    const dayName = dayNames[currentDate.getDay()];
    if (restDays.includes(dayName)) {
      currentDate = addDays(currentDate, 1);
      dayIndex++;
      continue;
    }

    // 1. Get active courses (exam not yet passed)
    // A course stops being studied on the day of its exam.
    const today = dayKey(currentDate);
    const activeCourses = courses.filter((c) => {
      const exam = examDayKey(c);
      return exam === null || exam > today;
    });

    if (activeCourses.length === 0) {
      currentDate = addDays(currentDate, 1);
      dayIndex++;
      continue;
    }

    // 2. Calculate max courses per day — at least 1h per course
    const maxCoursesPerDay = Math.max(2, Math.floor(dailyHours / 1));
    const coursesToday = Math.min(activeCourses.length, maxCoursesPerDay);

    // 3. Score each active course by urgency + days since last studied
    const scored = activeCourses.map((c) => {
      const urgency = getUrgencyScore(c, currentDate);
      const daysSinceLast = dayIndex - (lastStudied[c.id] ?? -999);
      // Boost courses that haven't been studied recently
      const rotationBoost = Math.min(daysSinceLast * 0.5, 3);
      return { course: c, score: urgency + rotationBoost };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick top N courses for today
    const todaysCourses = scored.slice(0, coursesToday).map((s) => s.course);

    // 4. Allocate dailyHours proportionally among today's courses
    const totalUrgency = todaysCourses.reduce((sum, c) => sum + getUrgencyScore(c, currentDate), 0);
    let remainingHours = dailyHours;
    const allocations: { course: Course; hours: number }[] = [];

    for (let i = 0; i < todaysCourses.length; i++) {
      const c = todaysCourses[i];
      const isLast = i === todaysCourses.length - 1;

      let hours: number;
      if (totalUrgency > 0) {
        const proportion = getUrgencyScore(c, currentDate) / totalUrgency;
        hours = roundTo15(dailyHours * proportion);
      } else {
        hours = roundTo15(dailyHours / todaysCourses.length);
      }

      // Clamp: min 0.5h, max 3h, and don't exceed remaining
      hours = Math.max(0.5, Math.min(hours, 3, remainingHours));

      // Last course gets all remaining time
      if (isLast) {
        hours = Math.max(0.5, Math.min(remainingHours, 3));
        // If there's still leftover after capping at 3, it's lost (rare edge case)
      }

      allocations.push({ course: c, hours });
      remainingHours -= hours;
    }

    // Distribute any leftover (from 3h cap) to courses under 3h
    if (remainingHours > 0.25) {
      for (const alloc of allocations) {
        if (remainingHours <= 0.25) break;
        const canAdd = 3 - alloc.hours;
        if (canAdd > 0) {
          const add = Math.min(roundTo15(canAdd), roundTo15(remainingHours));
          alloc.hours += add;
          remainingHours -= add;
        }
      }
    }

    // 5. Create sessions
    // Start earlier on long days so the last session still ends before 23:00.
    const dayTotal = allocations.reduce((sum, a) => sum + (a.hours >= 0.5 ? a.hours : 0), 0);
    const startHour = Math.max(5, Math.min(getTimeSlot(timePreference), 23 - dayTotal));
    let currentHour = startHour;

    for (const { course, hours } of allocations) {
      if (hours < 0.5) continue;

      const sessionType = getSessionType(course, currentDate, startDate);
      const hourInt = Math.min(23, Math.floor(currentHour));
      const minInt = Math.round((currentHour % 1) * 60);

      sessions.push({
        id: `session-${++sessionCounter}`,
        courseId: course.id,
        courseName: course.name || `Course ${course.colorIndex + 1}`,
        colorIndex: course.colorIndex,
        date: format(currentDate, 'yyyy-MM-dd'),
        startTime: `${String(hourInt).padStart(2, '0')}:${String(minInt).padStart(2, '0')}`,
        duration: hours,
        sessionType,
        tip: getRandomTip(sessionType),
      });

      lastStudied[course.id] = dayIndex;
      currentHour += hours;
    }

    currentDate = addDays(currentDate, 1);
    dayIndex++;
  }

  // Auto-generate title
  const title = timetableName?.trim() ||
    courses
      .filter((c) => c.name)
      .map((c) => c.name)
      .slice(0, 3)
      .join(', ') + (courses.length > 3 ? '...' : '') || 'Study Timetable';

  return {
    id: `tt-${Date.now()}`,
    title,
    description: timetableDescription?.trim() || undefined,
    createdAt: new Date().toISOString(),
    courses,
    sessions,
    preferences: {
      dailyHours,
      timePreference,
      restDays,
      startDate: format(startDate, 'yyyy-MM-dd'),
    },
  };
}
