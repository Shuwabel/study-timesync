import { useCallback, useEffect, useState } from 'react';
import { getTimetableById, getTimetables, updateTimetable } from '@/lib/storage';
import { todayKey } from '@/lib/schedule';
import type { Timetable } from '@/lib/types';

/** All saved plans, kept in sync with other tabs and with this tab's edits. */
export function useTimetables() {
  const [timetables, setTimetables] = useState<Timetable[]>(() => getTimetables());

  const refresh = useCallback(() => setTimetables(getTimetables()), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'studysync_timetables' || e.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const commit = useCallback((updated: Timetable) => {
    updateTimetable(updated);
    setTimetables((list) => list.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  /** Apply a change to the latest saved copy of a plan, so a late Undo never overwrites newer edits. */
  const apply = useCallback((id: string, change: (tt: Timetable) => Timetable) => {
    const latest = getTimetableById(id);
    if (!latest) return;
    const next = change(latest);
    updateTimetable(next);
    setTimetables((list) => list.map((t) => (t.id === id ? next : t)));
  }, []);

  return { timetables, refresh, commit, apply };
}

/** Today's date key, refreshed when the tab becomes visible again (e.g. after midnight). */
export function useTodayKey(): string {
  const [key, setKey] = useState(() => todayKey());
  useEffect(() => {
    const update = () => setKey(todayKey());
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    const timer = window.setInterval(update, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
      window.clearInterval(timer);
    };
  }, []);
  return key;
}
