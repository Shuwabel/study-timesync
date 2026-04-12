import { useGeneratorStore } from '@/store/generatorStore';
import { DAYS_OF_WEEK, TIME_PREFERENCES } from '@/lib/constants';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StepAvailability() {
  const { dailyHours, setDailyHours, timePreference, setTimePreference, restDays, setRestDays, startDate, setStartDate } = useGeneratorStore();

  const toggleRestDay = (day: string) => {
    setRestDays(restDays.includes(day) ? restDays.filter((d) => d !== day) : [...restDays, day]);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Your availability</h2>
      <p className="text-muted-foreground mb-6">Tell us how much time you can dedicate to studying.</p>

      <div className="space-y-8">
        {/* Daily hours */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            Daily study hours: <span className="text-primary font-bold">{dailyHours}h</span>
          </label>
          <Slider
            min={0.5}
            max={12}
            step={0.5}
            value={[dailyHours]}
            onValueChange={([v]) => setDailyHours(v)}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0.5h</span><span>12h</span>
          </div>
        </div>

        {/* Time preference */}
        <div>
          <label className="text-sm font-medium mb-3 block">Preferred study time</label>
          <div className="flex flex-wrap gap-2">
            {TIME_PREFERENCES.map((t) => (
              <Button
                key={t}
                variant={timePreference === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimePreference(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Rest days */}
        <div>
          <label className="text-sm font-medium mb-3 block">Rest days (no studying)</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((d) => (
              <Button
                key={d}
                variant={restDays.includes(d) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleRestDay(d)}
              >
                {d.slice(0, 3)}
              </Button>
            ))}
          </div>
        </div>

        {/* Start date */}
        <div>
          <label className="text-sm font-medium mb-3 block">Start date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-[220px] justify-start text-left')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
