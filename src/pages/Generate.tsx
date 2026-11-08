import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import StepCourses from '@/components/generator/StepCourses';
import StepExamDates from '@/components/generator/StepExamDates';
import StepDifficulty from '@/components/generator/StepDifficulty';
import StepAvailability from '@/components/generator/StepAvailability';
import StepReview from '@/components/generator/StepReview';
import { Button } from '@/components/ui/button';
import { useGeneratorStore } from '@/store/generatorStore';
import { generateTimetable } from '@/lib/timetableGenerator';
import { saveTimetable } from '@/lib/storage';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Courses', 'Exam dates', 'Difficulty', 'Availability', 'Review'];
const TOTAL_STEPS = STEP_LABELS.length;

export default function Generate() {
  const navigate = useNavigate();
  const store = useGeneratorStore();
  const reduceMotion = useReducedMotion();
  const [generating, setGenerating] = useState(false);
  const [attemptedNext, setAttemptedNext] = useState(false);

  const namesProblem = (() => {
    if (store.courses.some((c) => c.name.trim() === '')) return 'Give every course a name, or remove the empty ones.';
    const names = store.courses.map((c) => c.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) return 'Two courses share a name. Each course needs its own.';
    return null;
  })();

  const canNext = () => {
    if (store.step === 1) return namesProblem === null;
    if (store.step === 2) return store.courses.every((c) => c.examDate || c.noExam);
    return true;
  };

  const handleBack = () => {
    if (store.step === 1) navigate(-1);
    else store.setStep(store.step - 1);
  };

  const handleNext = () => {
    if (!canNext()) {
      setAttemptedNext(true);
      return;
    }
    setAttemptedNext(false);
    store.setStep(store.step + 1);
  };

  const handleGenerate = () => {
    if (generating) return;
    setGenerating(true);
    const tt = generateTimetable(
      store.courses,
      store.dailyHours,
      store.timePreference,
      store.restDays,
      store.startDate,
      store.timetableName,
      store.timetableDescription,
    );
    saveTimetable(tt);
    store.reset();
    navigate(`/timetable/${tt.id}`);
  };

  const stepContent = () => {
    switch (store.step) {
      case 1: return <StepCourses />;
      case 2: return <StepExamDates showValidation={attemptedNext} />;
      case 3: return <StepDifficulty />;
      case 4: return <StepAvailability />;
      case 5: return <StepReview onGenerate={handleGenerate} generating={generating} />;
      default: return null;
    }
  };

  return (
    <AppShell width="max-w-2xl">
      <h1 className="sr-only">Create a plan</h1>
      <nav aria-label="Steps" className="mb-8">
        <ol className="grid grid-cols-5 gap-1">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const state = n < store.step ? 'done' : n === store.step ? 'current' : 'todo';
            return (
              <li key={label} aria-current={state === 'current' ? 'step' : undefined}>
                <div className={cn('h-1.5', state === 'todo' ? 'bg-muted' : 'bg-foreground')} />
                <p className={cn('mt-1.5 text-xs font-semibold sm:text-sm', state === 'current' ? 'text-foreground' : 'text-muted-foreground')}>
                  <span className="sm:hidden">{state === 'current' ? label : n}</span>
                  <span className="hidden sm:inline">
                    {n}. {label}
                  </span>
                </p>
              </li>
            );
          })}
        </ol>
      </nav>

      {store.step === 1 && attemptedNext && namesProblem && (
        <p role="alert" className="mb-4 border border-destructive p-3 text-sm font-medium text-destructive">
          {namesProblem}
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={store.step}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {stepContent()}
        </motion.div>
      </AnimatePresence>

      {store.step < TOTAL_STEPS && (
        <div className="mt-8 flex justify-between gap-3">
          <Button variant="outline" size="lg" onClick={handleBack}>
            <ArrowLeft /> Back
          </Button>
          <Button size="lg" onClick={handleNext}>
            Next <ArrowRight />
          </Button>
        </div>
      )}
    </AppShell>
  );
}
