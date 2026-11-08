import { COURSE_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** The course colour as a numbered route block, like a line badge on a timetable. */
export default function RouteChip({
  colorIndex,
  label,
  className,
}: {
  colorIndex: number;
  label: string | number;
  className?: string;
}) {
  const color = COURSE_COLORS[colorIndex % COURSE_COLORS.length];
  return (
    <span className={cn('route-chip shrink-0', className)} style={{ backgroundColor: color.hex }} aria-hidden="true">
      {label}
    </span>
  );
}

export function routeNumber(courses: { id: string }[], courseId: string): number {
  const index = courses.findIndex((c) => c.id === courseId);
  return index === -1 ? 0 : index + 1;
}
