import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeneratorStore } from '@/store/generatorStore';
import { generateTimetable } from '@/lib/timetableGenerator';
import { saveTimetable } from '@/lib/storage';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import StepCourses from '@/components/generator/StepCourses';
import StepExamDates from '@/components/generator/StepExamDates';
import StepDifficulty from '@/components/generator/StepDifficulty';
import StepAvailability from '@/components/generator/StepAvailability';
import StepReview from '@/components/generator/StepReview';
import { useState } from 'react';

const STEP_LABELS = ['Courses', 'Exam Dates', 'Difficulty', 'Availability', 'Review'];
const TOTAL_STEPS = 5;

export default function Generate() {
  const navigate = useNavigate();
  const store = useGeneratorStore();
  const [generating, setGenerating] = useState(false);

  const canNext = () => {
    if (store.step === 1) {
      const allNamed = store.courses.every((c) => c.name.trim() !== '');
      if (!allNamed) return false;
      const names = store.courses.map((c) => c.name.trim().toLowerCase());
      const hasDuplicates = new Set(names).size !== names.length;
      return !hasDuplicates;
    }
    if (store.step === 2) {
      return store.courses.every((c) => c.examDate || c.noExam);
    }
    return true;
  };

  const handleBack = () => {
    if (store.step === 1) {
      navigate('/');
    } else {
      store.setStep(store.step - 1);
    }
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const tt = generateTimetable(
        store.courses,
        store.dailyHours,
        store.timePreference,
        store.restDays,
        store.startDate,
        store.timetableName,
        store.timetableDescription
      );
      saveTimetable(tt);
      store.reset();
      navigate(`/timetable/${tt.id}`);
    }, 1500);
  };

  const stepContent = () => {
    switch (store.step) {
      case 1: return <StepCourses />;
      case 2: return <StepExamDates />;
      case 3: return <StepDifficulty />;
      case 4: return <StepAvailability />;
      case 5: return <StepReview onGenerate={handleGenerate} generating={generating} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Logo className="h-7 w-7" />
            <span>StudySync</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            {STEP_LABELS.map((label, i) => (
              <span
                key={label}
                className={`hidden sm:block font-medium transition-colors ${
                  i + 1 <= store.step ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            ))}
            <span className="sm:hidden text-muted-foreground">
              Step {store.step} of {TOTAL_STEPS} — {STEP_LABELS[store.step - 1]}
            </span>
          </div>
          <Progress value={(store.step / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {/* Loading overlay */}
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-semibold">Generating your timetable...</p>
                <p className="text-sm text-muted-foreground mt-1">Our AI is crafting the perfect plan</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={store.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {stepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        {store.step < TOTAL_STEPS && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => store.setStep(store.step + 1)}
              disabled={!canNext()}
              className="gap-2"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
