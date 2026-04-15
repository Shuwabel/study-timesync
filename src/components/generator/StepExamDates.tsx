import { useState } from 'react';
import { useGeneratorStore } from '@/store/generatorStore';
import { COURSE_COLORS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StepExamDates() {
  const { courses, updateCourse } = useGeneratorStore();
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const missingDates = courses.some((c) => !c.examDate && !c.noExam);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">When are your exams?</h2>
      <p className="text-muted-foreground mb-6">Set exam dates so we can plan your study schedule backwards.</p>

      {missingDates && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
          Every course needs an exam date or must be marked as "No fixed exam" before you can continue.
        </div>
      )}

      <div className="space-y-4">
        {courses.map((course) => {
          const daysAway = course.examDate
            ? differenceInDays(new Date(course.examDate), new Date())
            : null;
          const isMissing = !course.examDate && !course.noExam;

          return (
            <div
              key={course.id}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card',
                isMissing ? 'border-destructive/50' : 'border-border'
              )}
            >
              <div className="flex items-center gap-2 min-w-[140px]">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COURSE_COLORS[course.colorIndex].hex }} />
                <span className="font-medium text-sm truncate">{course.name}</span>
              </div>

              <div className="flex items-center gap-3 flex-1 flex-wrap">
                {!course.noExam && (
                  <Popover
                    open={openPopoverId === course.id}
                    onOpenChange={(open) => setOpenPopoverId(open ? course.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-[180px] justify-start text-left text-sm', !course.examDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {course.examDate ? format(new Date(course.examDate), 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={course.examDate ? new Date(course.examDate) : undefined}
                        onSelect={(d) => {
                          updateCourse(course.id, { examDate: d || undefined });
                          setOpenPopoverId(null);
                        }}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {daysAway !== null && daysAway >= 0 && !course.noExam && (
                  <span className="text-xs font-medium text-primary">{daysAway} days away</span>
                )}

                <label className="flex items-center gap-2 cursor-pointer ml-auto">
                  <Checkbox
                    checked={course.noExam}
                    onCheckedChange={(v) => updateCourse(course.id, { noExam: !!v, examDate: undefined })}
                  />
                  <span className="text-xs text-muted-foreground">No fixed exam</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
