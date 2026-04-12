import { useParams, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { getTimetableById } from '@/lib/storage';
import { COURSE_COLORS, DAYS_OF_WEEK } from '@/lib/constants';
import { StudySession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { addDays, format, startOfWeek, parseISO, isSameDay } from 'date-fns';
import { GraduationCap, Download, CalendarIcon, List, LayoutGrid, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function TimetableView() {
  const { id } = useParams<{ id: string }>();
  const timetable = getTimetableById(id || '');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [weekOffset, setWeekOffset] = useState(0);

  if (!timetable) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-lg text-muted-foreground">Timetable not found.</p>
        <Link to="/generate"><Button>Create One</Button></Link>
      </div>
    );
  }

  const allDates = timetable.sessions.map((s) => parseISO(s.date));
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const currentWeekStart = addDays(startOfWeek(minDate, { weekStartsOn: 1 }), weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const sessionsByDate = useMemo(() => {
    const map: Record<string, StudySession[]> = {};
    timetable.sessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [timetable]);

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

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>StudySync</span>
          </Link>
          <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{timetable.title}</h1>
            <p className="text-sm text-muted-foreground">
              {timetable.courses.length} courses · {timetable.sessions.length} sessions · Created {format(new Date(timetable.createdAt), 'PPP')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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
                return (
                  <div
                    key={dateStr}
                    className={`min-h-[120px] rounded-lg border p-2 ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                  >
                    <p className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {format(day, 'EEE d')}
                    </p>
                    <div className="space-y-1">
                      {sessions.map((s) => (
                        <div
                          key={s.id}
                          className="text-xs p-1.5 rounded"
                          style={{ backgroundColor: COURSE_COLORS[s.colorIndex].hex + '20', borderLeft: `3px solid ${COURSE_COLORS[s.colorIndex].hex}` }}
                          title={s.tip}
                        >
                          <p className="font-medium truncate">{s.courseName}</p>
                          <p className="text-muted-foreground">{s.startTime} · {s.duration}h · {s.sessionType}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
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
                    <Card key={s.id}>
                      <CardContent className="flex items-start gap-3 py-3 px-4">
                        <div className="w-1 h-full min-h-[40px] rounded-full self-stretch" style={{ backgroundColor: COURSE_COLORS[s.colorIndex].hex }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{s.courseName}</p>
                          <p className="text-xs text-muted-foreground">{s.startTime} · {s.duration}h · {s.sessionType}</p>
                          <p className="text-xs text-muted-foreground mt-1 italic">💡 {s.tip}</p>
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
