import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getTimetableById, updateTimetable } from '@/lib/storage';
import { COURSE_COLORS } from '@/lib/constants';
import { StudySession, Timetable } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format, startOfWeek, parseISO, isSameDay, differenceInDays, isBefore } from 'date-fns';
import { Download, CalendarIcon, List, LayoutGrid, ChevronLeft, ChevronRight, Share2, Pencil, X, Check, Trash2, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';

export default function TimetableView() {
  const { id } = useParams<{ id: string }>();
  const [timetable, setTimetable] = useState<Timetable | undefined>(() => getTimetableById(id || ''));
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [weekOffset, setWeekOffset] = useState(0);
  const [editMode, setEditMode] = useState(false);

  const allDates = timetable?.sessions.map((s) => parseISO(s.date)) || [];
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const currentWeekStart = addDays(startOfWeek(minDate, { weekStartsOn: 1 }), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const sessionsByDate = useMemo(() => {
    if (!timetable) return {};
    const map: Record<string, StudySession[]> = {};
    timetable.sessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [timetable]);

  // Next upcoming exam
  const nextExam = useMemo(() => {
    if (!timetable) return null;
    const now = new Date();
    const upcoming = timetable.courses
      .filter((c) => c.examDate && !isBefore(new Date(c.examDate), now))
      .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime());
    return upcoming[0] || null;
  }, [timetable]);

  // Upcoming deadlines (exams within 30 days)
  const upcomingDeadlines = useMemo(() => {
    if (!timetable) return [];
    const now = new Date();
    return timetable.courses
      .filter((c) => c.examDate && !isBefore(new Date(c.examDate), now))
      .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime())
      .slice(0, 4);
  }, [timetable]);

  // Weekly total hours
  const weeklyTotalHours = useMemo(() => {
    let total = 0;
    weekDays.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const sessions = sessionsByDate[dateStr] || [];
      total += sessions.reduce((sum, s) => sum + s.duration, 0);
    });
    return total;
  }, [weekDays, sessionsByDate]);

  // Exam dates as map for calendar display
  const examDateMap = useMemo(() => {
    if (!timetable) return {};
    const map: Record<string, { courseName: string; colorIndex: number }[]> = {};
    timetable.courses.forEach((c) => {
      if (c.examDate) {
        const dateStr = format(new Date(c.examDate), 'yyyy-MM-dd');
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push({ courseName: c.name, colorIndex: c.colorIndex });
      }
    });
    return map;
  }, [timetable]);

  if (!timetable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-lg text-muted-foreground">Timetable not found.</p>
        <Link to="/generate"><Button>Create One</Button></Link>
      </div>
    );
  }

  const saveChanges = (updated: Timetable) => {
    setTimetable(updated);
    updateTimetable(updated);
  };

  const deleteSession = (sessionId: string) => {
    const updated = { ...timetable, sessions: timetable.sessions.filter((s) => s.id !== sessionId) };
    saveChanges(updated);
    toast.success('Session removed');
  };

  const updateSessionType = (sessionId: string, newType: 'Focus' | 'Review' | 'Practice') => {
    const updated = {
      ...timetable,
      sessions: timetable.sessions.map((s) => s.id === sessionId ? { ...s, sessionType: newType } : s),
    };
    saveChanges(updated);
  };

  const updateSessionDuration = (sessionId: string, newDuration: number) => {
    const updated = {
      ...timetable,
      sessions: timetable.sessions.map((s) => s.id === sessionId ? { ...s, duration: newDuration } : s),
    };
    saveChanges(updated);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(timetable.title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(timetable.createdAt), 'PPP')}`, 14, 28);
    let y = 38;
    const sortedDates = Object.keys(sessionsByDate).sort();
    for (const date of sortedDates) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text(format(parseISO(date), 'EEEE, MMM d'), 14, y);
      y += 6;
      doc.setFontSize(9);
      for (const s of sessionsByDate[date]) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(`${s.startTime} - ${s.courseName} (${s.duration}h ${s.sessionType})`, 20, y);
        y += 5;
        doc.text(`Tip: ${s.tip}`, 24, y);
        y += 6;
      }
      y += 4;
    }
    doc.save(`${timetable.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const exportICS = () => {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//StudySync//EN\n';
    timetable.sessions.forEach((s) => {
      const startH = parseInt(s.startTime.split(':')[0]);
      const startM = parseInt(s.startTime.split(':')[1]);
      const dStr = s.date.replace(/-/g, '');
      const startStr = `${dStr}T${String(startH).padStart(2, '0')}${String(startM).padStart(2, '0')}00`;
      const endH = startH + Math.floor(s.duration);
      const endM = startM + (s.duration % 1) * 60;
      const endStr = `${dStr}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;
      ics += `BEGIN:VEVENT\nDTSTART:${startStr}\nDTEND:${endStr}\nSUMMARY:${s.courseName} (${s.sessionType})\nDESCRIPTION:${s.tip}\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studysync.ics';
    a.click();
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const formatDaysRemaining = (examDate: Date) => {
    const days = differenceInDays(new Date(examDate), new Date());
    const hours = Math.floor((new Date(examDate).getTime() - new Date().getTime()) % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    if (days <= 0) return 'Today!';
    return `${days} Days, ${hours} Hours remaining`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Logo className="h-7 w-7" />
            <span>StudySync</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-20 pb-12">
        {/* Hero Header — Next Exam + Stats */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">Next Exam</p>
              {nextExam ? (
                <>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-1">
                    {nextExam.name}
                  </h1>
                  <p className="text-lg font-semibold text-primary mb-2">
                    {format(new Date(nextExam.examDate!), 'MMM d, yyyy')}
                  </p>
                  <p className="text-muted-foreground font-medium">
                    {formatDaysRemaining(nextExam.examDate!)}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-1">
                    {timetable.title}
                  </h1>
                  <p className="text-muted-foreground">No upcoming exams</p>
                </>
              )}
            </div>

            {/* Right side stats */}
            <div className="flex flex-col gap-3 min-w-[260px]">
              {/* Total Study Hours */}
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground mb-1">Total Study Hours</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-primary">{weeklyTotalHours}h</span>
                  <span className="text-sm text-muted-foreground">this week</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted mt-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (weeklyTotalHours / (timetable.preferences.dailyHours * 7)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Upcoming Deadlines */}
              {upcomingDeadlines.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">Upcoming Deadlines</p>
                  <div className="space-y-1">
                    {upcomingDeadlines.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COURSE_COLORS[c.colorIndex].hex }} />
                        <span className="text-muted-foreground truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">({format(new Date(c.examDate!), 'MMM d')})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-lg min-w-[200px] text-center">
              {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="gap-1"
            >
              {editMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editMode ? 'Done' : 'Edit'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')} className="gap-1">
              {view === 'calendar' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              {view === 'calendar' ? 'List' : 'Calendar'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportICS} className="gap-1">
              <CalendarIcon className="h-4 w-4" /> Sync Calendar
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <div>
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-t-xl overflow-hidden">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className={`py-3 px-2 text-center font-semibold text-sm ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-foreground'}`}>
                    {format(day, 'EEE d')}
                  </div>
                );
              })}
            </div>

            {/* Day Columns */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-b-xl overflow-hidden">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const sessions = sessionsByDate[dateStr] || [];
                const exams = examDateMap[dateStr] || [];
                const isToday = isSameDay(day, new Date());
                const isRestDay = timetable.preferences.restDays.includes(format(day, 'EEEE'));
                const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0);

                return (
                  <div
                    key={dateStr}
                    className={`min-h-[280px] p-2 flex flex-col gap-1.5 ${
                      isToday ? 'bg-primary/5' :
                      isRestDay && sessions.length === 0 ? 'bg-muted/30' :
                      'bg-card'
                    }`}
                  >
                    {/* Daily total */}
                    {totalHours > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-0.5">
                        <Clock className="h-3 w-3" />
                        {totalHours}h total
                      </div>
                    )}
                    {isRestDay && sessions.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">Rest day</p>
                    )}

                    {/* Exam badges */}
                    {exams.map((exam, i) => (
                      <div
                        key={i}
                        className="text-xs font-bold px-2 py-1.5 rounded-md text-white"
                        style={{ backgroundColor: COURSE_COLORS[exam.colorIndex].hex }}
                      >
                        📝 Exam
                        <p className="font-normal text-[10px] opacity-90 truncate">{exam.courseName}</p>
                      </div>
                    ))}

                    {/* Sessions */}
                    {sessions.map((s) => {
                      // Calculate end time
                      const [sh, sm] = s.startTime.split(':').map(Number);
                      const endMinutes = sh * 60 + sm + s.duration * 60;
                      const endH = Math.floor(endMinutes / 60);
                      const endM = endMinutes % 60;
                      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                      return (
                        <div
                          key={s.id}
                          className={`text-xs p-2 rounded-md relative group cursor-default transition-shadow hover:shadow-md ${editMode ? 'ring-1 ring-primary/20' : ''}`}
                          style={{
                            backgroundColor: COURSE_COLORS[s.colorIndex].hex + '22',
                            borderLeft: `4px solid ${COURSE_COLORS[s.colorIndex].hex}`,
                          }}
                          title={s.tip}
                        >
                          {editMode && (
                            <button
                              onClick={() => deleteSession(s.id)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                          <p className="font-semibold truncate" style={{ color: COURSE_COLORS[s.colorIndex].hex }}>
                            {s.courseName} {s.sessionType}
                          </p>
                          {editMode ? (
                            <div className="flex items-center gap-1 mt-1">
                              <Select value={String(s.duration)} onValueChange={(v) => updateSessionDuration(s.id, parseFloat(v))}>
                                <SelectTrigger className="h-5 text-[10px] w-14 px-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((d) => (
                                    <SelectItem key={d} value={String(d)} className="text-xs">{d}h</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select value={s.sessionType} onValueChange={(v) => updateSessionType(s.id, v as any)}>
                                <SelectTrigger className="h-5 text-[10px] w-16 px-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['Focus', 'Review', 'Practice'].map((t) => (
                                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <p className="text-muted-foreground mt-0.5">
                              {s.startTime} - {endTime} ({s.duration}h) · {s.sessionType}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Course Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border">
              {timetable.courses.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COURSE_COLORS[c.colorIndex].hex }} />
                  <span className="text-muted-foreground font-medium">{c.name}</span>
                  {c.examDate && (
                    <span className="text-[10px] text-muted-foreground">
                      (Exam: {format(new Date(c.examDate), 'MMM d')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="space-y-6 max-w-2xl">
            {Object.keys(sessionsByDate).sort().map((date) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{format(parseISO(date), 'EEEE, MMMM d')}</h3>
                  <span className="text-xs font-medium text-primary">
                    {sessionsByDate[date].reduce((s, x) => s + x.duration, 0)}h total
                  </span>
                </div>
                <div className="space-y-2">
                  {sessionsByDate[date].map((s) => (
                    <div
                      key={s.id}
                      className={`rounded-lg border bg-card p-3 flex items-start gap-3 relative group ${editMode ? 'ring-1 ring-primary/20' : ''}`}
                    >
                      <div className="w-1 h-full min-h-[40px] rounded-full self-stretch" style={{ backgroundColor: COURSE_COLORS[s.colorIndex].hex }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{s.courseName}</p>
                        {editMode ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Select value={String(s.duration)} onValueChange={(v) => updateSessionDuration(s.id, parseFloat(v))}>
                              <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((d) => (
                                  <SelectItem key={d} value={String(d)} className="text-xs">{d}h</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={s.sessionType} onValueChange={(v) => updateSessionType(s.id, v as any)}>
                              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['Focus', 'Review', 'Practice'].map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSession(s.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">{s.startTime} · {s.duration}h · {s.sessionType}</p>
                            <p className="text-xs text-muted-foreground mt-1 italic">💡 {s.tip}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
