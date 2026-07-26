// ics.ts — the plan, handed to a calendar the student already owns.
//
// PathWise has no account, no server, no mail service and no cron, so it cannot send a reminder
// itself. What it can do is write a standards-compliant calendar file in the browser and let a tool
// the student already trusts do the reminding. Everything here is pure: same steps in, same bytes
// out, no clock read, no network, nothing stored.
//
// Two decisions worth stating, because they shape the whole file:
//
//   1. The PRIMARY event sits on the student's EFFECTIVE date — the day they have to start — not on
//      the office's hard deadline. Google Calendar is inconsistent about honouring VALARMs on an
//      imported file (Outlook honours them), so the reminder that must not be missed is the one the
//      calendar produces by itself: its own default notification on the event's own day. Put the
//      event on the day that matters and the default reminder is already in the right place.
//   2. The urgency is written into the SUMMARY, because the summary is the one field every client
//      shows in every view — list, month grid, notification banner, watch face. "Act by today:
//      request the I-20 extension (hard deadline 18 Aug)" survives all of them; a colour or a
//      priority flag does not.
//
// VALARMs are still emitted, as a bonus for the clients that honour them — never as the mechanism.
//
// Every DESCRIPTION is a briefing, never a label: why this date and not the office's, what the lead
// time is for, what happens if it slips, and the regulation it all rests on.

import type { DecidingOffice, Finding, ISODate } from './types';
import type { NextStep } from './engines/next-steps';
import { formatStepDate, OFFICE_PROSE } from './engines/next-steps';

// ---- RFC 5545 mechanics ---------------------------------------------------------------------

const CRLF = '\r\n';

/** Content lines are folded at 75 OCTETS, not characters (RFC 5545 §3.1). */
const OCTET_LIMIT = 75;

/**
 * Escalating nudges before the act-by date, for the clients that honour alarms. Exported because the
 * explainer on screen names these offsets out loud, and a sentence that lists them from its own copy
 * of the array is a sentence that will eventually describe a file that no longer matches it.
 */
export const DEFAULT_ALARM_OFFSETS_DAYS = [14, 3, 1];

/**
 * Events written per dated step: the student's act-by date, and the office's own hard deadline. The
 * count is quoted on screen ("N events across M deadlines"), so it is stated here, once, next to the
 * loop that emits them.
 */
export const EVENTS_PER_DATED_STEP = 2;

const PRODUCT_ID = '-//PathWise//Student deadlines//EN';

