import { format, parseISO } from 'date-fns';
import { endTime, formatDuration, groupByDate } from './schedule';
import type { Timetable } from './types';

/** Printable plan. jsPDF is loaded only when someone exports. */
export async function exportPDF(tt: Timetable): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(tt.title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Created ${format(new Date(tt.createdAt), 'PPP')}`, 14, 28);

  let y = 38;
  const byDate = groupByDate(tt.sessions.filter((s) => s.status !== 'skipped'));
  for (const date of Object.keys(byDate).sort()) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.text(format(parseISO(date), 'EEEE, MMM d'), 14, y);
    y += 6;
    doc.setFontSize(9);
    for (const s of byDate[date]) {
      if (y > 272) {
        doc.addPage();
        y = 20;
      }
      const mark = s.status === 'done' ? '[x]' : '[ ]';
      doc.text(`${mark} ${s.startTime}-${endTime(s)}  ${s.courseName} (${formatDuration(s.duration)}, ${s.sessionType})`, 20, y);
      y += 5;
      const tip = doc.splitTextToSize(`Tip: ${s.tip}`, 165) as string[];
      doc.text(tip, 26, y);
      y += 5 * tip.length + 1;
    }
    y += 4;
  }
  doc.save(`${tt.title.replace(/[^a-zA-Z0-9]+/g, '_') || 'studysync'}.pdf`);
}
