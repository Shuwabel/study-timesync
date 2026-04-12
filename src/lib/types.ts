export interface Course {
  id: string;
  name: string;
  colorIndex: number;
  examDate?: Date;
  noExam: boolean;
  priority: number;
  difficulty: number;
}

export interface StudySession {
  id: string;
  courseId: string;
  courseName: string;
  colorIndex: number;
  date: string; // ISO date string
  startTime: string; // e.g. "09:00"
  duration: number; // hours
  sessionType: 'Focus' | 'Review' | 'Practice';
  tip: string;
}

export interface Timetable {
  id: string;
  title: string;
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
  setDailyHours: (hours: number) => void;
  setTimePreference: (pref: string) => void;
  setRestDays: (days: string[]) => void;
  setStartDate: (date: Date) => void;
  reorderCourses: (courseIds: string[]) => void;
  reset: () => void;
}
