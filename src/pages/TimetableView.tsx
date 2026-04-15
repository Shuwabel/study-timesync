import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getTimetableById, updateTimetable } from '@/lib/storage';
import { COURSE_COLORS } from '@/lib/constants';
import { StudySession, Timetable } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, format, startOfWeek, parseISO, isSameDay } from 'date-fns';
import { Download, CalendarIcon, List, LayoutGrid, ChevronLeft, ChevronRight, Share2, Pencil, X, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import Logo from '@/components/Logo';

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

  const SessionCard = ({ s, compact }: { s: StudySession; compact?: boolean }) => (
    <div
      className={`text-xs p-1.5 rounded relative group ${editMode ? 'ring-1 ring-primary/20' : ''}`}
      style={{ backgroundColor: COURSE_COLORS[s.colorIndex].hex + '20', borderLeft: `3px solid ${COURSE_COLORS[s.colorIndex].hex}` }}
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
      <p className="font-medium truncate">{s.courseName}</p>
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
        <p className="text-muted-foreground">{s.startTime} · {s.duration}h · {s.sessionType}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Logo className="h-7 w-7" />
            <span>StudySync</span>
          </Link>
          <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{timetable.title}</h1>
            {timetable.description && <p className="text-sm text-muted-foreground">{timetable.description}</p>}
            <p className="text-sm text-muted-foreground">
              {timetable.courses.length} courses · {timetable.sessions.length} sessions · Created {format(new Date(timetable.createdAt), 'PPP')}
            </p>
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
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportICS} className="gap-1">
              <CalendarIcon className="h-4 w-4" /> .ics
            </Button>
            <Button variant="outline" size="sm" onClick={shareLink} className="gap-1">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        {view === 'calendar' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-sm">
                {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const sessions = sessionsByDate[dateStr] || [];
                const isToday = isSameDay(day, new Date());
                const isRestDay = timetable.preferences.restDays.includes(format(day, 'EEEE'));
                const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0);
                return (
                  <div
                    key={dateStr}
                    className={`min-h-[120px] rounded-lg border p-2 ${
                      isToday ? 'border-primary bg-primary/5' :
                      isRestDay && sessions.length === 0 ? 'border-border bg-muted/50' :
                      'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                        {format(day, 'EEE d')}
                      </p>
                      {totalHours > 0 && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          {totalHours}h
                        </span>
                      )}
                    </div>
                    {isRestDay && sessions.length === 0 && (
                      <p className="text-[10px] text-muted-foreground italic">Rest day</p>
                    )}
                    <div className="space-y-1">
                      {sessions.map((s) => <SessionCard key={s.id} s={s} compact />)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Course Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
              {timetable.courses.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COURSE_COLORS[c.colorIndex].hex }} />
                  <span className="text-muted-foreground">{c.name}</span>
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
                <h3 className="font-semibold text-sm mb-2">{format(parseISO(date), 'EEEE, MMMM d')}</h3>
                <div className="space-y-2">
                  {sessionsByDate[date].map((s) => (
                    <Card key={s.id} className={`relative group ${editMode ? 'ring-1 ring-primary/20' : ''}`}>
                      <CardContent className="flex items-start gap-3 py-3 px-4">
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
                      </CardContent>
                    </Card>
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
