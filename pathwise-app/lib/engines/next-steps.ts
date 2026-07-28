// next-steps.ts — the plan. Every other engine answers "where do I stand?"; this one answers
// "what do I do now, and in what order?"
//
// It decides nothing regulatory of its own. Every step below is read out of an engine result that
// already applied the rules — the CPT ledger, the unemployment clock, the OPT budget, the domicile
// gate, the aid finding and its binding deadline. What this engine adds is the three things a
// student still can't get from a stack of correct findings:
//
//   1. the ACTION each result implies, as one imperative sentence;
//   2. the LEAD TIME that action realistically needs — so the date the student works to is not the
//      office's deadline but their own, earlier one;
//   3. the ORDER — because someone with six obligations does not need six facts, they need to know
//      which one to do first.
//
// Lead times are product judgment, not regulation, and every step says so in its own words. Where a
// rulepack sets a real window (the 10-day SEVIS report, the 90-day OPT filing window) the lead time
// is read from the pack rather than invented.

import type { DecidingOffice, Finding, ISODate, ProgramLevel } from '../types';
import type { LedgerResult } from './cpt-ledger';
import type { UnemploymentClockResult } from './unemployment-clock';
import type { OptBudgetResult } from './opt-budget';
import type { AidDeadline } from './aid-eligibility';
import pack from '../rulepacks/f1-practical-training.json';

// ---- rulepack windows the plan borrows as lead times (these ARE regulation) ----

const REPORTING: { id: string; deadline_days?: number; every_months?: number; cite: string }[] =
  pack.reporting_obligations;

// Every reporting deadline the pack actually states, in days. If the pack ever renames the specific
// obligation below, the plan falls back to the SHORTEST deadline the pack does state — never to a
// day count written here, because a fallback literal is a rule the pack has stopped owning.
const REPORTING_DEADLINE_DAYS: number[] = REPORTING.map((r) => r.deadline_days).filter(
  (d): d is number => typeof d === 'number',
);

const SEVIS_REPORT_DAYS =
  REPORTING.find((r) => r.id === 'employer_or_address_change')?.deadline_days ??
  Math.min(...REPORTING_DEADLINE_DAYS);
const OPT_FILING_WINDOW_DAYS = pack.opt.apply_window.earliest_days_before_program_end;
const GRACE_DAYS = pack.grace_period.days_after_i20_or_ead_end;

// ---- lead times that are NOT regulation (product judgment, labelled as such on screen) ----
//
// A deadline is only half the answer: an action that takes three weeks to arrange cannot be started
// the day before it is due. These are deliberately conservative and deliberately few.
const LEAD = {
  /** Getting in front of a DSO or a records office — appointments are not same-day. */
  officeAppointment: 14,
  /** Retrieving a document from a third party (a school, a county, an employer). */
  documentRetrieval: 30,
  /** An aid application plus the supporting documents an office asks for after reading it. */
  aidApplication: 30,
} as const;

// Display-only banding on the student's OWN margin, matching the convention the other engines use.
const MARGIN_AMBER_DAYS = 30;

// ---- vocabulary (the app's four states, one word each) ----

export type StepStatus = 'verified' | 'attention' | 'blocked' | 'unknown';

/**
 * Why a step sits where it sits.
 *   cliff    — a hard cliff or an auto-termination: crossing it cannot be appealed or undone.
 *   deadline — a real date with a real consequence; ordered by the student's own effective date.
 *   unknown  — an open question from a finding's `unknowns`; nobody can act until it is answered.
 *   standing — a settled finding that shapes choices but has no clock on it.
 */
export type StepTier = 'cliff' | 'deadline' | 'unknown' | 'standing';

const TIER_ORDER: Record<StepTier, number> = { cliff: 0, deadline: 1, unknown: 2, standing: 3 };
const SEVERITY: Record<StepStatus, number> = { verified: 0, unknown: 1, attention: 2, blocked: 3 };

