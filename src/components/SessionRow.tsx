import { Link } from 'react-router-dom';
import { ArrowRight, Check, MoreHorizontal, Pencil, SkipForward, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import RouteChip, { routeNumber } from '@/components/RouteChip';
import { endTime, formatDuration } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import type { StudySession, Timetable } from '@/lib/types';

export interface SessionActions {
  onToggleDone: (tt: Timetable, s: StudySession) => void;
  onSkip: (tt: Timetable, s: StudySession) => void;
  onMoveTomorrow?: (tt: Timetable, s: StudySession) => void;
  onRemove?: (tt: Timetable, s: StudySession) => void;
  onEdit?: (tt: Timetable, s: StudySession) => void;
}

/** The "..." menu for one session: edit, skip, move, open, delete. */
export function SessionMenu({
  tt,
  s,
  actions,
  size = 'h-11 w-11',
}: {
  tt: Timetable;
  s: StudySession;
  actions: SessionActions;
  size?: string;
}) {
  const skipped = s.status === 'skipped';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('shrink-0', size)} aria-label={`More actions for ${s.courseName}`}>
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.onEdit && (
          <DropdownMenuItem onSelect={() => actions.onEdit!(tt, s)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit day, length or type
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => actions.onSkip(tt, s)}>
          {skipped ? <Undo2 className="mr-2 h-4 w-4" /> : <SkipForward className="mr-2 h-4 w-4" />}
          {skipped ? 'Put back in the plan' : 'Skip this session'}
        </DropdownMenuItem>
        {actions.onMoveTomorrow && (
          <DropdownMenuItem onSelect={() => actions.onMoveTomorrow!(tt, s)}>
            <ArrowRight className="mr-2 h-4 w-4" /> Move to the next day
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to={`/timetable/${tt.id}?date=${s.date}`}>Open plan</Link>
        </DropdownMenuItem>
        {actions.onRemove && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => actions.onRemove!(tt, s)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete session
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DoneButton({
  tt,
  s,
  actions,
  size = 'h-11 w-11',
}: {
  tt: Timetable;
  s: StudySession;
  actions: SessionActions;
  size?: string;
}) {
  const done = s.status === 'done';
  return (
    <Button
      variant={done ? 'default' : 'outline'}
      size="icon"
      className={cn('shrink-0', size)}
      aria-pressed={done}
      aria-label={done ? `Mark ${s.courseName} ${s.sessionType} not done` : `Mark ${s.courseName} ${s.sessionType} done`}
      onClick={() => actions.onToggleDone(tt, s)}
    >
      <Check className="h-5 w-5" />
    </Button>
  );
}

/** One departure: time, route chip, course, and tick box. Every action is a visible button. */
export default function SessionRow({
  tt,
  s,
  actions,
  showPlanLink = false,
  dimmed = false,
}: {
  tt: Timetable;
  s: StudySession;
  actions: SessionActions;
  showPlanLink?: boolean;
  dimmed?: boolean;
}) {
  const done = s.status === 'done';
  const skipped = s.status === 'skipped';
  return (
    <li
      className={cn(
        'flex items-center gap-3 border-b border-border py-3 last:border-b-0',
        (done || skipped || dimmed) && 'text-muted-foreground',
      )}
    >
      <div className="w-[4.25rem] shrink-0">
        <p className={cn('timeface text-2xl font-semibold leading-none', (done || skipped) && 'line-through')}>{s.startTime}</p>
        <p className="tnum mt-1 text-xs text-muted-foreground">to {endTime(s)}</p>
      </div>
      <RouteChip colorIndex={s.colorIndex} label={routeNumber(tt.courses, s.courseId)} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-semibold leading-tight', (done || skipped) && 'line-through')}>{s.courseName}</p>
        <p className="truncate text-sm text-muted-foreground">
          {s.sessionType} · {formatDuration(s.duration)}
          {skipped ? ' · skipped' : ''}
          {showPlanLink ? ` · ${tt.title}` : ''}
        </p>
      </div>
      <DoneButton tt={tt} s={s} actions={actions} />
      <SessionMenu tt={tt} s={s} actions={actions} />
    </li>
  );
}
