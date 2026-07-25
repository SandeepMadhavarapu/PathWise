// reminder-text.ts — the same deadlines, as plain text a mail client can carry.
//
// PathWise cannot send mail: there is no account, no server and no mail service. What it can do is
// hand the finished text to the mail client the student already has open, with the address left
// blank so they address it to themselves. Nothing leaves the device until they press send, and it
// leaves from their outbox, not ours.
//
// The prose is imported from ics.ts rather than rewritten, so the calendar event and the email can
// never disagree about a date, a margin or a consequence.
//
// One constraint shapes the whole file: a mailto: URL is not a document. Windows' shell handler and
// several desktop clients truncate past roughly 2,048 characters, and percent-encoding spends three
// characters on every space — so what actually fits is a little over half that in readable text.
// The message is therefore built to be COMPLETE at whatever length it ends up: it carries the dated
// steps, in plan order, and says out loud what it left behind. A short message that ends where it
// means to beats a long one that stops mid-sentence about a deadline.

import type { ISODate } from './types';
import type { NextStep } from './engines/next-steps';
import { formatStepDate } from './engines/next-steps';
import { calendarSteps, marginPhrase, officeLabel } from './ics';

/**
 * How much of each step to spell out.
 *   full    — everything, including why the lead time is as long as it is.
 *   compact — the four things that must survive: the dates, the margin, the consequence, the citation.
 */
export type EmailDensity = 'full' | 'compact';

export interface ReminderEmailOptions {
  asOf: ISODate;
  density?: EmailDensity;
  /** The size of the whole plan, when `steps` is only the part that carries dates. */
  total?: number;
  /** Steps with no date set by any office — named, not silently dropped. */
  undated?: number;
  /** Dated steps left out to stay inside the URL budget — also named, never silently dropped. */
  omitted?: number;
}

export interface ReminderEmail {
  subject: string;
  body: string;
}

const CRLF = '\r\n';
const INDENT = '   ';

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/** One step, as the lines it occupies in the message. */
function stepLines(step: NextStep, density: EmailDensity): string[] {
  const lines = [`${step.order}. ${step.title}`];
  const office = officeLabel(step.office);

  if (step.effectiveDeadline && step.deadline) {
    const margin = marginPhrase(step.daysOfMargin ?? 0);
    const hard = `${formatStepDate(step.deadline)}: the ${step.deadlineLabel}, ${office}`;
    if (density === 'full') {
      lines.push(
        `${INDENT}Act by: ${formatStepDate(step.effectiveDeadline)} — ${margin}`,
        `${INDENT}Office deadline: ${hard}`,
        `${INDENT}Lead time: ${days(step.leadTimeDays)} — ${step.leadTimeReason}`,
      );
    } else {
      // One line instead of three: the same four facts, without the prose around them.
      lines.push(
        `${INDENT}Act by ${formatStepDate(step.effectiveDeadline)} — ${margin} (office deadline ${hard}; ${days(step.leadTimeDays)} of lead time)`,
      );
    }
  } else {
    lines.push(`${INDENT}No date is set by the office — allow about ${days(step.leadTimeDays)}`);
    if (density === 'full') lines.push(`${INDENT}Why it needs that long: ${step.leadTimeReason}`);
  }

  lines.push(`${INDENT}If it slips: ${step.consequenceOfMissing}`);
  if (step.howToResolve && density === 'full') {
    lines.push(`${INDENT}How to resolve: ${step.howToResolve}`);
  }
  lines.push(
    density === 'full'
      ? `${INDENT}Authority: ${step.cite} — decided by ${office}`
      : `${INDENT}Authority: ${step.cite}`,
  );

  return lines;
}

/**
 * The plan as a plain-text message. Pure: the same steps and the same asOf produce the same text,
 * and no clock, network or storage is touched anywhere in here.
 */
