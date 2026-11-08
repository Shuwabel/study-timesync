export interface Course {
  id: string;
  name: string;
  colorIndex: number;
  examDate?: Date;
  noExam: boolean;
  priority: number; // auto-calculated
  difficulty: number;
}

export interface StudySession {
  id: string;
  courseId: string;
  courseName: string;
  colorIndex: number;
  date: string;
  startTime: string;
  duration: number;
  sessionType: 'Focus' | 'Review' | 'Practice';
  tip: string;
  /** Absent means planned and not yet handled. */
  status?: 'done' | 'skipped';
}

export interface Timetable {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  courses: Course[];
  sessions: StudySession[];
  preferences: {
    dailyHours: number;
    timePreference: string;
    restDays: string[];
    startDate: string;
  };
}

export interface GeneratorState {
  step: number;
  courses: Course[];
  timetableName: string;
  timetableDescription: string;
  dailyHours: number;
  timePreference: string;
  restDays: string[];
  startDate: Date;
  setStep: (step: number) => void;
  setCourses: (courses: Course[]) => void;
  updateCourse: (id: string, data: Partial<Course>) => void;
  addCourse: () => void;
  removeCourse: (id: string) => void;
  setCourseCount: (count: number) => void;
  setTimetableName: (name: string) => void;
  setTimetableDescription: (desc: string) => void;
  setDailyHours: (hours: number) => void;
  setTimePreference: (pref: string) => void;
  setRestDays: (days: string[]) => void;
  setStartDate: (date: Date) => void;
  reset: () => void;
}