export interface NextStep {
  id: string;
  /** 1-based position in the finished plan. */
  order: number;
  tier: StepTier;
  /** Short and imperative — the thing to do, not the thing that is true. */
  title: string;
  /** Why it matters, in one line. */
  why: string;
  domain: Finding['domain'];
  status: StepStatus;
  /** Who actually decides this. PathWise advises; the office decides. */
  office: DecidingOffice;
  /** The office's date, where one exists. */
  deadline?: ISODate;
  /** What that date IS, so it is never a bare date. */
  deadlineLabel?: string;
  /** How far ahead the action realistically has to start. */
  leadTimeDays: number;
  /** Why it needs that long. Never restates the number — the screen prints that itself. */
  leadTimeReason: string;
  /** deadline − leadTimeDays: the student's own date, the one worth putting in a calendar. */
  effectiveDeadline?: ISODate;
  /** Days between asOf and the effective deadline. Negative once the runway is gone. */
  daysOfMargin?: number;
  /** Days of headroom used for ordering — the margin, or a raw engine count when there is no date. */
  headroomDays?: number;
  consequenceOfMissing: string;
  cite: string;
  /** Present on open questions: the concrete way to close them. */
  howToResolve?: string;
  /**
   * True when this step cannot change the finding it came from, because that finding is already
   * determinate against the student.
   *
   * An `ineligible` finding still declares its `unknowns` — and it should: the questions really are
   * open, and a different student, or the same student after a status change, reaches them. What was
   * wrong was turning them into instructions. A status block on state aid is not reopened by
   * producing a domicile document, so a plan that said "Get domicile established on record" as a
   * route to that aid was telling the student to spend thirty days on a door the engine one screen
   * away calls shut. Marked informational, the same fact reads correctly: worth having, not worth
   * chasing for this.
   */
  informational?: boolean;
}

export interface NextStepsInput {
  /** The education level being pursued — the ledger and budget are both partitioned by it. */
  level: ProgramLevel;
  ledger: LedgerResult;
  clock: UnemploymentClockResult;
  optBudget: OptBudgetResult;
  domicile: Finding;
  aid: Finding;
  /** From resolveAidDeadline — the Finding does not carry the dates, so it is passed alongside. */
  aidDeadline?: AidDeadline;
  asOf: ISODate;
}

// ---- date + prose helpers (same arithmetic as every other engine) ----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toOrdinal(iso: ISODate): number {
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}