export function buildReminderEmail(steps: NextStep[], options: ReminderEmailOptions): ReminderEmail {
  const { asOf, density = 'full' } = options;
  const total = options.total ?? steps.length;
  const first = calendarSteps(steps)[0];

  const subject = first
    ? `Your PathWise deadlines — act by ${formatStepDate(first.effectiveDeadline)} on the first of ${total}`
    : `Your PathWise next steps — ${total} ${total === 1 ? 'action' : 'actions'}, in order`;

  // Deliberately short at compact density: every character in the preamble is a character the URL
  // budget takes off the end of the plan, and a step the student can read is worth more than a
  // sentence about the plan.
  const head =
    density === 'full'
      ? [
          `Your PathWise plan — ${steps.length} of ${total} ${total === 1 ? 'step' : 'steps'}, in the order they matter.`,
          `Computed on ${formatStepDate(asOf)} from your own record, on your own device. Nothing was sent to a server — this message was composed in your own mail client, and PathWise never sees it.`,
          `Each "act by" date is the office's own deadline less the lead time that action actually needs, so it is the date you have to start, not the date they enforce.`,
        ]
      : [
          `Your PathWise plan — ${steps.length} of ${total} ${total === 1 ? 'step' : 'steps'}, in order. Computed ${formatStepDate(asOf)} on your own device; nothing was sent to a server.`,
          `Each "act by" date is the office's deadline less the lead time that action needs.`,
        ];

  const body: string[] = [...head, ''];

  for (const step of steps) {
    body.push(...stepLines(step, density), '');
  }

  if (options.undated && options.undated > 0) {
    body.push(
      `(${options.undated} further ${options.undated === 1 ? 'step has' : 'steps have'} no date set by any office — they are on the Next steps screen.)`,
      '',
    );
  }
  if (options.omitted && options.omitted > 0) {
    body.push(
      `(${options.omitted} more dated ${options.omitted === 1 ? 'step was' : 'steps were'} left out to fit the length mail clients allow — the calendar file carries all of them.)`,
      '',
    );
  }

  body.push(
    '--',
    density === 'full'
      ? 'For reminders that fire on their own, use "Add these to your calendar" on the Next steps screen: the calendar file carries the same dates, each event placed on the day you have to act.'
      : 'For reminders that fire on their own: "Add these to your calendar" on the Next steps screen.',
    'PathWise advises; the office decides.',
  );

  return { subject, body: body.join(CRLF) };
}

export interface MailtoOptions {
  asOf: ISODate;
  /** Practical ceiling on the whole mailto: URL — see the note at the top of this file. */
  maxUrlLength?: number;
}

/**
 * 3,000 characters, chosen with the trade-off stated rather than hidden.
 *
 * Percent-encoding is brutal: one deadline, written out with its margin, its consequence and its
 * citation, costs around 550 characters of URL. A budget tight enough to satisfy legacy Outlook
 * desktop (~2,083 characters) would therefore ship ONE deadline out of three — which is not a
 * reminder, it is a teaser. Chrome, Edge, Safari and every web-based handler (Gmail, Outlook on the
 * web, Apple Mail) carry 3,000 without complaint, so that is the default; old Outlook desktop may
 * trim the tail. Since the plan is already ordered by urgency, anything trimmed is the least urgent
 * material in the message, and the body says what was left out either way.
 */
const DEFAULT_MAX_URL_LENGTH = 3000;

function compose(email: ReminderEmail): string {
  return `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
}

/**
 * A mailto: link that will actually survive the trip through the operating system.
 *
 * It carries the dated steps — the same ones the calendar file carries, since this button sits next
 * to that one and answers the same question — and names the undated remainder rather than pretending
 * it does not exist. Then it tries the full text, the compact text, and finally drops steps from the
 * END of the plan, which is the least urgent end because the plan is already ordered.
 */
export function buildMailtoHref(steps: NextStep[], options: MailtoOptions): string {
  const budget = options.maxUrlLength ?? DEFAULT_MAX_URL_LENGTH;
  const dated = calendarSteps(steps);
  const total = steps.length;
  const undated = total - dated.length;

  for (const density of ['full', 'compact'] as const) {
    const href = compose(buildReminderEmail(dated, { asOf: options.asOf, density, total, undated }));
    if (href.length <= budget) return href;
  }

  for (let kept = dated.length - 1; kept >= 1; kept--) {
    const href = compose(
      buildReminderEmail(dated.slice(0, kept), {
        asOf: options.asOf,
        density: 'compact',
        total,
        undated,
        omitted: dated.length - kept,
      }),
    );
    if (href.length <= budget) return href;
  }

  // Nothing fits the budget: send the single most urgent deadline rather than nothing at all.
  const fallback = dated.length > 0 ? dated.slice(0, 1) : steps.slice(0, 1);
  return compose(
    buildReminderEmail(fallback, {
      asOf: options.asOf,
      density: 'compact',
      total,
      undated,
      omitted: Math.max(dated.length - 1, 0),
    }),
  );
}
