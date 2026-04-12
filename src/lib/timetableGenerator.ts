import { Course, StudySession, Timetable } from './types';
import { addDays, format, differenceInDays, isBefore } from 'date-fns';
import { SESSION_TYPES } from './constants';

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

function getTimeSlot(pref: string): string {
  switch (pref) {
    case 'Morning': return '08:00';
    case 'Afternoon': return '13:00';
    case 'Evening': return '18:00';
    default: return '09:00';
  }
}

export function generateTimetable(
  courses: Course[],
  dailyHours: number,
  timePreference: string,
  restDays: string[],
  startDate: Date
): Timetable {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const sorted = [...courses].sort((a, b) => a.priority - b.priority);

  // Calculate weights based on priority + difficulty
  const totalWeight = sorted.reduce((sum, c, i) => {
    const priorityWeight = sorted.length - i;
    return sum + priorityWeight * c.difficulty;
  }, 0);

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

  while (isBefore(currentDate, endDate)) {
    const dayName = dayNames[currentDate.getDay()];
    if (restDays.includes(dayName)) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    let remainingHours = dailyHours;
    const startTime = getTimeSlot(timePreference);

    for (const course of sorted) {
      if (remainingHours <= 0) break;

      // Skip if exam already passed
      if (course.examDate && !course.noExam) {
        const examD = new Date(course.examDate);
        if (isBefore(examD, currentDate)) continue;
      }

      const priorityWeight = sorted.length - course.priority;
      const weight = (priorityWeight * course.difficulty) / totalWeight;
      let hours = Math.max(0.5, Math.round(dailyHours * weight * 2) / 2);
      hours = Math.min(hours, remainingHours, 3); // cap at 3h per course per day

      if (hours < 0.5) continue;

      // Determine session type based on days to exam
      let sessionType: 'Focus' | 'Review' | 'Practice' = 'Focus';
      if (course.examDate && !course.noExam) {
        const daysLeft = differenceInDays(new Date(course.examDate), currentDate);
        if (daysLeft <= 3) sessionType = 'Practice';
        else if (daysLeft <= 7) sessionType = 'Review';
      } else {
        const daysSinceStart = differenceInDays(currentDate, startDate);
        const types = SESSION_TYPES as readonly string[];
        sessionType = types[daysSinceStart % 3] as any;
      }

      const currentHour = parseInt(startTime.split(':')[0]) +
        (dailyHours - remainingHours);

      sessions.push({
        id: `session-${++sessionCounter}`,
        courseId: course.id,
        courseName: course.name || `Course ${course.colorIndex + 1}`,
        colorIndex: course.colorIndex,
        date: format(currentDate, 'yyyy-MM-dd'),
        startTime: `${String(Math.min(23, Math.floor(currentHour))).padStart(2, '0')}:00`,
        duration: hours,
        sessionType,
        tip: getRandomTip(sessionType),
      });

      remainingHours -= hours;
    }

    currentDate = addDays(currentDate, 1);
  }

  const id = `tt-${Date.now()}`;
  return {
    id,
    title: courses
      .filter((c) => c.name)
      .map((c) => c.name)
      .slice(0, 3)
      .join(', ') + (courses.length > 3 ? '...' : '') || 'Study Timetable',
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
