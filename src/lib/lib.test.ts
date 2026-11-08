import { describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import { generateTimetable } from './timetableGenerator';
import { buildICS } from './ics';
import { decodePlan, encodePlan } from './share';
import {
  dayKey,
  examDayKey,
  moveSession,
  overdueSessions,
  planWarnings,
  progress,
  removeSession,
  rescheduleOverdue,
  setSessionStatus,
  toMinutes,
  updateSession,
  upcomingExams,
} from './schedule';
import type { Course, Timetable } from './types';

const start = new Date(2026, 10, 9, 12, 0, 0); // Mon 9 Nov 2026

function course(id: string, name: string, colorIndex: number, examInDays?: number): Course {
  return {
    id,
    name,
    colorIndex,
    noExam: examInDays === undefined,
    examDate: examInDays === undefined ? undefined : addDays(new Date(2026, 10, 9), examInDays),
    priority: colorIndex,
    difficulty: 3,
  };
}

function makePlan(): Timetable {
  return generateTimetable(
    [course('a', 'Calculus', 0, 8), course('b', 'Biology', 1, 16), course('c', 'History', 2)],
    4,
    'Morning',
    ['Sunday'],
    start,
    'Finals',
  );
}

describe('generateTimetable', () => {
  const plan = makePlan();

  it('never schedules a course on or after its own exam day', () => {
    for (const s of plan.sessions) {
      const c = plan.courses.find((x) => x.id === s.courseId)!;
      const exam = examDayKey(c);
      if (exam) expect(s.date < exam).toBe(true);
    }
  });

  it('never schedules on a rest day', () => {
    for (const s of plan.sessions) {
      const [y, m, d] = s.date.split('-').map(Number);
      expect(new Date(y, m - 1, d).getDay()).not.toBe(0);
    }
  });

  it('ends every session before midnight, even on long days', () => {
    const long = generateTimetable([course('a', 'A', 0, 5), course('b', 'B', 1, 5)], 10, 'Evening', [], start);
    for (const s of long.sessions) {
      expect(toMinutes(s.startTime) + s.duration * 60).toBeLessThanOrEqual(24 * 60);
    }
  });
});

describe('buildICS', () => {
  const ics = buildICS(makePlan(), new Date(Date.UTC(2026, 10, 9, 8, 0, 0)));

  it('is a CRLF calendar with a UID and DTSTAMP on every event', () => {
    const events = ics.split('BEGIN:VEVENT').length - 1;
    expect(events).toBeGreaterThan(0);
    expect(ics.split('UID:').length - 1).toBe(events);
    expect(ics.split('DTSTAMP:').length - 1).toBe(events);
    expect(ics).toContain('\r\n');
    expect(ics.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });

  it('has valid times and an end after every start', () => {
    const starts = [...ics.matchAll(/DTSTART:(\d{8})T(\d{2})(\d{2})00/g)];
    const ends = [...ics.matchAll(/DTEND:(\d{8})T(\d{2})(\d{2})00/g)];
    expect(starts.length).toBe(ends.length);
    starts.forEach((s, i) => {
      expect(Number(ends[i][3])).toBeLessThan(60);
      expect(Number(ends[i][2])).toBeLessThan(24);
      expect(ends[i][0].slice(6) > s[0].slice(8)).toBe(true);
    });
  });

  it('adds all-day exam events that end the next day', () => {
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20261117\r\nDTEND;VALUE=DATE:20261118/);
  });

  it('leaves skipped sessions out', () => {
    const plan = makePlan();
    const skipped = setSessionStatus(plan, plan.sessions[0].id, 'skipped');
    expect(buildICS(skipped).split('BEGIN:VEVENT').length).toBe(buildICS(plan).split('BEGIN:VEVENT').length - 1);
  });
});

describe('share link', () => {
  it('round-trips a plan through the link token', async () => {
    const plan = makePlan();
    const token = await encodePlan(plan);
    expect(token.startsWith('z.') || token.startsWith('p.')).toBe(true);
    const back = await decodePlan(token);
    expect(back?.id).toBe(plan.id);
    expect(back?.sessions.length).toBe(plan.sessions.length);
  });

  it('rejects junk', async () => {
    expect(await decodePlan('z.not-a-plan')).toBeNull();
    expect(await decodePlan('')).toBeNull();
  });
});

describe('editing and rescheduling', () => {
  const today = dayKey(addDays(new Date(2026, 10, 9), 3)); // Thu 12 Nov

  it('finds missed sessions', () => {
    const plan = makePlan();
    const missed = overdueSessions(plan, today);
    expect(missed.length).toBeGreaterThan(0);
    expect(missed.every((s) => s.date < today)).toBe(true);
  });

  it('moves missed sessions to today or later, before their exam', () => {
    const plan = makePlan();
    const { timetable, moved } = rescheduleOverdue(plan, today);
    expect(moved).toBeGreaterThan(0);
    expect(overdueSessions(timetable, today)).toHaveLength(0);
    for (const s of timetable.sessions.filter((x) => !x.status)) {
      const exam = examDayKey(plan.courses.find((c) => c.id === s.courseId)!);
      if (exam) expect(s.date < exam).toBe(true);
    }
  });

  it('drops missed sessions whose exam has passed', () => {
    const plan = makePlan();
    const late = dayKey(addDays(new Date(2026, 10, 9), 12));
    const { timetable, dropped } = rescheduleOverdue(plan, late);
    expect(dropped).toBeGreaterThan(0);
    expect(timetable.sessions.some((s) => s.status === 'skipped')).toBe(true);
  });

  it('re-packs a day when a session gets longer, with no overlaps', () => {
    const plan = makePlan();
    const first = plan.sessions[0];
    const next = updateSession(plan, first.id, { duration: 3 });
    const day = next.sessions.filter((s) => s.date === first.date).sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < day.length; i++) {
      expect(toMinutes(day[i].startTime)).toBeGreaterThanOrEqual(toMinutes(day[i - 1].startTime) + day[i - 1].duration * 60);
    }
  });

  it('removing a session closes the gap', () => {
    const plan = makePlan();
    const first = plan.sessions[0];
    const next = removeSession(plan, first.id);
    const day = next.sessions.filter((s) => s.date === first.date);
    expect(Math.min(...day.map((s) => toMinutes(s.startTime)))).toBe(toMinutes(first.startTime));
  });

  it('moving a session puts it after the last one on the new day', () => {
    const plan = makePlan();
    const s = plan.sessions[0];
    const target = '2026-11-14';
    const moved = moveSession(plan, s.id, target);
    const after = moved.sessions.find((x) => x.id === s.id)!;
    expect(after.date).toBe(target);
    const others = moved.sessions.filter((x) => x.date === target && x.id !== s.id);
    if (others.length) expect(toMinutes(after.startTime)).toBeGreaterThanOrEqual(Math.max(...others.map((o) => toMinutes(o.startTime) + o.duration * 60)));
  });
});

describe('progress and exams', () => {
  it('counts done hours and ignores skipped ones', () => {
    let plan = makePlan();
    const [a, b] = plan.sessions;
    plan = setSessionStatus(plan, a.id, 'done');
    plan = setSessionStatus(plan, b.id, 'skipped');
    const p = progress(plan);
    expect(p.doneHours).toBe(a.duration);
    expect(p.sessionsDone).toBe(1);
    expect(p.plannedHours).toBeCloseTo(plan.sessions.reduce((n, s) => n + s.duration, 0) - b.duration);
  });

  it('lists exams soonest first with days left', () => {
    const exams = upcomingExams(makePlan(), '2026-11-09');
    expect(exams.map((e) => e.course.name)).toEqual(['Calculus', 'Biology']);
    expect(exams[0].daysLeft).toBe(8);
  });

  it('warns when an exam is too close for enough sessions', () => {
    const tight = generateTimetable([course('a', 'Calculus', 0, 1)], 4, 'Morning', [], start);
    expect(planWarnings(tight).length).toBeGreaterThan(0);
    expect(planWarnings(makePlan())).toEqual([]);
  });
});
