import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Logo from '@/components/Logo';
import RouteChip from '@/components/RouteChip';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { createSamplePlan } from '@/lib/sample';
import { getTimetables, saveTimetable } from '@/lib/storage';

const BOARD = [
  { time: '14:00', route: 1, color: 0, course: 'Calculus II', note: 'Focus · 1h 30m' },
  { time: '15:30', route: 2, color: 1, course: 'Organic Chemistry', note: 'Review · 1h 15m' },
  { time: '16:45', route: 3, color: 2, course: 'Modern History', note: 'Practice · 1h' },
];

const STEPS = [
  { title: 'List your courses and exam dates', body: 'Say how hard each one is and how many hours a day you can give.' },
  { title: 'Get a day-by-day plan', body: 'Hours go to the exams that are closest and hardest. Rest days stay free.' },
  { title: 'Follow it, and fix it when life happens', body: 'Tick sessions off, skip one, or move everything you missed with one tap.' },
];

export default function Index() {
  const navigate = useNavigate();

  // Returning students go straight to their day.
  if (getTimetables().length > 0) return <Navigate to="/today" replace />;

  const trySample = () => {
    saveTimetable(createSamplePlan());
    navigate('/today');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight">
            <Logo className="h-6 w-6" />
            <span>StudySync</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/generate">Create my plan</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="font-display text-6xl font-bold uppercase leading-[0.92] tracking-tight md:text-8xl">
              Plan backwards from exam day
            </h1>
            <p className="mt-5 max-w-prose text-lg text-muted-foreground md:text-xl">
              Give StudySync your courses and exam dates. It fills every day before them with study sessions, then helps you stay on track. No account. Your plan stays in your browser.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/generate">
                  Create my plan <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={trySample}>
                Try a sample plan
              </Button>
            </div>
          </div>

          <div className="bg-signal p-5 text-signal-foreground md:p-6" role="img" aria-label="Example of one day on a plan: three study sessions with start times">
            <p className="font-semibold">Sample day</p>
            <ul className="mt-2" aria-hidden="true">
              {BOARD.map((row) => (
                <li key={row.time} className="flex items-center gap-4 border-t border-signal-foreground/30 py-3">
                  <span className="timeface w-20 text-4xl font-bold leading-none">{row.time}</span>
                  <RouteChip colorIndex={row.color} label={row.route} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold leading-tight">{row.course}</span>
                    <span className="block text-sm">{row.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <h2 className="font-display text-4xl font-bold uppercase leading-none tracking-tight md:text-5xl">How it works</h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <RouteChip colorIndex={[0, 1, 2][i]} label={i + 1} className="h-8 min-w-8 text-lg" />
                  <div>
                    <h3 className="text-lg font-bold leading-tight">{step.title}</h3>
                    <p className="mt-1 text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-8 max-w-prose text-muted-foreground">
              The schedule comes from a fixed set of rules (days to each exam, difficulty, your daily hours and rest days), not from AI. Export it to PDF or your calendar app, or send a link to a friend.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
