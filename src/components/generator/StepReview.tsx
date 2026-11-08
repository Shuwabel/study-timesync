import { useGeneratorStore } from '@/store/generatorStore';
import { COURSE_COLORS, DIFFICULTY_LABELS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Edit2 } from 'lucide-react';

interface Props {
  onGenerate: () => void;
  generating: boolean;
}

export default function StepReview({ onGenerate, generating }: Props) {
  const store = useGeneratorStore();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Review your plan</h2>
      <p className="text-muted-foreground mb-6">Check the details, then create your plan. It is saved in this browser.</p>

      <div className="space-y-4">
        {/* Timetable info */}
        {(store.timetableName || store.timetableDescription) && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Timetable</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => store.setStep(1)} className="gap-1 text-xs">
                <Edit2 className="h-3 w-3" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {store.timetableName && <p className="font-medium">{store.timetableName}</p>}
              {store.timetableDescription && <p className="text-muted-foreground">{store.timetableDescription}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Courses ({store.courses.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => store.setStep(1)} className="gap-1 text-xs">
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {store.courses.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COURSE_COLORS[c.colorIndex].hex }} />
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {c.noExam ? 'No exam' : c.examDate ? format(new Date(c.examDate), 'MMM d') : 'No date'}
                  {' · '}
                  {DIFFICULTY_LABELS[c.difficulty - 1]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Availability</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => store.setStep(4)} className="gap-1 text-xs">
              <Edit2 className="h-3 w-3" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Daily hours:</span> {store.dailyHours}h</p>
            <p><span className="text-muted-foreground">Preferred time:</span> {store.timePreference}</p>
            <p><span className="text-muted-foreground">Rest days:</span> {store.restDays.join(', ') || 'None'}</p>
            <p><span className="text-muted-foreground">Start date:</span> {format(store.startDate, 'PPP')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={generating}
          className="gap-2 text-base px-10 w-full sm:w-auto"
        >
          Create my plan
        </Button>
        <Button variant="ghost" size="sm" onClick={() => store.setStep(store.step - 1)}>
          Go back
        </Button>
      </div>
    </div>
  );
}
