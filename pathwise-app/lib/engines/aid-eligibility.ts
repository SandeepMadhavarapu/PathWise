// aid-eligibility.ts — Engine C: the financial-aid reader of the same student record.
//
// Four questions, one Finding:
//   1. Which form does this student file — FAFSA or the state alternative (VASA)?
//   2. Does their immigration status close the Virginia state-aid door outright?
//   3. For each Virginia-student provision they might qualify under, what evidence is on record
//      and what is still missing? (Missing items become honest `unknowns`, never a guess.)
//   4. What is their REAL deadline — the earliest of {college priority, state, federal}, not the
//      federal fallback everybody quotes.
//
// Everything rule-shaped is read from rulepacks/va-aid.json: the blocked statuses, the
// form-selection rule, the provisions and their required evidence, the VASA priority date, the
// earliest-of rule, and the confidentiality note. Nothing here restates a rule the pack owns.

import type { Student, Finding, ISODate } from '../types';
import pack from '../rulepacks/va-aid.json';

// ---- pack shapes (a JSON import can't carry the optional fields we branch on) ----
type RawBlock = { when: string; result: string; headline: string; cite: string };
type RawProvision = { id: string; note: string; requires: string[]; volatility?: string };

const BLOCKS: RawBlock[] = pack.form_selection.fafsa_blocks;
const PROVISIONS: RawProvision[] = pack.va_student_provisions;

export interface AidEligibilityInput {
  student: Student;
  /** Provision ids from the pack the student may qualify under (e.g. ['domicile','tuition_equity']). */
  provisions?: string[];
  /** Evidence item ids on record. Ids match the entries in a provision's `requires` list. */
  evidence?: string[];
  deadlines: {
    /** The college's own priority date. Often the earliest — and the one students never hear about. */
    collegePriority?: ISODate;
    /** The state deadline. Omit and it is derived from the pack's VASA priority date. */
    state?: ISODate;
    /** The federal deadline (the late fallback most guidance quotes). */
    federal?: ISODate;
    /** The day the analysis is run from; sets the margin and resolves the pack's MM-DD priority date. */
    asOf: ISODate;
  };
}

export type AidForm = 'FAFSA' | 'VASA' | 'none';

export interface AidFormSelection {
  form: AidForm;
  label: string;
  reason: string;
}

export interface ProvisionChecklist {
  id: string;
  note: string;
  /** Required evidence ids that are on record. */
  present: string[];
  /** Required evidence ids that are not. */
  missing: string[];
  satisfied: boolean;
  volatility?: string;
}

export interface DeadlineCandidate {
  id: 'college_priority' | 'state' | 'federal';
  label: string;
  date?: ISODate;
  /** Whether this is the one that actually binds. */
  binding: boolean;
  /** How this date relates to the binding one, or why it is unknown. */
  note: string;
}

export interface AidDeadline {
  candidates: DeadlineCandidate[];
  binding?: DeadlineCandidate;
  /** Days between asOf and the binding date. Negative once it has passed. */
  daysOfMargin?: number;
  /** Display banding only — the pack sets no margin thresholds. */
  marginBand: 'green' | 'amber' | 'red';
  consequenceOfMissing: string;
  rule: string;
  cite: string;
}

// ---- small date helpers (same arithmetic the other engines use) ----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toOrdinal(iso: string): number {
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / 86_400_000);
}

/** Exported so the screen prints a date exactly as the reasoning steps print it. */
export function formatAidDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Resolve the pack's MM-DD priority date to the next time it comes round on or after `asOf`. */
function nextOccurrence(mmdd: string, asOf: ISODate): ISODate {
  const year = Number(asOf.slice(0, 4));
  const thisYear = `${year}-${mmdd}`;
  return toOrdinal(thisYear) >= toOrdinal(asOf) ? thisYear : `${year + 1}-${mmdd}`;
}

/** Turn an evidence/provision id into readable prose without a hardcoded label table. */
function humanize(id: string): string {
  const words = id.split('_').map((w) => (w === 'va' ? 'VA' : w));
  const first = words[0];
  return [first === 'VA' ? first : first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
}

// A deliberately small, safe evaluator for the one condition shape the pack uses —
// "immigration.status in ['F1','J1','M1']". An unrecognised shape does NOT fire: PathWise
// declines to guess at a rule it cannot read, the same discipline as everywhere else.
function matchesWhen(when: string, student: Student): boolean {
  const m = when.match(/immigration\.status\s+in\s+\[([^\]]*)\]/);
  if (!m) return false;
  const statuses = m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
  return statuses.includes(student.immigration.status);
}

/** The status block that closes Virginia state aid, if one applies. */
export function findStatusBlock(student: Student): RawBlock | undefined {
  return BLOCKS.find((b) => b.result === 'ineligible' && matchesWhen(b.when, student));
}

/**
 * Which form to file. Straight from the pack's form-selection rule: FAFSA covers both federal and
 * state aid, so anyone who can file it should; VASA exists only for students who cannot.
 */
