import { Timetable } from './types';

const STORAGE_KEY = 'studysync_timetables';

export function saveTimetable(timetable: Timetable): void {
  const existing = getTimetables();
  existing.unshift(timetable);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getTimetables(): Timetable[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getTimetableById(id: string): Timetable | undefined {
  return getTimetables().find((t) => t.id === id);
}

export function deleteTimetable(id: string): void {
  const existing = getTimetables().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}
