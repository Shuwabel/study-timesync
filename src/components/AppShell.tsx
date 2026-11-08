import { NavLink, Link } from 'react-router-dom';
import { CalendarCheck, LayoutList, Plus } from 'lucide-react';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/dashboard', label: 'Plans', icon: LayoutList },
  { to: '/generate', label: 'New plan', icon: Plus },
];

/** Top bar on every screen, plus a bottom tab bar on phones. */
export default function AppShell({
  children,
  width = 'max-w-6xl',
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className={cn('mx-auto flex h-14 items-center justify-between px-4', width)}>
          <Link to="/" className="flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight">
            <Logo className="h-6 w-6" />
            <span>StudySync</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded px-3 py-2 text-sm font-semibold transition-colors',
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className={cn('mx-auto px-4 py-6 md:py-8', width)}>
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