export function selectAidForm(student: Student): AidFormSelection {
  const block = findStatusBlock(student);
  if (!block) {
    return {
      form: 'FAFSA',
      label: 'File the FAFSA',
      reason:
        'No status block applies, so the FAFSA is open — and the FAFSA is the one to file, because it covers federal and state aid together. The state alternative exists only for students who cannot file it.',
    };
  }
  // The block sits inside form_selection, so it closes the FAFSA route; and it is the state-aid
  // door it names. VASA cannot reopen a door that status has already closed.
  return {
    form: 'none',
    label: 'Neither form opens Virginia state aid',
    reason: `${block.headline}, and that block sits inside the form-selection rule itself — so the FAFSA route is closed too. The state alternative is only for students who cannot file the FAFSA, but it applies for the very aid this status blocks, so filing it would not reopen the door. What remains is institutional and private aid, which the financial aid office administers directly.`,
  };
}

/** Per-provision evidence checklist: what is on record, what is still missing. */
export function buildProvisionChecklists(input: AidEligibilityInput): ProvisionChecklist[] {
  const have = new Set(input.evidence ?? []);
  const wanted = input.provisions ?? [];
  return PROVISIONS.filter((p) => wanted.includes(p.id)).map((p) => {
    const present = p.requires.filter((r) => have.has(r));
    const missing = p.requires.filter((r) => !have.has(r));
    return {
      id: p.id,
      note: p.note,
      present,
      missing,
      satisfied: missing.length === 0,
      volatility: p.volatility,
    };
  });
}

/**
 * The deadline that actually binds: the EARLIEST of {college priority, state, federal}.
 * The pack's rule names the three candidates; the labels below are matched to it by keyword, so
 * reordering the rule text cannot mislabel a date.
 */
export function resolveAidDeadline(input: AidEligibilityInput): AidDeadline {
  const { asOf } = input.deadlines;

  // Pull the candidate names out of the rule's own "{a, b, c}" set, so the screen speaks the
  // rulepack's vocabulary. Fall back to plain labels if the rule is ever rewritten without a set.
  const setText = pack.deadlines.rule.match(/\{([^}]*)\}/)?.[1] ?? '';
  const names = setText.split(',').map((s) => s.trim()).filter(Boolean);
  const labelFor = (keyword: string, fallback: string): string => {
    const hit = names.find((n) => n.toLowerCase().includes(keyword));
    return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : fallback;
  };

  const stateDate = input.deadlines.state ?? nextOccurrence(pack.deadlines.vasa_priority_date, asOf);

  const candidates: DeadlineCandidate[] = [
    { id: 'college_priority', label: labelFor('college', 'College priority date'), date: input.deadlines.collegePriority, binding: false, note: '' },
    { id: 'state', label: labelFor('state', 'State deadline'), date: stateDate, binding: false, note: '' },
    { id: 'federal', label: labelFor('federal', 'Federal deadline'), date: input.deadlines.federal, binding: false, note: '' },
  ];

  const known = candidates.filter((c) => c.date);
  const binding = known.slice().sort((a, b) => toOrdinal(a.date!) - toOrdinal(b.date!))[0];

  for (const c of candidates) {
    if (!c.date) {
      c.note = 'Not on record — if it is earlier than the others, it is the real deadline.';
      continue;
    }
    if (binding && c.id === binding.id) {
      c.binding = true;
      c.note = 'The earliest of the three — this is the one that binds.';
      continue;
    }
    const later = toOrdinal(c.date) - toOrdinal(binding!.date!);
    c.note = `${later} days later — waiting for this one forfeits the aid the earlier date controls.`;
  }

  const daysOfMargin = binding ? toOrdinal(binding.date!) - toOrdinal(asOf) : undefined;
  const marginBand: AidDeadline['marginBand'] =
    daysOfMargin === undefined ? 'red' : daysOfMargin < 0 ? 'red' : daysOfMargin <= 30 ? 'amber' : 'green';

  const latest = known.slice().sort((a, b) => toOrdinal(b.date!) - toOrdinal(a.date!))[0];
  const consequenceOfMissing = binding
    ? `Miss ${formatAidDate(binding.date!)} and the aid that date controls is allocated without this student — the ${latest.label.toLowerCase()} on ${formatAidDate(latest.date!)} is ${toOrdinal(latest.date!) - toOrdinal(binding.date!)} days later and does not rescue it.`
    : 'No candidate dates are on record, so the binding deadline cannot be computed yet.';

  return {
    candidates,
    binding,
    daysOfMargin,
    marginBand,
    consequenceOfMissing,
    rule: pack.deadlines.rule,
    cite: pack.deadlines.cite,
  };
}

/**
 * Run the Virginia aid analysis. Returns a Finding, the same shape runDomicileGate returns —
 * one record, three readers.
 */
