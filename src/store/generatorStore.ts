import { create } from 'zustand';
import { GeneratorState, Course } from '@/lib/types';

let courseCounter = 0;
const createCourse = (index: number): Course => ({
  id: `course-${++courseCounter}`,
  name: '',
  colorIndex: index % 15,
  noExam: false,
  priority: index,
  difficulty: 3,
});

export const useGeneratorStore = create<GeneratorState>((set) => ({
  step: 1,
  courses: [createCourse(0), createCourse(1), createCourse(2)],
  timetableName: '',
  timetableDescription: '',
  dailyHours: 4,
  timePreference: 'Flexible',
  restDays: ['Sunday'],
  startDate: new Date(),

  setStep: (step) => set({ step }),
  setCourses: (courses) => set({ courses }),

  updateCourse: (id, data) =>
    set((s) => ({
      courses: s.courses.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  addCourse: () =>
    set((s) => ({
      courses: [...s.courses, createCourse(s.courses.length)],
    })),

  removeCourse: (id) =>
    set((s) => ({
      courses: s.courses.filter((c) => c.id !== id),
    })),

  setCourseCount: (count) =>
    set((s) => {
      if (count > s.courses.length) {
        const newCourses = [...s.courses];
        for (let i = s.courses.length; i < count; i++) {
          newCourses.push(createCourse(i));
        }
        return { courses: newCourses };
      }
      return { courses: s.courses.slice(0, count) };
    }),

  setTimetableName: (timetableName) => set({ timetableName }),
  setTimetableDescription: (timetableDescription) => set({ timetableDescription }),
  setDailyHours: (dailyHours) => set({ dailyHours }),
  setTimePreference: (timePreference) => set({ timePreference }),
  setRestDays: (restDays) => set({ restDays }),
  setStartDate: (startDate) => set({ startDate }),

  reset: () => {
    courseCounter = 0;
    set({
      step: 1,
      courses: [createCourse(0), createCourse(1), createCourse(2)],
      timetableName: '',
      timetableDescription: '',
      dailyHours: 4,
      timePreference: 'Flexible',
      restDays: ['Sunday'],
      startDate: new Date(),
    });
  },
}));
