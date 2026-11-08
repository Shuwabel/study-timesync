import { Timetable } from './types';
import { isTimetable } from './share';

const STORAGE_KEY = 'studysync_timetables';

function write(list: Timetable[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: the in-memory state still works for this visit */
  }
}

export function getTimetables(): Timetable[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed.filter(isTimetable) : [];
  } catch {
    return [];
  }
}

export function saveTimetable(timetable: Timetable): void {
  write([timetable, ...getTimetables().filter((t) => t.id !== timetable.id)]);
}

export function getTimetableById(id: string): Timetable | undefined {
  return getTimetables().find((t) => t.id === id);
}

export function deleteTimetable(id: string): { removed?: Timetable; index: number } {
  const list = getTimetables();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) return { index: -1 };
  const [removed] = list.splice(index, 1);
  write(list);
  return { removed, index };
}

/** Put a deleted plan back where it was (used by Undo). */
export function restoreTimetable(timetable: Timetable, index: number): void {
  const list = getTimetables().filter((t) => t.id !== timetable.id);
  list.splice(Math.min(Math.max(index, 0), list.length), 0, timetable);
  write(list);
}

export function updateTimetable(updated: Timetable): void {
  write(getTimetables().map((t) => (t.id === updated.id ? updated : t)));
}

export function duplicateTimetable(id: string): Timetable | undefined {
  const source = getTimetableById(id);
  if (!source) return undefined;
  const copy: Timetable = {
    ...source,
    id: `tt-${Date.now()}`,
    title: `${source.title} (copy)`,
    createdAt: new Date().toISOString(),
    sessions: source.sessions.map((s) => ({ ...s, status: undefined })),
  };
  saveTimetable(copy);
  return copy;
}

/** Save a plan that arrived through a share link as a new local copy. */
export function importTimetable(shared: Timetable): Timetable {
  const existing = getTimetableById(shared.id);
  if (existing) return existing;
  const copy: Timetable = { ...shared, createdAt: shared.createdAt || new Date().toISOString() };
  saveTimetable(copy);
  return copy;
}
