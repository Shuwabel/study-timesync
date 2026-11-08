import { useMemo } from 'react';
import { addDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { DAY_NAMES, dayKey, moveSession, reflowDay, removeSession, setSessionStatus, toMinutes } from '@/lib/schedule';
import type { SessionActions } from '@/components/SessionRow';
import type { StudySession, Timetable } from '@/lib/types';

type Apply = (id: string, change: (tt: Timetable) => Timetable) => void;

/** Next calendar day that is not one of the plan's rest days. */
export function nextStudyDay(tt: Timetable, from: string): string {
  let d = addDays(parseISO(from), 1);
  for (let i = 0; i < 7 && tt.preferences.restDays.includes(DAY_NAMES[d.getDay()]); i++) d = addDays(d, 1);
  return dayKey(d);
}

/** Done / skip / move / delete with an Undo toast, each applied to the newest saved plan. */
export function useSessionActions(apply: Apply): SessionActions {
  return useMemo<SessionActions>(
    () => ({
      onToggleDone: (tt, s) => apply(tt.id, (t) => setSessionStatus(t, s.id, s.status === 'done' ? undefined : 'done')),

      onSkip: (tt, s) => {
        const wasSkipped = s.status === 'skipped';
        apply(tt.id, (t) => setSessionStatus(t, s.id, wasSkipped ? undefined : 'skipped'));
        if (!wasSkipped) {
          toast(`Skipped ${s.courseName}`, {
            action: { label: 'Undo', onClick: () => apply(tt.id, (t) => setSessionStatus(t, s.id, s.status)) },
          });
        }
      },

      onMoveTomorrow: (tt, s) => {
        const target = nextStudyDay(tt, s.date);
        apply(tt.id, (t) => moveSession(t, s.id, target));
        toast(`Moved ${s.courseName} to the next study day`, {
          action: {
            label: 'Undo',
            onClick: () =>
              apply(tt.id, (t) => {
                const back = moveSession(t, s.id, s.date);
                return setSessionStatus(back, s.id, s.status);
              }),
          },
        });
      },

      onRemove: (tt, s: StudySession) => {
        apply(tt.id, (t) => removeSession(t, s.id));
        toast(`Deleted ${s.courseName} session`, {
          action: {
            label: 'Undo',
            onClick: () => apply(tt.id, (t) => reflowDay({ ...t, sessions: [...t.sessions, s] }, s.date, toMinutes(s.startTime))),
          },
        });
      },
    }),
    [apply],
  );
}
