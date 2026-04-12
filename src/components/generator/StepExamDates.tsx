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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">When are your exams?</h2>
      <p className="text-muted-foreground mb-6">Set exam dates so we can plan your study schedule backwards.</p>

      <div className="space-y-4">
        {courses.map((course) => {
          const daysAway = course.examDate
            ? differenceInDays(new Date(course.examDate), new Date())
            : null;

          return (
            <div key={course.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 min-w-[140px]">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COURSE_COLORS[course.colorIndex].hex }} />
                <span className="font-medium text-sm truncate">{course.name}</span>
              </div>

              <div className="flex items-center gap-3 flex-1 flex-wrap">
                {!course.noExam && (
                  <Popover>
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
                        onSelect={(d) => updateCourse(course.id, { examDate: d || undefined })}
                        disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
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
