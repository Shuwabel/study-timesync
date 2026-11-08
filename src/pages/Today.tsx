import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import RouteChip, { routeNumber } from '@/components/RouteChip';
import SessionRow from '@/components/SessionRow';
import { Button } from '@/components/ui/button';
import { useSessionActions } from '@/hooks/use-session-actions';
import { useTimetables, useTodayKey } from '@/hooks/use-timetables';
import { createSamplePlan } from '@/lib/sample';
import {
  dayKey,
  doneHours,
  endTime,
  formatDuration,
  overdueSessions,
  plannedHours,
  rescheduleOverdue,
  toMinutes,
  upcomingExams,
} from '@/lib/schedule';
import { saveTimetable } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { StudySession, Timetable } from '@/lib/types';

type Item = { tt: Timetable; s: StudySession };

function useMinutesNow(): number {
  const read = () => new Date().getHours() * 60 + new Date().getMinutes();
  const [now, setNow] = useState(read);
  useEffect(() => {
    const t = window.setInterval(() => setNow(read()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function untilLabel(startMinutes: number, endMinutes: number, now: number): string {
  if (now >= endMinutes) return 'Still to do';
  if (now >= startMinutes) return 'In progress';
  const diff = startMinutes - now;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `In ${h}h ${m}m` : `In ${m} min`;
}

export default function Today() {
  const navigate = useNavigate();
  const { timetables, refresh, apply } = useTimetables();
  const today = useTodayKey();
  const now = useMinutesNow();
  const actions = useSessionActions(apply);

  const todayDate = parseISO(today);
  const tomorrow = dayKey(addDays(todayDate, 1));

  const items = useMemo<Item[]>(() => timetables.flatMap((tt) => tt.sessions.map((s) => ({ tt, s }))), [timetables]);
  const byTime = (a: Item, b: Item) => a.s.startTime.localeCompare(b.s.startTime);

  const todayItems = useMemo(() => items.filter((i) => i.s.date === today).sort(byTime), [items, today]);
  const tomorrowItems = useMemo(() => items.filter((i) => i.s.date === tomorrow && i.s.status !== 'skipped').sort(byTime), [items, tomorrow]);

  const overdue = useMemo(
    () => timetables.map((tt) => ({ tt, list: overdueSessions(tt, today) })).filter((x) => x.list.length > 0),
    [timetables, today],
  );
  const overdueCount = overdue.reduce((n, x) => n + x.list.length, 0);
  const overdueHours = overdue.reduce((n, x) => n + x.list.reduce((h, s) => h + s.duration, 0), 0);

  const pendingToday = todayItems.filter((i) => !i.s.status);
  const next = pendingToday.find((i) => toMinutes(i.s.startTime) + i.s.duration * 60 > now) ?? pendingToday[0];
  const later = useMemo(
    () =>
      items
        .filter((i) => i.s.date > today && !i.s.status)
        .sort((a, b) => (a.s.date + a.s.startTime).localeCompare(b.s.date + b.s.startTime))[0],
    [items, today],
  );

  const exams = useMemo(
    () =>
      timetables
        .flatMap((tt) => upcomingExams(tt, today).map((e) => ({ ...e, tt })))
        .sort((a, b) => a.day.localeCompare(b.day))
        .slice(0, 6),
    [timetables, today],
  );

  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const weekKeys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(weekStart, i)));
  const weekSessions = items.filter((i) => weekKeys.includes(i.s.date)).map((i) => i.s);
  const weekPlanned = plannedHours(weekSessions);
  const weekDone = doneHours(weekSessions);

  const rescheduleAll = () => {
    const before = overdue.map((x) => x.tt);
    let moved = 0;
    let dropped = 0;
    for (const { tt } of overdue) {
      apply(tt.id, (latest) => {
        const result = rescheduleOverdue(latest, today);
        moved += result.moved;
        dropped += result.dropped;
        return result.timetable;
      });
    }
    toast(
      dropped > 0
        ? `Moved ${moved} session${moved === 1 ? '' : 's'}, skipped ${dropped} past their exam`
        : `Moved ${moved} missed session${moved === 1 ? '' : 's'} to the days ahead`,
      {
        action: {
          label: 'Undo',
          onClick: () => {
            before.forEach((tt) => apply(tt.id, () => tt));
          },
        },
      },
    );
  };

  const trySample = () => {
    const sample = createSamplePlan();
    saveTimetable(sample);
    refresh();
    toast('Sample plan added', { description: 'Delete it from Plans when you are done looking around.' });
  };

  const heading = (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-tight md:text-6xl">Today</h1>
        <p className="mt-1 text-lg text-muted-foreground">{format(todayDate, 'EEEE d MMMM')}</p>
      </div>
      {timetables.length > 0 && (
        <Button asChild variant="outline">
          <Link to="/generate">
            <Plus /> New plan
          </Link>
        </Button>
      )}
    </div>
  );

  if (timetables.length === 0) {
    return (
      <AppShell width="max-w-3xl">
        {heading}
        <section className="border border-border bg-card p-6 md:p-10">
          <h2 className="font-display text-4xl font-bold uppercase leading-none md:text-5xl">No plan yet</h2>
          <p className="mt-3 max-w-prose text-lg text-muted-foreground">
            Add your courses and exam dates. StudySync works backwards from each exam and fills your days with sessions. Your plan stays in this browser.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate('/generate')}>
              Create my plan <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" onClick={trySample}>
              Try a sample plan
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {heading}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          {overdueCount > 0 && (
            <section
              aria-label="Missed sessions"
              className="flex flex-wrap items-center justify-between gap-3 border border-destructive bg-card p-4"
            >
              <div>
                <p className="text-lg font-semibold">
                  {overdueCount} missed session{overdueCount === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(overdueHours)} of study fell behind. Move it to the days that still have room before each exam.
                </p>
              </div>
              <Button onClick={rescheduleAll}>Reschedule all</Button>
            </section>
          )}

          {next ? (
            <section aria-label="Next session" className="bg-signal p-5 text-signal-foreground md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{untilLabel(toMinutes(next.s.startTime), toMinutes(next.s.startTime) + next.s.duration * 60, now)}</p>
                  <p className="timeface text-7xl font-bold leading-none md:text-8xl">{next.s.startTime}</p>
                  <p className="tnum mt-1 text-lg">
                    to {endTime(next.s)} · {formatDuration(next.s.duration)}
                  </p>
                </div>
                <RouteChip colorIndex={next.s.colorIndex} label={routeNumber(next.tt.courses, next.s.courseId)} className="h-10 min-w-10 text-xl" />
              </div>
              <h2 className="mt-4 text-2xl font-bold leading-tight">
                {next.s.courseName}: {next.s.sessionType}
              </h2>
              <p className="mt-1 max-w-prose">{next.s.tip}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  className="bg-signal-foreground text-signal hover:bg-signal-foreground/90"
                  onClick={() => actions.onToggleDone(next.tt, next.s)}
                >
                  <Check /> Mark done
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-signal-foreground bg-transparent text-signal-foreground hover:bg-signal-foreground/10 hover:text-signal-foreground"
                  onClick={() => actions.onMoveTomorrow?.(next.tt, next.s)}
                >
                  Move to the next day
                </Button>
              </div>
            </section>
          ) : (
            <section aria-label="Next session" className="border border-border bg-card p-5 md:p-6">
              <h2 className="font-display text-3xl font-bold uppercase leading-none md:text-4xl">
                {todayItems.length > 0 ? 'All done for today' : 'Nothing planned today'}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {later
                  ? `Next up: ${later.s.courseName} on ${format(parseISO(later.s.date), 'EEEE d MMMM')} at ${later.s.startTime}.`
                  : 'No sessions are left in your plans.'}
              </p>
            </section>
          )}

          <section aria-labelledby="today-list">
            <h2 id="today-list" className="mb-1 font-display text-2xl font-bold uppercase tracking-tight">
              Today's sessions
            </h2>
            {todayItems.length > 0 ? (
              <ul className="border-t border-border">
                {todayItems.map(({ tt, s }) => (
                  <SessionRow key={`${tt.id}-${s.id}`} tt={tt} s={s} actions={actions} showPlanLink={timetables.length > 1} />
                ))}
              </ul>
            ) : (
              <p className="border-t border-border py-4 text-muted-foreground">Nothing scheduled. Rest day or all clear.</p>
            )}
          </section>

          {tomorrowItems.length > 0 && (
            <section aria-labelledby="tomorrow-list">
              <h2 id="tomorrow-list" className="mb-1 font-display text-2xl font-bold uppercase tracking-tight">
                Tomorrow
              </h2>
              <ul className="border-t border-border">
                {tomorrowItems.map(({ tt, s }) => (
                  <SessionRow key={`${tt.id}-${s.id}`} tt={tt} s={s} actions={actions} showPlanLink={timetables.length > 1} dimmed />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-8" aria-label="Exams and week">
          <section aria-labelledby="exams-h">
            <h2 id="exams-h" className="mb-2 font-display text-2xl font-bold uppercase tracking-tight">
              Exams
            </h2>
            {exams.length > 0 ? (
              <ul className="border-t border-border">
                {exams.map((e) => {
                  const total = e.hoursDone + e.hoursLeft;
                  const ratio = total > 0 ? e.hoursDone / total : 0;
                  return (
                    <li key={`${e.timetableId}-${e.course.id}`} className="border-b border-border py-3">
                      <Link to={`/timetable/${e.timetableId}`} className="flex items-center gap-3 hover:opacity-80">
                        <RouteChip colorIndex={e.course.colorIndex} label={routeNumber(e.tt.courses, e.course.id)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold leading-tight">{e.course.name}</p>
                          <p className="text-sm text-muted-foreground">{format(parseISO(e.day), 'EEE d MMM')}</p>
                        </div>
                        <p className="timeface text-right text-3xl font-bold leading-none">
                          {e.daysLeft === 0 ? 'Today' : e.daysLeft}
                          {e.daysLeft > 0 && <span className="block text-xs font-medium uppercase text-muted-foreground">{e.daysLeft === 1 ? 'day' : 'days'}</span>}
                        </p>
                      </Link>
                      <div className="mt-2 h-1.5 bg-muted" role="img" aria-label={`${formatDuration(e.hoursDone)} done of ${formatDuration(total)} planned`}>
                        <div className="h-full bg-foreground" style={{ width: `${Math.round(ratio * 100)}%` }} />
                      </div>
                      <p className="tnum mt-1 text-xs text-muted-foreground">
                        {formatDuration(e.hoursDone)} done · {formatDuration(e.hoursLeft)} to go
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="border-t border-border py-3 text-muted-foreground">No upcoming exams in your plans.</p>
            )}
          </section>

          <section aria-labelledby="week-h">
            <h2 id="week-h" className="mb-2 font-display text-2xl font-bold uppercase tracking-tight">
              This week
            </h2>
            <div className="border-t border-border pt-3">
              <p className="timeface text-4xl font-bold leading-none">
                {formatDuration(weekDone)} <span className="text-lg font-medium text-muted-foreground">of {formatDuration(weekPlanned)}</span>
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1" role="img" aria-label="Hours done each day this week">
                {weekKeys.map((key) => {
                  const day = weekSessions.filter((s) => s.date === key);
                  const planned = plannedHours(day);
                  const done = doneHours(day);
                  return (
                    <div key={key} className="text-center">
                      <div className="flex h-12 items-end bg-muted">
                        <div
                          className={cn('w-full', key === today ? 'bg-signal' : 'bg-foreground')}
                          style={{ height: planned > 0 ? `${Math.round((done / planned) * 100)}%` : 0 }}
                        />
                      </div>
                      <p className={cn('mt-1 text-xs font-semibold', key === today ? 'text-foreground' : 'text-muted-foreground')}>
                        {format(parseISO(key), 'EEEEE')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard">All plans</Link>
          </Button>
        </aside>
      </div>
    </AppShell>
  );
}
