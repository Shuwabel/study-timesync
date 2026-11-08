import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight, FileDown, Link2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import RouteChip, { routeNumber } from '@/components/RouteChip';
import SessionEditDialog, { SessionEdit } from '@/components/SessionEditDialog';
import SessionRow, { DoneButton, SessionMenu } from '@/components/SessionRow';
import { Button } from '@/components/ui/button';
import { useSessionActions } from '@/hooks/use-session-actions';
import { useTimetables, useTodayKey } from '@/hooks/use-timetables';
import { downloadICS } from '@/lib/ics';
import { exportPDF } from '@/lib/pdf';
import { shareUrl } from '@/lib/share';
import {
  dayKey,
  endTime,
  formatDuration,
  groupByDate,
  moveSession,
  planWarnings,
  plannedHours,
  progress,
  setSessionStatus,
  updateSession,
  upcomingExams,
  DAY_NAMES,
} from '@/lib/schedule';
import { cn } from '@/lib/utils';
import type { StudySession } from '@/lib/types';

export default function TimetableView() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const { timetables, apply } = useTimetables();
  const today = useTodayKey();
  const tt = timetables.find((t) => t.id === id);
  const actions = useSessionActions(apply);

  const [view, setView] = useState<'week' | 'agenda'>('week');
  const [editing, setEditing] = useState<StudySession | null>(null);

  const firstDate = useMemo(() => {
    const dates = (tt?.sessions ?? []).map((s) => s.date).sort();
    return dates[0] ?? today;
  }, [tt, today]);
  const lastDate = useMemo(() => {
    const dates = (tt?.sessions ?? []).map((s) => s.date).sort();
    return dates[dates.length - 1] ?? today;
  }, [tt, today]);

  const paramDate = params.get('date');
  const startAnchor = paramDate ?? (today >= firstDate && today <= lastDate ? today : firstDate);
  const [selected, setSelected] = useState(startAnchor);
  const weekStart = startOfWeek(parseISO(selected), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDate = useMemo(() => groupByDate(tt?.sessions ?? []), [tt]);
  const exams = useMemo(() => (tt ? upcomingExams(tt, '0000-01-01') : []), [tt]);
  const examsByDay = useMemo(() => {
    const map: Record<string, typeof exams> = {};
    exams.forEach((e) => (map[e.day] ||= []).push(e));
    return map;
  }, [exams]);

  if (!tt) {
    return (
      <AppShell width="max-w-3xl">
        <section className="border border-border bg-card p-6 md:p-10">
          <h1 className="font-display text-4xl font-bold uppercase leading-none">Plan not found</h1>
          <p className="mt-3 max-w-prose text-muted-foreground">
            Plans live in the browser that created them. If someone sent you this link, ask them for a new share link: it carries the whole plan inside it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/dashboard">Your plans</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/generate">Create a plan</Link>
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  const stats = progress(tt);
  const warnings = planWarnings(tt);
  const nextExam = upcomingExams(tt, today)[0];
  const weekKeys = weekDays.map(dayKey);
  const weekLabel = `${format(weekDays[0], 'd MMM')} to ${format(weekDays[6], 'd MMM yyyy')}`;
  const thisWeekStart = dayKey(startOfWeek(parseISO(today), { weekStartsOn: 1 }));

  const goWeek = (delta: number) => setSelected(dayKey(addDays(parseISO(selected), delta * 7)));
  const goToday = () => setSelected(today);

  const share = async () => {
    const url = await shareUrl(tt);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied', { description: 'Anyone with it can open a copy of this plan. It does not update.' });
    } catch {
      window.prompt('Copy this share link', url);
    }
  };

  const save = (s: StudySession, edit: SessionEdit) => {
    apply(tt.id, (t) => {
      let next = updateSession(t, s.id, { duration: edit.duration, sessionType: edit.sessionType });
      if (edit.date !== s.date) next = setSessionStatus(moveSession(next, s.id, edit.date), s.id, s.status);
      return next;
    });
    setEditing(null);
  };

  const rowActions = { ...actions, onEdit: (_: unknown, s: StudySession) => setEditing(s) };

  const dayHeading = (key: string) => (
    <span>
      {format(parseISO(key), 'EEEE d MMMM')}
      {key === today && <span className="ml-2 bg-signal px-1.5 py-0.5 text-xs font-bold uppercase text-signal-foreground">Today</span>}
    </span>
  );

  const selectedSessions = byDate[selected] ?? [];
  const selectedExams = examsByDay[selected] ?? [];

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            All plans
          </Link>
          <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none tracking-tight md:text-5xl">{tt.title}</h1>
          {tt.description && <p className="mt-2 max-w-prose text-muted-foreground">{tt.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={share}>
            <Link2 /> Share link
          </Button>
          <Button variant="outline" onClick={() => downloadICS(tt)}>
            <CalendarPlus /> Add to calendar
          </Button>
          <Button variant="outline" onClick={() => exportPDF(tt)}>
            <FileDown /> PDF
          </Button>
        </div>
      </div>

      <section aria-label="Progress" className="mb-6 grid gap-4 border border-border bg-card p-4 md:grid-cols-[1fr_auto] md:items-center md:p-5">
        <div>
          <p className="timeface text-4xl font-bold leading-none">
            {formatDuration(stats.doneHours)} <span className="text-lg font-medium text-muted-foreground">done of {formatDuration(stats.plannedHours)}</span>
          </p>
          <div className="mt-3 h-2 bg-muted" role="img" aria-label={`${Math.round(stats.ratio * 100)} percent done`}>
            <div className="h-full bg-foreground" style={{ width: `${Math.round(stats.ratio * 100)}%` }} />
          </div>
          <p className="tnum mt-1 text-sm text-muted-foreground">
            {stats.sessionsDone} of {stats.sessions} sessions
          </p>
        </div>
        {nextExam && (
          <div className="flex items-center gap-3 md:text-right">
            <RouteChip colorIndex={nextExam.course.colorIndex} label={routeNumber(tt.courses, nextExam.course.id)} />
            <div>
              <p className="font-semibold leading-tight">{nextExam.course.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(nextExam.day), 'EEE d MMM')} ·{' '}
                {nextExam.daysLeft === 0 ? 'today' : `${nextExam.daysLeft} day${nextExam.daysLeft === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        )}
      </section>

      {warnings.length > 0 && (
        <div role="note" className="mb-6 flex gap-3 border border-border bg-card p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold">This plan may not give every exam enough time</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-1 text-sm text-muted-foreground">Add study hours or choose a later date, then create the plan again.</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => goWeek(-1)}>
            <ChevronLeft />
          </Button>
          <p className="min-w-[11rem] px-2 text-center font-semibold md:min-w-[14rem]">{weekLabel}</p>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => goWeek(1)}>
            <ChevronRight />
          </Button>
          {dayKey(weekStart) !== thisWeekStart && (
            <Button variant="ghost" size="sm" onClick={goToday}>
              Today
            </Button>
          )}
        </div>
        <div className="inline-flex border border-border" role="group" aria-label="View">
          {(['week', 'agenda'] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none"
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {v === 'week' ? 'Week' : 'Agenda'}
            </Button>
          ))}
        </div>
      </div>

      {view === 'week' && (
        <>
          {/* Phone and tablet: week strip, then the chosen day */}
          <div className="lg:hidden">
            <div className="grid grid-cols-7 border border-border" role="group" aria-label="Pick a day">
              {weekDays.map((d) => {
                const key = dayKey(d);
                const count = (byDate[key] ?? []).length;
                const isSel = key === selected;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSel}
                    aria-label={format(d, 'EEEE d MMMM')}
                    onClick={() => setSelected(key)}
                    className={cn(
                      'flex min-h-16 flex-col items-center justify-center gap-0.5 border-r border-border py-2 last:border-r-0',
                      isSel ? 'bg-primary text-primary-foreground' : key === today ? 'bg-signal text-signal-foreground' : 'bg-card',
                    )}
                  >
                    <span className="text-xs font-semibold uppercase">{format(d, 'EEEEE')}</span>
                    <span className="timeface text-xl font-bold leading-none">{format(d, 'd')}</span>
                    <span className="text-[10px] leading-none" aria-hidden="true">
                      {count > 0 ? '●'.repeat(Math.min(count, 3)) : ' '}
                    </span>
                  </button>
                );
              })}
            </div>
            <h2 className="mb-1 mt-5 font-display text-2xl font-bold uppercase tracking-tight">{dayHeading(selected)}</h2>
            {selectedExams.map((e) => (
              <p key={e.course.id} className="mb-2 flex items-center gap-2 border border-border bg-card p-3 font-semibold">
                <RouteChip colorIndex={e.course.colorIndex} label={routeNumber(tt.courses, e.course.id)} /> Exam: {e.course.name}
              </p>
            ))}
            {selectedSessions.length > 0 ? (
              <ul className="border-t border-border">
                {selectedSessions.map((s) => (
                  <SessionRow key={s.id} tt={tt} s={s} actions={rowActions} />
                ))}
              </ul>
            ) : (
              <p className="border-t border-border py-4 text-muted-foreground">
                {tt.preferences.restDays.includes(DAY_NAMES[parseISO(selected).getDay()]) ? 'Rest day.' : 'No sessions this day.'}
              </p>
            )}
          </div>

          {/* Desktop: the week as a departure grid */}
          <div className="hidden lg:grid lg:grid-cols-7 lg:border lg:border-border">
            {weekDays.map((d) => {
              const key = dayKey(d);
              const list = byDate[key] ?? [];
              const isRest = tt.preferences.restDays.includes(DAY_NAMES[d.getDay()]);
              const hours = plannedHours(list);
              const isToday = isSameDay(d, parseISO(today));
              return (
                <section key={key} aria-label={format(d, 'EEEE d MMMM')} className="min-h-[22rem] border-r border-border bg-card last:border-r-0">
                  <header className={cn('border-b border-border px-2 py-2', isToday ? 'bg-signal text-signal-foreground' : 'bg-secondary')}>
                    <p className="text-xs font-semibold uppercase">{format(d, 'EEE')}</p>
                    <p className="flex items-baseline justify-between">
                      <span className="timeface text-2xl font-bold leading-none">{format(d, 'd')}</span>
                      {hours > 0 && <span className="tnum text-xs">{formatDuration(hours)}</span>}
                    </p>
                  </header>
                  <div className="space-y-2 p-2">
                    {(examsByDay[key] ?? []).map((e) => (
                      <p key={e.course.id} className="flex items-center gap-2 border border-foreground p-2 text-sm font-bold">
                        <RouteChip colorIndex={e.course.colorIndex} label={routeNumber(tt.courses, e.course.id)} className="h-6 min-w-6 text-sm" />
                        <span className="min-w-0 truncate">Exam: {e.course.name}</span>
                      </p>
                    ))}
                    {list.map((s) => {
                      const done = s.status === 'done';
                      const skipped = s.status === 'skipped';
                      return (
                        <article
                          key={s.id}
                          className={cn('border border-border p-2', (done || skipped) && 'text-muted-foreground', done && 'bg-secondary')}
                        >
                          <div className="flex items-center gap-1.5">
                            <RouteChip colorIndex={s.colorIndex} label={routeNumber(tt.courses, s.courseId)} className="h-6 min-w-6 text-sm" />
                            <p className={cn('min-w-0 flex-1 truncate text-sm font-semibold', (done || skipped) && 'line-through')}>{s.courseName}</p>
                          </div>
                          <p className="tnum mt-1 text-xs text-muted-foreground">
                            {s.startTime} to {endTime(s)} · {s.sessionType}
                            {skipped ? ' · skipped' : ''}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            <DoneButton tt={tt} s={s} actions={rowActions} size="h-8 w-8" />
                            <SessionMenu tt={tt} s={s} actions={rowActions} size="h-8 w-8" />
                          </div>
                        </article>
                      );
                    })}
                    {list.length === 0 && (examsByDay[key] ?? []).length === 0 && (
                      <p className="text-xs italic text-muted-foreground">{isRest ? 'Rest day' : 'Free'}</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="sr-only">{weekKeys.length} days shown</p>
        </>
      )}

      {view === 'agenda' && (
        <div className="max-w-2xl space-y-6">
          {Object.keys(byDate)
            .sort()
            .map((key) => (
              <section key={key} aria-label={format(parseISO(key), 'EEEE d MMMM')}>
                <h2 className="mb-1 flex items-baseline justify-between font-display text-xl font-bold uppercase tracking-tight">
                  {dayHeading(key)}
                  <span className="tnum text-sm font-medium normal-case text-muted-foreground">{formatDuration(plannedHours(byDate[key]))}</span>
                </h2>
                {(examsByDay[key] ?? []).map((e) => (
                  <p key={e.course.id} className="mb-1 flex items-center gap-2 border border-border bg-card p-3 font-semibold">
                    <RouteChip colorIndex={e.course.colorIndex} label={routeNumber(tt.courses, e.course.id)} /> Exam: {e.course.name}
                  </p>
                ))}
                <ul className="border-t border-border">
                  {byDate[key].map((s) => (
                    <SessionRow key={s.id} tt={tt} s={s} actions={rowActions} dimmed={key < today} />
                  ))}
                </ul>
              </section>
            ))}
          {Object.keys(byDate).length === 0 && <p className="text-muted-foreground">This plan has no sessions.</p>}
        </div>
      )}

      <SessionEditDialog session={editing} onClose={() => setEditing(null)} onSave={save} />
    </AppShell>
  );
}
