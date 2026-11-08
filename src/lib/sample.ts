import { addDays } from 'date-fns';
import { generateTimetable } from './timetableGenerator';
import type { Course, Timetable } from './types';

/** A ready-made plan so a first-time visitor can try every screen. */
export function createSamplePlan(now: Date = new Date()): Timetable {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const courses: Course[] = [
    { id: 'sample-1', name: 'Calculus II', colorIndex: 0, examDate: addDays(midnight, 12), noExam: false, priority: 0, difficulty: 4 },
    { id: 'sample-2', name: 'Organic Chemistry', colorIndex: 1, examDate: addDays(midnight, 17), noExam: false, priority: 1, difficulty: 5 },
    { id: 'sample-3', name: 'Modern History', colorIndex: 2, examDate: addDays(midnight, 21), noExam: false, priority: 2, difficulty: 3 },
  ];
  const plan = generateTimetable(courses, 4, 'Afternoon', [], midnight, 'Sample: finals');
  return { ...plan, description: 'A sample plan to look around. Delete it any time.' };
}
