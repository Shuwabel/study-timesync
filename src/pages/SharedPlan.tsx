import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { decodePlan } from '@/lib/share';
import { importTimetable } from '@/lib/storage';
import type { Timetable } from '@/lib/types';

/** Opens a plan from a share link (the plan is inside the #fragment) and saves a copy locally. */
export default function SharedPlan() {
  const navigate = useNavigate();
  const [state, setState] = useState<'loading' | 'bad'>('loading');
  const [plan, setPlan] = useState<Timetable | null>(null);

  useEffect(() => {
    const token = window.location.hash.replace(/^#/, '');
    if (!token) {
      setState('bad');
      return;
    }
    decodePlan(token).then((decoded) => {
      if (!decoded) {
        setState('bad');
        return;
      }
      setPlan(decoded);
    });
  }, []);

  const open = () => {
    if (!plan) return;
    const saved = importTimetable(plan);
    navigate(`/timetable/${saved.id}`, { replace: true });
  };

  return (
    <AppShell width="max-w-3xl">
      <section className="border border-border bg-card p-6 md:p-10">
        {plan ? (
          <>
            <h1 className="font-display text-4xl font-bold uppercase leading-none">{plan.title}</h1>
            <p className="mt-3 max-w-prose text-muted-foreground">
              Someone shared this plan with you: {plan.courses.length} course{plan.courses.length === 1 ? '' : 's'} and {plan.sessions.length} sessions. Opening it saves a copy in this browser. Your changes stay with your copy.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={open}>
                Open and save a copy
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/today">Not now</Link>
              </Button>
            </div>
          </>
        ) : state === 'bad' ? (
          <>
            <h1 className="font-display text-4xl font-bold uppercase leading-none">This link is not a plan</h1>
            <p className="mt-3 max-w-prose text-muted-foreground">
              The link may have been cut short when it was copied. Ask for the share link again, or create your own plan.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/generate">Create a plan</Link>
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground" role="status">
            Reading the plan...
          </p>
        )}
      </section>
    </AppShell>
  );
}