function addDays(iso: ISODate, n: number): ISODate {
  return new Date(Date.parse(iso + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);
}

/** Exported so the screen prints a date exactly as the step's own prose prints it. */
export function formatStepDate(iso: ISODate): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

const LEVEL_LABEL: Record<ProgramLevel, string> = {
  bachelors: "bachelor's",
  masters: "master's",
  doctoral: 'doctoral',
  other: 'program',
};

/** How an office is named inside a sentence. Exported so exports (calendar, email) read identically. */
export const OFFICE_PROSE: Record<DecidingOffice, string> = {
  DSO: 'your DSO',
  registrar: 'the registrar',
  domicile_officer: 'the domicile officer',
  financial_aid: 'the financial aid office',
  USCIS: 'USCIS',
  SEVP: 'SEVP',
  state_higher_ed_agency: 'the state higher-education agency',
};

const DOMAIN_SUBJECT: Record<Finding['domain'], string> = {
  immigration: 'your F-1 standing',
  residency: 'in-state residency',
  aid: 'state financial aid',
};

function lowerFirst(s: string): string {
  // An initialism is left alone — "VA high school attendance" must not become "vA high school…".
  if (/^[A-Z]{2,}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function months(n: number): string {
  return `${n} ${n === 1 ? 'month' : 'months'}`;
}

function worse(a: StepStatus, b: StepStatus): StepStatus {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

/** The student's own margin, banded the way every other margin in the app is banded. */
function statusFromMargin(daysOfMargin: number): StepStatus {
  if (daysOfMargin < 0) return 'blocked';
  if (daysOfMargin <= MARGIN_AMBER_DAYS) return 'attention';
  return 'verified';
}

// ---- step construction -------------------------------------------------------------------------

interface Draft {
  id: string;
  tier: StepTier;
  title: string;
  why: string;
  domain: Finding['domain'];
  office: DecidingOffice;
  /** What the underlying engine already said about this. Never softened by the margin. */
  engineStatus: StepStatus;
  deadline?: ISODate;
  deadlineLabel?: string;
  leadTimeDays: number;
  leadTimeReason: string;
  consequenceOfMissing: string;
  cite: string;
  howToResolve?: string;
  /** Ordering fallback for a step with no date — an engine's own count of days left. */
  headroomDays?: number;
  /** See NextStep.informational. */
  informational?: boolean;
}

function make(d: Draft, asOf: ISODate): Omit<NextStep, 'order'> {
  const effectiveDeadline = d.deadline ? addDays(d.deadline, -d.leadTimeDays) : undefined;
  const daysOfMargin = effectiveDeadline ? toOrdinal(effectiveDeadline) - toOrdinal(asOf) : undefined;

  // The engine's verdict and the student's runway are both real; the worse of the two is the honest
  // chip. A comfortable margin never talks a hard finding down to "on track".
  const status =
    daysOfMargin === undefined ? d.engineStatus : worse(d.engineStatus, statusFromMargin(daysOfMargin));

  return {
    id: d.id,
    tier: d.tier,
    title: d.title,
    why: d.why,
    domain: d.domain,
    status,
    office: d.office,
    deadline: d.deadline,
    deadlineLabel: d.deadlineLabel,
    leadTimeDays: d.leadTimeDays,
    leadTimeReason: d.leadTimeReason,
    effectiveDeadline,
    daysOfMargin,
    headroomDays: d.headroomDays ?? daysOfMargin,
    consequenceOfMissing: d.consequenceOfMissing,
    cite: d.cite,
    howToResolve: d.howToResolve,
    informational: d.informational,
  };
}

// ---- one builder per engine ---------------------------------------------------------------------

/**
 * The unemployment clock. This is the only number in the product that ends lawful status by itself,
 * so an unpaused clock is always a cliff-tier step.
 */
function fromClock(clock: UnemploymentClockResult, asOf: ISODate): Draft[] {
  const uc = pack.unemployment_clock;

  if (clock.isPaused) {
    return [
      {
        id: 'opt-unemployment-reporting',
        tier: 'standing',
        title: 'Keep your employment reported while the clock is paused',
        why: `A qualifying job is covering the clock today, so ${clock.daysUsed} of your ${clock.cap} unemployment days stay spent and no more accrue.`,
        domain: 'immigration',
        office: 'SEVP',
        engineStatus: 'verified',
        leadTimeDays: SEVIS_REPORT_DAYS,
        leadTimeReason: `SEVIS gives ${SEVIS_REPORT_DAYS} days to report an employer or address change — a change reported late is a change reported outside the rule.`,
        consequenceOfMissing: `An unreported end of employment restarts the count silently: the clock resumes from ${clock.daysUsed} days, not from zero.`,
        cite: uc.cite,
      },
    ];
  }

  const termination = clock.projectedTerminationDate;
  // The last day still inside the cap is the day before the record falls out of status.
  const lastLegalDay = termination ? addDays(termination, -1) : undefined;
  const engineStatus: StepStatus =
    clock.band === 'red' ? 'blocked' : clock.band === 'amber' ? 'attention' : 'verified';

  return [
    {
      id: 'opt-unemployment-clock',
      tier: clock.band === 'green' ? 'deadline' : 'cliff',
      title: 'Report a qualifying job before your unemployment cap runs out',
      why: `${clock.daysUsed} of ${clock.cap} unemployment days are already spent, and the count is cumulative — every day of the gap counts, not just the longest one.${
        clock.stemApplies ? '' : ' The STEM extension is not adding days, because no qualifying employment is on record yet.'
      }`,
      domain: 'immigration',
      office: 'SEVP',
      engineStatus,
      deadline: lastLegalDay,
      deadlineLabel: `last day inside the ${clock.cap}-day cap`,
      leadTimeDays: SEVIS_REPORT_DAYS,
      leadTimeReason: `SEVIS reporting has its own ${SEVIS_REPORT_DAYS}-day window, and a job that starts on the final day leaves no room to report it — the job has to start, and be reported, before the cap.`,
      consequenceOfMissing: termination
        ? `If the gap continues, SEVIS auto-terminates the F-1 record on ${formatStepDate(termination)}. ${
            uc.no_grace_period_on_violation ? 'There is no grace period and no reinstatement.' : ''
          }`.trim()
        : 'Crossing the cap auto-terminates the F-1 record, with no grace period and no reinstatement.',
      cite: uc.cite,
      headroomDays: clock.daysRemaining,
    },
  ];
}

/** The CPT ledger. A day count, not a date — so its urgency is measured in days-to-cliff. */
function fromLedger(ledger: LedgerResult, level: ProgramLevel): Draft[] {
  const line = ledger.forLevel(level);
  if (!line) return [];

  const cpt = pack.cpt;
  const lvl = LEVEL_LABEL[line.level];
  // The number of overlapping authorizations is the ledger's, not the demo student's: a record with
  // three concurrent part-time authorizations has to read as three here.
  const overlapClause =
    line.overlapDays > 0
      ? `, and ${line.overlapDays} of them exist only because ${line.overlapConcurrentAuths} part-time authorizations overlapped into a full-time day`
      : '';

  if (line.band === 'red') {
    return [
      {
        id: 'cpt-cliff-crossed',
        tier: 'cliff',
        title: 'Ask your DSO whether OPT is still available at this level',
        why: `PathWise counts ${line.fullTimeDays} full-time CPT days at the ${lvl} level${overlapClause} — at or past the ${cpt.cliff_days}-day cliff.`,
        domain: 'immigration',
        office: 'DSO',
        engineStatus: 'blocked',
        leadTimeDays: LEAD.officeAppointment,
        leadTimeReason:
          'The DSO has to pull every authorization on the record before they can agree or disagree with this count.',
        consequenceOfMissing: `${cpt.cliff_effect} Planning a post-graduation job around OPT that is already gone costs the whole job search.`,
        cite: cpt.cliff_cite,
        headroomDays: line.daysToCliff,
      },
    ];
  }

  if (line.band === 'amber') {
    return [
      {
        id: 'cpt-confirm-total',
        tier: 'cliff',
        title: 'Confirm your CPT total with your DSO',
        why: `PathWise counts ${line.fullTimeDays} full-time CPT days at the ${lvl} level${overlapClause} — ${line.daysToCliff} short of the ${cpt.cliff_days}-day cliff.`,
        domain: 'immigration',
        office: 'DSO',
        engineStatus: 'attention',
        leadTimeDays: LEAD.officeAppointment,
        leadTimeReason:
          'This has to be settled BEFORE the next authorization is signed, not after — and a DSO appointment is not same-day.',
        consequenceOfMissing: `${cpt.cliff_effect} ${cpt.counting_note} A single authorization signed without checking the total can cross the cliff on paper alone.`,
        cite: cpt.cliff_cite,
        headroomDays: line.daysToCliff,
      },
    ];
  }

  return [
    {
      id: 'cpt-headroom',
      tier: 'standing',
      title: 'Check the ledger before you accept the next CPT authorization',
      why: `${line.fullTimeDays} full-time CPT days at the ${lvl} level leaves ${line.daysToCliff} days of headroom before the ${cpt.cliff_days}-day cliff.`,
      domain: 'immigration',
      office: 'DSO',
      engineStatus: 'verified',
      leadTimeDays: LEAD.officeAppointment,
      leadTimeReason: 'The check is only useful before an authorization is signed, never after.',
      consequenceOfMissing: `${cpt.cliff_effect} The count runs on authorized periods, so it moves even in a week nothing is worked.`,
      cite: cpt.cliff_cite,
      headroomDays: line.daysToCliff,
    },
  ];
}

/** The 12-months-per-level OPT budget: what was already spent, and when the grant runs out. */
function fromOptBudget(budget: OptBudgetResult, level: ProgramLevel, asOf: ISODate): Draft[] {
  const line = budget.forLevel(level);
  if (!line) return [];

  const drafts: Draft[] = [];
  const lvl = LEVEL_LABEL[line.level];
  const pre = line.lines.filter((l) => l.phase === 'pre_completion' && l.chargedMonths > 0);
  const preCharged = Math.round(pre.reduce((s, l) => s + l.chargedMonths, 0) * 100) / 100;
  const preAuthorized = Math.round(pre.reduce((s, l) => s + l.authorizedMonths, 0) * 100) / 100;

  if (pre.length > 0) {
    drafts.push({
      id: 'opt-recommendation-length',
      tier: 'standing',
      title: 'Ask your DSO to confirm how many OPT months you have left',
      why: `${months(preAuthorized)} of pre-completion OPT spent ${months(preCharged)} of the same ${line.budgetMonths}-month budget, which is why the post-completion grant is shorter than a full year.`,
      domain: 'immigration',
      office: 'DSO',
      engineStatus: line.band === 'green' ? 'verified' : 'attention',
      leadTimeDays: LEAD.officeAppointment,
      leadTimeReason:
        'The DSO reads this off the authorized dates already on file, and those have to be pulled before anyone can answer.',
      consequenceOfMissing: `The recommendation on the I-20 is shortened without explanation, and the ${line.budgetMonths} months are per level — nothing at the ${lvl} level refills them.`,
      cite: pack.opt.budget_cite,
    });
  }

  // The last post-completion authorization that has not already ended is the real work-authorization
  // horizon. That end date is a deadline with a consequence, so it belongs in the plan.
  const post = line.lines
    .filter((l) => l.phase === 'post_completion' && toOrdinal(l.end) >= toOrdinal(asOf))
    .sort((a, b) => toOrdinal(b.end) - toOrdinal(a.end))[0];

  if (post) {
    const engineStatus: StepStatus =
      line.band === 'red' ? 'blocked' : line.band === 'amber' ? 'attention' : 'verified';
    drafts.push({
      id: 'opt-end-of-authorization',
      tier: 'deadline',
      title: 'Decide what follows your OPT before the authorization ends',
      why:
        line.monthsRemaining > 0
          ? `Work authorization at the ${lvl} level runs to ${formatStepDate(post.end)}, with ${months(line.monthsRemaining)} of the ${line.budgetMonths}-month budget still unspent.`
          : `Work authorization at the ${lvl} level runs to ${formatStepDate(post.end)}, and all ${line.budgetMonths} months at this level are committed — there is nothing left to extend.`,
      domain: 'immigration',
      office: 'USCIS',
      engineStatus,
      deadline: post.end,
      deadlineLabel: 'last day of work authorization at this level',
      leadTimeDays: OPT_FILING_WINDOW_DAYS,
      leadTimeReason: `The filing window for practical training opens ${OPT_FILING_WINDOW_DAYS} days ahead — treat that as the runway for arranging whatever comes next, too.`,
      consequenceOfMissing: `After ${formatStepDate(post.end)} the only cushion is the ${GRACE_DAYS}-day grace period, and it requires a qualifying action taken BEFORE the authorization expires — not after.`,
      cite: pack.opt.apply_window.cite,
    });
  }

  return drafts;
}

/** The aid deadline that actually binds — the earliest of the three, not the federal fallback. */
function fromAidDeadline(deadline: AidDeadline, aid: Finding, asOf: ISODate): Draft[] {
  const binding = deadline.binding;
  if (!binding?.date) return [];

  const blocked = aid.result === 'ineligible';
  const later = deadline.candidates.filter((c) => c.date && !c.binding);
  const latest = later.sort((a, b) => toOrdinal(b.date!) - toOrdinal(a.date!))[0];

  return [
    {
      id: 'aid-binding-deadline',
      tier: 'deadline',
      title: `Submit your aid application before the ${binding.label.toLowerCase()}`,
      why: blocked
        ? `State aid is closed by status, but this date still controls the institutional and private aid the same office administers${
            latest?.date ? `, and it lands ${toOrdinal(latest.date) - toOrdinal(binding.date)} days before the deadline most guidance quotes` : ''
          }.`
        : `The deadline that binds is the earliest of the three${
            latest?.date ? `, and it lands ${toOrdinal(latest.date) - toOrdinal(binding.date)} days before the ${latest.label.toLowerCase()} most guidance quotes` : ''
          }.`,
      domain: 'aid',
      office: 'financial_aid',
      engineStatus: deadline.marginBand === 'red' ? 'blocked' : deadline.marginBand === 'amber' ? 'attention' : 'verified',
      deadline: binding.date,
      deadlineLabel: binding.label.toLowerCase(),
      leadTimeDays: LEAD.aidApplication,
      leadTimeReason:
        'Aid offices ask for supporting documents after they read the form, and that request has to fit inside the window too.',
      consequenceOfMissing: deadline.consequenceOfMissing,
      cite: deadline.cite,
      headroomDays: undefined,
    },
  ];
}

/**
 * Every open question a finding declared, turned into the action that closes it — unless the finding
 * is already determinate against the student, in which case nothing closes it and the step says so.
 *
 * This is the distinction the plan was missing. `computeAidEligibility` reports its provision gaps
 * whether or not a status block has already closed state aid, which is right: the gaps are real, and
 * the checklist is what PathWise checked. But `fromUnknowns` read every gap as an instruction, so a
 * student whose F-1 status closes Virginia state aid outright was handed three steps to go and
 * obtain domicile proof and high-school records — as routes to that aid — while two screens away the
 * same record said "Neither form opens Virginia state aid". One of those was wrong, and it was this
 * one.
 *
 * An informational step keeps the question visible and drops the false promise: the evidence may
 * still be worth having, and it is not the thing standing between the student and this door.
 */
function fromUnknowns(finding: Finding): Draft[] {
  // A determinate refusal. No amount of evidence in this list reopens it, because what closed it was
  // not an evidentiary gap.
  const closed = finding.result === 'ineligible';
  const subject = DOMAIN_SUBJECT[finding.domain];

  return finding.unknowns.map((u, i) => {
    const head = u.what.split('—')[0].replace(/[.?]\s*$/, '').trim();
    const office = OFFICE_PROSE[finding.deciding_office];
    const item = lowerFirst(head.replace(/\s*is not on record\s*/i, ''));

    const title = closed
      ? `Keep ${item} — it will not reopen ${subject}`
      : u.what.trim().endsWith('?')
        ? `Answer one open question: ${lowerFirst(head)}`
        : /not on record/i.test(head)
          ? `Confirm ${item} with ${office}`
          : `Get ${lowerFirst(head)} on record`;

    return {
      id: `${finding.rule_id}:unknown-${i}`,
      tier: 'unknown' as StepTier,
      title,
      why: closed
        ? `${finding.headline} — and that is a status fact, not a missing document, so producing this one does not change it. PathWise lists it because it is genuinely still open on the record, and because the same evidence can matter to a decision this finding does not govern.`
        : u.why_it_matters,
      domain: finding.domain,
      office: finding.deciding_office,
      engineStatus: 'unknown' as StepStatus,
      informational: closed || undefined,
      leadTimeDays: LEAD.documentRetrieval,
      leadTimeReason: closed
        ? 'Nothing here is on a clock, because nothing here is holding the decision up.'
        : 'The document usually has to come from someone else — a school, a county, a former employer — and their timeline is not yours.',
      consequenceOfMissing: closed
        ? `Nothing, for ${subject} — it is already closed on status. The cost of treating this as the blocker is the application cycle spent on a door that does not open.`
        : `While this is missing it stays an open question in the ${subject} finding, and ${office} decides on the record as it stands — not on what is true but undocumented.`,
      cite: finding.rule_citation.authority,
      howToResolve: closed
        ? `Hold on to it. If the status this rests on ever changes, ${office} reads the record as it stands then — and this is one of the items it would need.`
        : u.how_to_resolve,
    };
  });
}

/** The finding itself, where its verdict implies an action with no clock on it. */
function fromFinding(finding: Finding): Draft[] {
  const office = OFFICE_PROSE[finding.deciding_office];
  const subject = DOMAIN_SUBJECT[finding.domain];
  const base = {
    id: `${finding.rule_id}:standing`,
    tier: 'standing' as StepTier,
    domain: finding.domain,
    office: finding.deciding_office,
    leadTimeDays: LEAD.officeAppointment,
    leadTimeReason: `Getting in front of ${office} is a conversation, not a form — and it is worth having before the choice it affects is made.`,
    cite: finding.rule_citation.authority,
  };

  switch (finding.result) {
    case 'ineligible':
      return [
        {
          ...base,
          title: `Confirm with ${office} that ${subject} is closed on your current status`,
          why: `${finding.headline} — one status fact decides it, before need, merit or paperwork is reached.`,
          engineStatus: 'blocked',
          // The volatility note is the finding's own words; it is more specific than anything this
          // engine could say about which part of the rule is moving.
          consequenceOfMissing: `Applying on the assumption it is open spends an application cycle and changes nothing. ${
            finding.volatility && finding.volatility.status !== 'stable'
              ? finding.volatility.note
              : 'PathWise advises; the office decides.'
          }`,
        },
      ];
    case 'potential_risk':
    case 'review_recommended':
      return [
        {
          ...base,
          title: `Take ${subject} to ${office} for review`,
          why: `${finding.headline} — PathWise can get this far on the record it has, but the call is not its to make.`,
          engineStatus: 'attention',
          consequenceOfMissing: `An unreviewed finding is not a favourable one: ${office} applies the rule at the moment of decision, on whatever is on file then.`,
        },
      ];
    case 'unable_to_verify':
      return finding.unknowns.length > 0
        ? [] // the open questions already carry it
        : [
            {
              ...base,
              title: `Ask ${office} what evidence would settle ${subject}`,
              why: `${finding.headline} — PathWise will not guess at a rule it cannot read from the record.`,
              engineStatus: 'unknown',
              consequenceOfMissing: `Nothing moves while the record is silent, and the silence is read against the student, not for them.`,
            },
          ];
    default:
      return [
        {
          ...base,
          title: `Keep your ${subject} evidence current with ${office}`,
          why: `${finding.headline} — nothing is blocking it today, and the record is what keeps it that way.`,
          engineStatus: 'verified',
          consequenceOfMissing: 'A finding is only as current as the record beneath it; a stale record turns a clear answer into an open question.',
        },
      ];
  }
}

// ---- the plan ------------------------------------------------------------------------------------

/**
 * Build the ordered plan.
 *
 * Ordering, in one sentence: cliffs and auto-terminations first (they cannot be appealed), then
 * every real deadline by the date the STUDENT has to act rather than the date the office prints,
 * then the open questions nobody can act around, then the settled findings that still shape choices.
 * Within each tier, least headroom first.
 */
export function computeNextSteps(input: NextStepsInput): NextStep[] {
  const { asOf } = input;

  const drafts: Draft[] = [
    ...fromClock(input.clock, asOf),
    ...fromLedger(input.ledger, input.level),
    ...fromOptBudget(input.optBudget, input.level, asOf),
    ...(input.aidDeadline ? fromAidDeadline(input.aidDeadline, input.aid, asOf) : []),
    ...fromUnknowns(input.domicile),
    ...fromUnknowns(input.aid),
    ...fromFinding(input.domicile),
    ...fromFinding(input.aid),
  ];

  const steps = drafts.map((d) => make(d, asOf));

  // Array.prototype.sort is stable, so anything the comparator calls equal keeps the order the
  // engines produced it in — immigration, then residency, then aid.
  steps.sort((a, b) => {
    const tier = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (tier !== 0) return tier;

    if (a.tier === 'standing') {
      const sev = SEVERITY[b.status] - SEVERITY[a.status];
      if (sev !== 0) return sev;
    }
    if (a.tier === 'unknown') return 0;

    // Least headroom first; a step with no measurable headroom sorts after the ones that have it.
    const ah = a.headroomDays ?? Number.POSITIVE_INFINITY;
    const bh = b.headroomDays ?? Number.POSITIVE_INFINITY;
    return ah - bh;
  });

  return steps.map((s, i) => ({ ...s, order: i + 1 }));
}

export const _internals = { LEAD, MARGIN_AMBER_DAYS, TIER_ORDER, SEVERITY, toOrdinal, addDays, statusFromMargin };
