import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Course, StudySession, Timetable } from './types';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** yyyy-MM-dd in the viewer's local time. */
export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function todayKey(now: Date = new Date()): string {
  return dayKey(now);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(total, 24 * 60 - 1));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function durationMinutes(session: Pick<StudySession, 'duration'>): number {
  return Math.round(session.duration * 60);
}

export function endTime(session: StudySession): string {
  return fromMinutes(toMinutes(session.startTime) + durationMinutes(session));
}

export function formatDuration(hours: number): string {
  const minutes = Math.round(hours * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function examDayKey(course: Pick<Course, 'examDate' | 'noExam'>): string | null {
  if (course.noExam || !course.examDate) return null;
  return dayKey(new Date(course.examDate));
}

export function sortSessions(sessions: StudySession[]): StudySession[] {
  return [...sessions].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export function groupByDate(sessions: StudySession[]): Record<string, StudySession[]> {
  const map: Record<string, StudySession[]> = {};
  for (const s of sortSessions(sessions)) {
    (map[s.date] ||= []).push(s);
  }
  return map;
}

export function isPending(s: StudySession): boolean {
  return !s.status;
}

/** Hours that count toward the plan (skipped sessions are removed from it). */
export function plannedHours(sessions: StudySession[]): number {
  return sessions.filter((s) => s.status !== 'skipped').reduce((sum, s) => sum + s.duration, 0);
}

export function doneHours(sessions: StudySession[]): number {
  return sessions.filter((s) => s.status === 'done').reduce((sum, s) => sum + s.duration, 0);
}

export function progress(tt: Timetable) {
  const counted = tt.sessions.filter((s) => s.status !== 'skipped');
  const done = counted.filter((s) => s.status === 'done');
  const planned = plannedHours(tt.sessions);
  const finished = doneHours(tt.sessions);
  return {
    sessions: counted.length,
    sessionsDone: done.length,
    plannedHours: planned,
    doneHours: finished,
    ratio: planned > 0 ? finished / planned : 0,
  };
}

export function overdueSessions(tt: Timetable, today: string): StudySession[] {
  return sortSessions(tt.sessions.filter((s) => isPending(s) && s.date < today));
}

export interface ExamInfo {
  course: Course;
  timetableId: string;
  timetableTitle: string;
  day: string;
  daysLeft: number;
  hoursLeft: number;
  hoursDone: number;
}

/** Upcoming exams of a plan, soonest first. An exam today still counts. */
export function upcomingExams(tt: Timetable, today: string): ExamInfo[] {
  const todayDate = parseISO(today);
  const out: ExamInfo[] = [];
  for (const course of tt.courses) {
    const day = examDayKey(course);
    if (!day || day < today) continue;
    const own = tt.sessions.filter((s) => s.courseId === course.id && s.status !== 'skipped');
    out.push({
      course,
      timetableId: tt.id,
      timetableTitle: tt.title,
      day,
      daysLeft: differenceInCalendarDays(parseISO(day), todayDate),
      hoursLeft: own.filter((s) => !s.status).reduce((sum, s) => sum + s.duration, 0),
      hoursDone: own.filter((s) => s.status === 'done').reduce((sum, s) => sum + s.duration, 0),
    });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

const DEFAULT_START_HOUR: Record<string, number> = { Morning: 8, Afternoon: 13, Evening: 18 };

function dayLoad(sessions: StudySession[], date: string, ignoreId?: string): number {
  return sessions
    .filter((s) => s.date === date && s.id !== ignoreId && s.status !== 'skipped')
    .reduce((sum, s) => sum + s.duration, 0);
}

/** Start time that follows the last session already on that day. */
function nextFreeStart(tt: Timetable, sessions: StudySession[], date: string, ignoreId?: string): string {
  const onDay = sessions.filter((s) => s.date === date && s.id !== ignoreId);
  if (onDay.length === 0) {
    const hour = DEFAULT_START_HOUR[tt.preferences.timePreference] ?? 9;
    return fromMinutes(hour * 60);
  }
  const lastEnd = Math.max(...onDay.map((s) => toMinutes(s.startTime) + durationMinutes(s)));
  return fromMinutes(lastEnd);
}

export function moveSession(tt: Timetable, sessionId: string, date: string): Timetable {
  const target = tt.sessions.find((s) => s.id === sessionId);
  if (!target || target.date === date) return tt;
  const startTime = nextFreeStart(tt, tt.sessions, date, sessionId);
  return {
    ...tt,
    sessions: tt.sessions.map((s) => (s.id === sessionId ? { ...s, date, startTime, status: undefined } : s)),
  };
}

/** Re-pack one day's sessions back to back, starting at its earliest start. */
export function reflowDay(tt: Timetable, date: string, anchorMinutes?: number): Timetable {
  const onDay = sortSessions(tt.sessions.filter((s) => s.date === date));
  if (onDay.length === 0) return tt;
  let cursor = Math.min(toMinutes(onDay[0].startTime), anchorMinutes ?? Infinity);
  const starts = new Map<string, string>();
  for (const s of onDay) {
    starts.set(s.id, fromMinutes(cursor));
    cursor += durationMinutes(s);
  }
  return { ...tt, sessions: tt.sessions.map((s) => (starts.has(s.id) ? { ...s, startTime: starts.get(s.id)! } : s)) };
}

export function setSessionStatus(tt: Timetable, sessionId: string, status: StudySession['status']): Timetable {
  return { ...tt, sessions: tt.sessions.map((s) => (s.id === sessionId ? { ...s, status } : s)) };
}

export function updateSession(tt: Timetable, sessionId: string, patch: Partial<StudySession>): Timetable {
  const target = tt.sessions.find((s) => s.id === sessionId);
  if (!target) return tt;
  const next = { ...tt, sessions: tt.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)) };
  return patch.duration !== undefined ? reflowDay(next, target.date) : next;
}

export function removeSession(tt: Timetable, sessionId: string): Timetable {
  const target = tt.sessions.find((s) => s.id === sessionId);
  const next = { ...tt, sessions: tt.sessions.filter((s) => s.id !== sessionId) };
  return target ? reflowDay(next, target.date, toMinutes(target.startTime)) : next;
}

/**
 * Move every missed session to the next days with room, never past the
 * course's exam. Sessions whose exam already passed are marked skipped.
 */
export function rescheduleOverdue(
  tt: Timetable,
  today: string,
): { timetable: Timetable; moved: number; dropped: number } {
  const overdue = overdueSessions(tt, today);
  if (overdue.length === 0) return { timetable: tt, moved: 0, dropped: 0 };

  let sessions = tt.sessions.map((s) => ({ ...s }));
  let moved = 0;
  let dropped = 0;
  const budget = tt.preferences.dailyHours + 1;
  const todayDate = parseISO(today);

  for (const miss of overdue) {
    const course = tt.courses.find((c) => c.id === miss.courseId);
    const exam = course ? examDayKey(course) : null;
    const lastAllowed = exam ? dayKey(addDays(parseISO(exam), -1)) : dayKey(addDays(todayDate, 60));

    if (lastAllowed < today) {
      sessions = sessions.map((s) => (s.id === miss.id ? { ...s, status: 'skipped' as const } : s));
      dropped++;
      continue;
    }

    let best: string | null = null;
    let bestLoad = Infinity;
    for (let i = 0; i <= 60; i++) {
      const d = addDays(todayDate, i);
      const key = dayKey(d);
      if (key > lastAllowed) break;
      if (tt.preferences.restDays.includes(DAY_NAMES[d.getDay()])) continue;
      const load = dayLoad(sessions, key, miss.id);
      if (load + miss.duration <= budget) {
        best = key;
        break;
      }
      if (load < bestLoad) {
        best = key;
        bestLoad = load;
      }
    }
    if (!best) best = lastAllowed;

    const startTime = nextFreeStart({ ...tt, sessions }, sessions, best, miss.id);
    sessions = sessions.map((s) => (s.id === miss.id ? { ...s, date: best!, startTime } : s));
    moved++;
  }

  return { timetable: { ...tt, sessions }, moved, dropped };
}

/** Plain-language warnings about a plan that may not fit its exams. */
export function planWarnings(tt: Timetable): string[] {
  const out: string[] = [];
  for (const course of tt.courses) {
    if (!examDayKey(course)) continue;
    const name = course.name || 'A course';
    const count = tt.sessions.filter((s) => s.courseId === course.id && s.status !== 'skipped').length;
    if (count === 0) out.push(`${name} has no study sessions before its exam.`);
    else if (count < 3) out.push(`${name} only has ${count} session${count === 1 ? '' : 's'} before its exam.`);
  }
  return out;
}