const DOMAIN_LABEL: Record<Finding['domain'], string> = {
  immigration: 'Immigration (F-1)',
  residency: 'Residency',
  aid: 'Financial aid',
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface IcsOptions {
  /** The date the plan was computed — the same asOf every engine on the page ran with. */
  asOf: ISODate;
  /** Shown by clients that support it, as the name of the imported calendar. */
  calendarName?: string;
  /** Days before the act-by date to fire alarms, for clients that honour them. */
  alarmOffsetsDays?: number[];
  /**
   * DTSTAMP, as a UTC timestamp. Defaults to midnight on `asOf` rather than the wall clock, so two
   * downloads of an unchanged plan produce byte-identical files and the function stays pure.
   */
  generatedAt?: string;
  productId?: string;
}

/** A step that has both dates, and therefore belongs in a calendar. */
export type DatedStep = NextStep & { deadline: ISODate; effectiveDeadline: ISODate };

/** The steps a calendar can carry: the ones with a real date behind them. */
export function calendarSteps(steps: NextStep[]): DatedStep[] {
  return steps.filter((s): s is DatedStep => Boolean(s.deadline && s.effectiveDeadline));
}

// ---- text escaping, folding, dates ------------------------------------------------------------

/**
 * Control characters cannot appear in a content line at all. CR and LF survive this pass — they are
 * escaped into a literal "\n" by `esc` rather than dropped.
 */
function stripControls(value: string): string {
  let out = '';
  for (const ch of value) {
    const cp = ch.codePointAt(0) as number;
    const isControl = (cp < 0x20 && cp !== 0x0a && cp !== 0x0d) || cp === 0x7f;
    if (!isControl) out += ch;
  }
  return out;
}

/** TEXT values escape backslash, semicolon, comma and newline (RFC 5545 §3.3.11). */
function esc(value: string): string {
  return stripControls(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Octets a single code point occupies once encoded as UTF-8. */
function octets(codePoint: string): number {
  const cp = codePoint.codePointAt(0) as number;
  if (cp < 0x80) return 1;
  if (cp < 0x800) return 2;
  if (cp < 0x10000) return 3;
  return 4;
}

/**
 * Fold one content line to 75 octets, continuation lines beginning with a single space. Iteration is
 * by code point, so a surrogate pair or a multi-byte character is never split down the middle.
 */
function fold(line: string): string {
  const chunks: string[] = [];
  let current = '';
  let used = 0;

  for (const ch of line) {
    const n = octets(ch);
    // A continuation line spends one of its 75 octets on the leading space.
    const limit = chunks.length === 0 ? OCTET_LIMIT : OCTET_LIMIT - 1;
    if (used + n > limit) {
      chunks.push(current);
      current = '';
      used = 0;
    }
    current += ch;
    used += n;
  }
  chunks.push(current);

  return chunks.map((c, i) => (i === 0 ? c : ' ' + c)).join(CRLF);
}

/** 2026-08-18 → 20260818, the DATE form used by all-day events. */
function icsDate(iso: ISODate): string {
  return iso.replace(/-/g, '');
}

/** A UTC timestamp for DTSTAMP: 2026-07-25T00:00:00Z → 20260725T000000Z. */
function icsStamp(utc: string): string {
  return utc.replace(/[-:]/g, '').replace(/\.\d+/, '');
}

function toOrdinal(iso: ISODate): number {
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}

function addDays(iso: ISODate, n: number): ISODate {
  return new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);
}

/** "18 Aug", or "18 Aug 2027" when the year is not the one the plan was computed in. */
function formatShort(iso: ISODate, asOf: ISODate): string {
  const [y, m, d] = iso.split('-');
  const sameYear = y === asOf.slice(0, 4);
  return `${Number(d)} ${MONTHS_SHORT[Number(m) - 1]}${sameYear ? '' : ` ${y}`}`;
}

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/** Lower-cases a title so it can sit mid-sentence — an initialism is left alone. */
function lowerFirst(s: string): string {
  if (/^[A-Z]{2,}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ---- the prose layer (shared with the plain-text email, so the two cannot drift) ----------------

export function officeLabel(office: DecidingOffice): string {
  return OFFICE_PROSE[office];
}

/**
 * Where this step stands on the day the file is generated. The act-by date is the one that decides
 * it: once that is behind you the lead time no longer fits, even though the office's date has not
 * arrived yet.
 */
export type StepTiming = 'ahead' | 'overdue' | 'passed';

export function stepTiming(step: DatedStep, asOf: ISODate): StepTiming {
  if (toOrdinal(step.deadline) < toOrdinal(asOf)) return 'passed';
  if (toOrdinal(step.effectiveDeadline) < toOrdinal(asOf)) return 'overdue';
  return 'ahead';
}

/** The margin phrase used on screen, in the calendar and in the email — one wording everywhere. */
export function marginPhrase(daysOfMargin: number): string {
  if (daysOfMargin < 0) return `${days(Math.abs(daysOfMargin))} past the point where the lead time still fits`;
  if (daysOfMargin === 0) return 'no margin left — this is the last day it fits';
  return `${days(daysOfMargin)} of margin`;
}

/**
 * Why this date and not the office's. This is the sentence that makes a reminder a briefing rather
 * than a bare alert, so it names both dates, the office behind the hard one, and the subtraction.
 */
export function derivationSentence(step: DatedStep, asOf: ISODate): string {
  return (
    `PathWise did not pick this date. It starts from the ${step.deadlineLabel} — ` +
    `${formatStepDate(step.deadline)}, the date ${officeLabel(step.office)} actually enforces — and ` +
    `works back the ${days(step.leadTimeDays)} this action needs to arrange. That subtraction is why ` +
    `this reminder sits on ${formatStepDate(step.effectiveDeadline)} instead: it is your date, not theirs. ` +
    `On ${formatStepDate(asOf)}, when the plan was computed, that left you ` +
    `${marginPhrase(step.daysOfMargin ?? 0)}.`
  );
}

/** The event title. Everything urgent lives here, because every client shows this field. */
export function actSummary(step: DatedStep, asOf: ISODate): string {
  const hard = `hard deadline ${formatShort(step.deadline, asOf)}`;
  const timing = stepTiming(step, asOf);

  if (timing === 'passed') {
    return `Deadline passed ${formatShort(step.deadline, asOf)} — ask ${officeLabel(step.office)} what is still possible: ${lowerFirst(step.title)}`;
  }
  if (timing === 'overdue') {
    const left = toOrdinal(step.deadline) - toOrdinal(asOf);
    return `Overdue — act now: ${lowerFirst(step.title)} (${hard}, ${days(left)} left)`;
  }
  return `Act by today: ${lowerFirst(step.title)} (${hard})`;
}

/** The office's own date, titled so it can never be mistaken for the student's. */
export function hardSummary(step: DatedStep, asOf: ISODate): string {
  return `Hard deadline today — ${step.deadlineLabel}: ${lowerFirst(step.title)} (your own act-by date was ${formatShort(step.effectiveDeadline, asOf)})`;
}

/** The closing lines every event carries: authority, who decides, and where the dates came from. */
function provenance(step: NextStep, total: number, asOf: ISODate): string[] {
  return [
    `Authority: ${step.cite}`,
    `Who decides: ${officeLabel(step.office)} — PathWise advises; the office decides.`,
    `Step ${step.order} of ${total} in your PathWise plan, computed on ${formatStepDate(asOf)} from your own record, on your own device. Nothing was sent to a server. If your record changes, re-export — the plan is recomputed every time it is opened.`,
  ];
}

/** The act-by event's briefing. */
function actDescription(step: DatedStep, total: number, asOf: ISODate): string {
  const parts = [
    `What to do: ${step.title}`,
    `Why it matters: ${step.why}`,
    `Why this date: ${derivationSentence(step, asOf)}`,
    `Lead time — ${days(step.leadTimeDays)}: ${step.leadTimeReason}`,
    `If it slips: ${step.consequenceOfMissing}`,
  ];
  if (step.howToResolve) parts.push(`How to resolve: ${step.howToResolve}`);
  return [...parts, ...provenance(step, total, asOf)].join('\n\n');
}

/** The hard-deadline event's briefing — explicitly the office's date, not the student's. */
function hardDescription(step: DatedStep, total: number, asOf: ISODate): string {
  const parts = [
    `This is the office's own date, not yours: the ${step.deadlineLabel}, ${formatStepDate(step.deadline)}, enforced by ${officeLabel(step.office)}.`,
    `What to do: ${step.title}`,
    `Your own date was ${formatStepDate(step.effectiveDeadline)} — ${days(step.leadTimeDays)} earlier, and that gap is not padding. Lead time — ${days(step.leadTimeDays)}: ${step.leadTimeReason}`,
    `Why it matters: ${step.why}`,
    `If it slips: ${step.consequenceOfMissing}`,
  ];
  if (step.howToResolve) parts.push(`How to resolve: ${step.howToResolve}`);
  return [...parts, ...provenance(step, total, asOf)].join('\n\n');
}

// ---- event assembly ----------------------------------------------------------------------------

/**
 * A stable, deterministic UID: the same step exports to the same identifier every time, so a
 * re-import updates the event the student already has instead of duplicating it.
 */
function uid(stepId: string, kind: 'act' | 'deadline'): string {
  const slug = stepId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `pathwise-${slug}-${kind}@pathwise.app`;
}

/** Cliffs are not "medium importance"; the clients that read PRIORITY should say so. */
function priority(step: DatedStep): number {
  if (step.tier === 'cliff' || step.status === 'blocked') return 1;
  if (step.status === 'attention') return 5;
  return 9;
}

function alarm(offsetDays: number, step: DatedStep): string[] {
  const text =
    offsetDays === 0
      ? `Act today — ${step.title}`
      : `${days(offsetDays)} until the date you need to act — ${step.title}`;
  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER;RELATED=START:${offsetDays === 0 ? 'PT0S' : `-P${offsetDays}D`}`,
    `DESCRIPTION:${esc(text)}`,
    'END:VALARM',
  ];
}

interface EventSpec {
  uid: string;
  date: ISODate;
  summary: string;
  description: string;
  step: DatedStep;
  alarmOffsets: number[];
}

function vevent(spec: EventSpec, stamp: string, sequence: number): string[] {
  const { step } = spec;
  return [
    'BEGIN:VEVENT',
    `UID:${spec.uid}`,
    `DTSTAMP:${stamp}`,
    `SEQUENCE:${sequence}`,
    // All-day: DTEND is exclusive, so a single day ends on the following date.
    `DTSTART;VALUE=DATE:${icsDate(spec.date)}`,
    `DTEND;VALUE=DATE:${icsDate(addDays(spec.date, 1))}`,
    `SUMMARY:${esc(spec.summary)}`,
    `DESCRIPTION:${esc(spec.description)}`,
    `CATEGORIES:${esc('PathWise')},${esc(DOMAIN_LABEL[step.domain])}`,
    `PRIORITY:${priority(step)}`,
    'STATUS:CONFIRMED',
    'CLASS:PRIVATE',
    // A deadline marks a day, it does not occupy it — never show the student as busy.
    'TRANSP:TRANSPARENT',
    ...spec.alarmOffsets.flatMap((d) => alarm(d, step)),
    'END:VEVENT',
  ];
}

// ---- the calendar --------------------------------------------------------------------------------

/**
 * Build an RFC 5545 calendar from the computed plan.
 *
 * Two events per dated step: the act-by event on the student's own date (or on today, if that date
 * is already behind them — a reminder in the past reminds nobody), and the office's hard deadline on
 * the date the office actually enforces. Steps without a date are left out; they are real work, but
 * a calendar is the wrong place to assert a day nobody set.
 */
export function buildIcs(steps: NextStep[], options: IcsOptions): string {
  const { asOf } = options;
  const dated = calendarSteps(steps);
  const stamp = icsStamp(options.generatedAt ?? `${asOf}T00:00:00Z`);
  // Monotonic in the date the plan was computed, so a later export of a changed plan supersedes an
  // earlier one in clients that respect SEQUENCE — without needing any stored state to count from.
  const sequence = toOrdinal(asOf);
  const offsets = (options.alarmOffsetsDays ?? DEFAULT_ALARM_OFFSETS_DAYS).slice().sort((a, b) => b - a);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${options.productId ?? PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(options.calendarName ?? 'PathWise — your deadlines')}`,
    `X-WR-CALDESC:${esc(
      `Computed on ${formatStepDate(asOf)} from your own record, on your own device. Each date is the ` +
        `office's deadline less the lead time that action actually needs. PathWise advises; the office decides.`,
    )}`,
  ];

  for (const step of dated) {
    const timing = stepTiming(step, asOf);
    // The act-by event is the one that has to fire, so it never lands in the past: a step whose
    // runway is already gone is shown today instead, and its title says so.
    const actDate = timing === 'ahead' ? step.effectiveDeadline : asOf;
    // Only the alarms that would still be in the future are worth carrying.
    const usable = offsets.filter((d) => toOrdinal(addDays(actDate, -d)) >= toOrdinal(asOf));
    const alarmOffsets = usable.length > 0 ? usable : [0];

    lines.push(
      ...vevent(
        {
          uid: uid(step.id, 'act'),
          date: actDate,
          summary: actSummary(step, asOf),
          description: actDescription(step, steps.length, asOf),
          step,
          alarmOffsets,
        },
        stamp,
        sequence,
      ),
    );

    lines.push(
      ...vevent(
        {
          uid: uid(step.id, 'deadline'),
          date: step.deadline,
          summary: hardSummary(step, asOf),
          description: hardDescription(step, steps.length, asOf),
          step,
          // The office's date needs one last look, not an escalation — the escalation belongs to the
          // act-by event, which is where the student can still do something about it.
          alarmOffsets: toOrdinal(addDays(step.deadline, -1)) >= toOrdinal(asOf) ? [1] : [0],
        },
        stamp,
        sequence,
      ),
    );
  }

  lines.push('END:VCALENDAR');

  return lines.map(fold).join(CRLF) + CRLF;
}

export const _icsInternals = { esc, fold, octets, icsDate, icsStamp, uid, formatShort, toOrdinal, addDays };
