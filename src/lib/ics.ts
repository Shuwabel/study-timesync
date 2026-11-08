import { StudySession, Timetable } from './types';
import { durationMinutes, examDayKey, toMinutes } from './schedule';

const pad = (n: number) => String(n).padStart(2, '0');

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545: lines longer than 75 octets continue on the next line after a space. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 0) {
    parts.push(' ' + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return parts.join('\r\n');
}

/** Floating local date-time, e.g. 20261109T093000. Minutes may exceed 24h and roll over. */
function localStamp(date: string, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(y, m - 1, d, 0, 0, 0);
  base.setMinutes(minutes);
  return `${base.getFullYear()}${pad(base.getMonth() + 1)}${pad(base.getDate())}T${pad(base.getHours())}${pad(base.getMinutes())}00`;
}

function utcStamp(now: Date): string {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
}

export function buildICS(tt: Timetable, now: Date = new Date()): string {
  const stamp = utcStamp(now);
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StudySync//Study timetable//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeText(tt.title)}`];

  const sessions: StudySession[] = tt.sessions.filter((s) => s.status !== 'skipped');
  for (const s of sessions) {
    const start = toMinutes(s.startTime);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}-${tt.id}@studysync`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${localStamp(s.date, start)}`,
      `DTEND:${localStamp(s.date, start + durationMinutes(s))}`,
      `SUMMARY:${escapeText(`${s.courseName}: ${s.sessionType}`)}`,
      `DESCRIPTION:${escapeText(s.tip)}`,
      'END:VEVENT',
    );
  }

  for (const course of tt.courses) {
    const day = examDayKey(course);
    if (!day) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:exam-${course.id}-${tt.id}@studysync`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${nextDay(day)}`,
      `SUMMARY:${escapeText(`Exam: ${course.name}`)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadICS(tt: Timetable): void {
  const blob = new Blob([buildICS(tt)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tt.title.replace(/[^a-zA-Z0-9]+/g, '_') || 'studysync'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