export function computeAidEligibility(input: AidEligibilityInput): Finding {
  const { student } = input;
  const status = student.immigration.status;

  const block = findStatusBlock(student);
  const form = selectAidForm(student);
  const checklists = buildProvisionChecklists(input);
  const deadline = resolveAidDeadline(input);

  const steps: Finding['reasoning_steps'] = [
    { claim: `The student holds ${status} status.`, from_events: [], from_evidence: [] },
  ];

  if (block) {
    steps.push({
      claim: `${block.headline}. Virginia state aid is closed by that one fact, before any question of need, merit or paperwork is reached.`,
      from_events: [],
      from_evidence: [],
    });
  } else {
    steps.push({
      claim: 'No status block in the aid rulepack applies to this student, so the state-aid door stays open.',
      from_events: [],
      from_evidence: [],
    });
  }

  steps.push({ claim: form.reason, from_events: [], from_evidence: [] });

  for (const c of checklists) {
    const total = c.present.length + c.missing.length;
    const items = total === 1 ? 'required item' : `of ${total} required items`;
    const tally = c.present.length
      ? `${c.present.length} ${items} on record: ${c.present.map(humanize).join(', ')}`
      : `none ${total === 1 ? 'of its one required item' : items} on record yet`;
    const missingText = c.missing.length ? `; still missing: ${c.missing.map(humanize).join(', ')}` : '';
    steps.push({
      claim: `${humanize(c.id)} provision — ${c.note} ${tally}${missingText}.`,
      from_events: [],
      from_evidence: c.present,
    });
  }

  if (deadline.binding) {
    const others = deadline.candidates
      .filter((c) => c.date && !c.binding)
      .map((c) => `${c.label.toLowerCase()} ${formatAidDate(c.date!)}`)
      .join(', ');
    steps.push({
      claim: `The deadline that binds is ${formatAidDate(deadline.binding.date!)} (${deadline.binding.label.toLowerCase()}) — the earliest of the three, ahead of ${others}. ${
        deadline.daysOfMargin !== undefined && deadline.daysOfMargin >= 0
          ? `${deadline.daysOfMargin} days of margin from today.`
          : 'It has already passed.'
      }`,
      from_events: [],
      from_evidence: [],
    });
  }

  steps.push({
    claim: `${pack.confidentiality.note} ${pack.confidentiality.product_consequence}`,
    from_events: [],
    from_evidence: [],
  });

  // Missing evidence is stated as an open question, never resolved by assumption.
  const unknowns: Finding['unknowns'] = [];
  for (const c of checklists) {
    const total = c.present.length + c.missing.length;
    for (const item of c.missing) {
      unknowns.push({
        what: `${humanize(item)} — required for the ${humanize(c.id).toLowerCase()} provision.`,
        why_it_matters: `${
          total === 1 ? 'That provision rests on this one item.' : `That provision needs all ${total} of its required items.`
        } Without it, PathWise cannot establish it as a route to Virginia state aid${
          c.volatility ? `, and the provision itself is ${c.volatility.replace(/_/g, ' ')}` : ''
        }.`,
        how_to_resolve:
          'Upload the document that establishes it, or ask the financial aid office which proof they accept.',
      });
    }
  }

  const missingDate = deadline.candidates.find((c) => !c.date);
  if (missingDate) {
    unknowns.push({
      what: `${missingDate.label} is not on record.`,
      why_it_matters:
        'The true deadline is the earliest of the three dates, so an unknown date could be the one that actually binds.',
      how_to_resolve: `Confirm the ${missingDate.label.toLowerCase()} with the financial aid office and re-run this finding.`,
    });
  }

  const result: Finding['result'] = block
    ? 'ineligible'
    : unknowns.length > 0
    ? 'review_recommended'
    : 'no_issue';

  const headline = block ? block.headline : `${form.label} — Virginia state aid is not blocked by status`;

  // A provision under litigation is more specific to this student than the pack-wide note, so it
  // wins when one is actually in play.
  const litigated = checklists.find((c) => c.volatility === 'under_litigation');
  const volatility: Finding['volatility'] = litigated
    ? {
        status: 'under_litigation',
        note: `The ${humanize(litigated.id).toLowerCase()} provision is under litigation. ${pack.volatility.note}`,
      }
    : {
        status: pack.volatility.status as NonNullable<Finding['volatility']>['status'],
        note: pack.volatility.note,
      };

  return {
    rule_id: 'va-aid:eligibility',
    domain: 'aid',
    result,
    headline,
    reasoning_steps: steps,
    rule_citation: {
      text: pack.form_selection.rule,
      // The pack's authority line may already name the block's cite; don't say it twice.
      authority:
        block && !pack.authority.includes(block.cite) ? `${block.cite}; ${pack.authority}` : pack.authority,
      source_url: pack.source_url,
      verified_on: pack.verified_on,
    },
    unknowns,
    deciding_office: 'financial_aid',
    volatility,
  };
}
