import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import RouteChip from '@/components/RouteChip';
import { Button } from '@/components/ui/button';
import { useTimetables, useTodayKey } from '@/hooks/use-timetables';
import { createSamplePlan } from '@/lib/sample';
import { formatDuration, progress, upcomingExams } from '@/lib/schedule';
import { deleteTimetable, duplicateTimetable, restoreTimetable, saveTimetable } from '@/lib/storage';

export default function Dashboard() {
  const { timetables, refresh } = useTimetables();
  const today = useTodayKey();

  const remove = (id: string) => {
    const { removed, index } = deleteTimetable(id);
    refresh();
    if (!removed) return;
    toast(`Deleted "${removed.title}"`, {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: () => {
          restoreTimetable(removed, index);
          refresh();
        },
      },
    });
  };

  const duplicate = (id: string) => {
    const copy = duplicateTimetable(id);
    refresh();
    if (copy) toast.success(`Created "${copy.title}"`);
  };

  const addSample = () => {
    saveTimetable(createSamplePlan());
    refresh();
  };

  return (
    <AppShell width="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-tight md:text-6xl">Plans</h1>
        <Button asChild>
          <Link to="/generate">
            <Plus /> New plan
          </Link>
        </Button>
      </div>

      {timetables.length === 0 ? (
        <section className="border border-border bg-card p-6 md:p-10">
          <h2 className="font-display text-3xl font-bold uppercase leading-none">No plans yet</h2>
          <p className="mt-3 max-w-prose text-muted-foreground">Create one from your courses and exam dates, or add a sample to look around first.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/generate">Create my plan</Link>
            </Button>
            <Button size="lg" variant="outline" onClick={addSample}>
              Try a sample plan
            </Button>
          </div>
        </section>
      ) : (
        <ul className="border-t border-border">
          {timetables.map((tt) => {
            const stats = progress(tt);
            const next = upcomingExams(tt, today)[0];
            return (
              <li key={tt.id} className="border-b border-border py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-3xl font-bold uppercase leading-none">
                      <Link to={`/timetable/${tt.id}`} className="hover:underline">
                        {tt.title}
                      </Link>
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {tt.courses.slice(0, 8).map((c, i) => (
                          <RouteChip key={c.id} colorIndex={c.colorIndex} label={i + 1} className="h-5 min-w-5 text-xs" />
                        ))}
                      </span>
                      <span>
                        {tt.courses.length} course{tt.courses.length === 1 ? '' : 's'}
                      </span>
                      <span>Created {format(new Date(tt.createdAt), 'd MMM yyyy')}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild variant="outline">
                      <Link to={`/timetable/${tt.id}`}>Open</Link>
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Duplicate ${tt.title}`} onClick={() => duplicate(tt.id)}>
                      <Copy />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${tt.title}`} onClick={() => remove(tt.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <div className="h-2 bg-muted" role="img" aria-label={`${Math.round(stats.ratio * 100)} percent done`}>
                      <div className="h-full bg-foreground" style={{ width: `${Math.round(stats.ratio * 100)}%` }} />
                    </div>
                    <p className="tnum mt-1 text-sm text-muted-foreground">
                      {formatDuration(stats.doneHours)} done of {formatDuration(stats.plannedHours)} · {stats.sessionsDone}/{stats.sessions} sessions
                    </p>
                  </div>
                  {next && (
                    <p className="text-sm sm:text-right">
                      <span className="font-semibold">{next.course.name}</span>{' '}
                      <span className="text-muted-foreground">
                        {format(parseISO(next.day), 'd MMM')} ·{' '}
                        {next.daysLeft === 0 ? 'today' : `${next.daysLeft} day${next.daysLeft === 1 ? '' : 's'}`}
                      </span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
