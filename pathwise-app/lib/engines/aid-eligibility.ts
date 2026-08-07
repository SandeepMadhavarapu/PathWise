// aid-eligibility.ts — Engine C: the financial-aid reader of the same student record.
//
// Four questions, one Finding:
//   1. Which form does this student file — FAFSA or the state's own alternative?
//   2. Does their immigration status close that state's aid door outright?
//   3. For each state provision they might qualify under, what evidence is on record and what is
//      still missing? (Missing items become honest `unknowns`, never a guess.)
//   4. What is their REAL deadline — the earliest of {college priority, state, federal}, not the
//      federal fallback everybody quotes.
//
// Everything rule-shaped is read from the aid pack the caller supplies: the blocked statuses, the
// form-selection rule, the provisions and their required evidence, the state priority date, the
// earliest-of rule, and the confidentiality note. Nothing here restates a rule the pack owns, and
// nothing here names a jurisdiction — see engines/jurisdiction.ts for where a pack comes from.

import type { Student, Finding, ISODate } from '../types';
import type { AidPack, JurisdictionPacks } from '../rulepacks';
import type { StatusClassification } from '../rulepacks/schema';
import { formatImmigrationStatus } from '../format';
import { jurisdictionByCode } from '../coverage';

// ---- pack shapes (a JSON import can't carry the optional fields we branch on) ----
type RawBlock = { when: string; result: string; headline: string; cite: string };
type RawProvision = { id: string; note: string; requires: string[]; volatility?: string };

/**
 * One aid pack, read once, in the vocabulary this engine uses. Same values the module constants
 * held when the Virginia pack was imported at the top of this file — the change is only that the
 * pack now arrives with the student instead of being assumed.
 */
export interface AidView {
  packId: string;
  blocks: RawBlock[];
  provisions: RawProvision[];
  jurisdictionCode: string;
  jurisdictionName: string;
  /**
   * The pack's authority abbreviated for a compact chip. `authority` is the full attribution the
   * findings carry; this is the same source written short enough for a card, in the pack's own
   * spelling rather than one retyped into a component. Display only — no condition reads it.
   */
  displayCite: string;
  authority: string;
  sourceUrl: string;
  verifiedOn: string;
  formSelectionRule: string;
  priorityDate: string;
  deadlineRule: string;
  deadlineCite: string;
  confidentialityNote: string;
  confidentialityConsequence: string;
  volatility: { status: string; note: string };
  /** How far this pack's status rule was read, or undefined where it states none. */
  statusClassification?: StatusClassification;
  /**
   * Whether this pack has been authored against a given status. True where the pack states no
   * classification, so a pack making no claim about its own reach is left exactly as it was.
   */
  classifiesStatus: (status: string) => boolean;
}

export function aidView(pack: AidPack): AidView {
  return {
    packId: pack.pack_id,
    blocks: pack.form_selection.fafsa_blocks,
    provisions: pack.state_provisions,
    jurisdictionCode: pack.jurisdiction,
    jurisdictionName: jurisdictionByCode(pack.jurisdiction)?.name ?? pack.jurisdiction,
    displayCite: pack.display_cite,
    authority: pack.authority,
    sourceUrl: pack.source_url,
    verifiedOn: pack.verified_on,
    formSelectionRule: pack.form_selection.rule,
    priorityDate: pack.deadlines.priority_date,
    deadlineRule: pack.deadlines.rule,
    deadlineCite: pack.deadlines.cite,
    confidentialityNote: pack.confidentiality.note,
    confidentialityConsequence: pack.confidentiality.product_consequence,
    volatility: { status: pack.volatility.status, note: pack.volatility.note },
    statusClassification: pack.status_classification,
    classifiesStatus: (status) =>
      !pack.status_classification || pack.status_classification.classified.includes(status),
  };
}

export interface AidEligibilityInput {
  student: Student;
  /** Provision ids from the pack the student may qualify under (e.g. ['domicile','tuition_equity']). */
  provisions?: string[];
  /** Evidence item ids on record. Ids match the entries in a provision's `requires` list. */
  evidence?: string[];
  deadlines: {
    /** The college's own priority date. Often the earliest — and the one students never hear about. */
    collegePriority?: ISODate;
    /** The state deadline. Omit and it is derived from the pack's own priority date. */
    state?: ISODate;
    /** The federal deadline (the late fallback most guidance quotes). */
    federal?: ISODate;
    /** The day the analysis is run from; sets the margin and resolves the pack's MM-DD priority date. */
    asOf: ISODate;
  };
}

/**
 * An AidEligibilityInput with the packs that decide it attached. The jurisdiction router injects
 * `packs`; callers build the pack-free input, so a fixture stays a record of facts rather than a
 * claim about whose rules apply.
 */
export type AidEligibilityRun = AidEligibilityInput & {
  /**
   * The aid pack that decides this run. Narrowed from `JurisdictionPacks` because `aid` is optional
   * there — a jurisdiction may have residency rules authored and no aid rules — and the decision
   * about whether an aid pack exists belongs to the router, not to this engine. An engine that
   * accepted `undefined` would be an engine that had to decide what to do without rules, which is
   * the question the whole seam exists to answer somewhere else.
   */
  packs: JurisdictionPacks & { aid: AidPack };
};

/**
 * The form a student files. `state_alternative` is deliberately generic: every state that has one
 * calls it something different (Virginia's is VASA), and the pack's own `form_selection.rule` is
 * where that name belongs. A union member spelled in one state's vocabulary is a Virginia binding
 * in a type every jurisdiction has to share.
 *
 * `undetermined` is the fourth answer, and it is not `none`. `none` is a determinate finding — both
 * forms were considered and status closed both. `undetermined` says PathWise could not work out
 * which form applies, because the pack's form-selection rule turns on a status it was never authored
 * against. Collapsing the two would tell a student their doors are shut when what actually happened
 * is that nobody looked.
 */
export type AidForm = 'FAFSA' | 'state_alternative' | 'none' | 'undetermined';

export interface AidFormSelection {
  form: AidForm;
  label: string;
  reason: string;
  /**
   * What the student still has when neither form opens state aid. Present iff `form` is `'none'`.
   *
   * It is a field rather than a sentence a screen retypes because a card has no room for the full
   * `reason` and the alternative — a screen summarising it in its own words — is how "File the FAFSA
   * path instead" came to sit on the dashboard directly contradicting this engine. The same string
   * is what `reason` ends with, so the two cannot drift.
   */
  remains?: string;
}

/**
 * The route a status block leaves open. Stated once, here, and read by both the reasoning step and
 * the dashboard card — it names an office rather than a form, because the office is what a student
 * blocked out of both forms can actually still walk into.
 */
const REMAINING_ROUTE =
  'What remains is institutional and private aid, which the financial aid office administers directly.';

/**
 * The route left open when PathWise cannot tell which form applies — deliberately different from
 * REMAINING_ROUTE above.
 *
 * REMAINING_ROUTE is what is left after a door was CLOSED. This one is said when no door was closed
 * and none was opened either, so it must not narrow the student to the leftovers: every pathway the
 * pack states is still available to them, and the office is being asked which one, not asked for
 * charity.
 */
const UNDETERMINED_ROUTE =
  'The financial aid office can say which form applies once it knows the exact status on the record — ' +
  'and every pathway this pack states, including its state alternative, is still open until it does.';

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

/**
 * Turn an evidence/provision id into readable prose without a hardcoded label table.
 *
 * A pack names some of its ids after its own state ("va_high_school_attendance"), and that token is
 * an initialism rather than a word. Which token counts is the PACK's jurisdiction code, not a
 * literal: "id", "in", "or" and "me" are all state codes and all plausible id fragments, so
 * uppercasing any two-letter token would mangle ids the pack never meant as abbreviations.
 */
function humanize(id: string, jurisdictionCode?: string): string {
  const code = jurisdictionCode?.toLowerCase();
  const words = id.split('_').map((w) => (code && w === code ? w.toUpperCase() : w));
  const first = words[0];
  const isInitialism = /^[A-Z]{2,}$/.test(first);
  return [isInitialism ? first : first.charAt(0).toUpperCase() + first.slice(1), ...words.slice(1)].join(' ');
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

/** The status block that closes this jurisdiction's state aid, if one applies. */
export function findStatusBlock(student: Student, v: AidView): RawBlock | undefined {
  return v.blocks.find((b) => b.result === 'ineligible' && matchesWhen(b.when, student));
}

/**
 * Which form to file. Straight from the pack's form-selection rule: FAFSA covers both federal and
 * state aid, so anyone who can file it should; the state alternative exists only for students who
 * cannot.
 */
export function selectAidForm(student: Student, v: AidView): AidFormSelection {
  const block = findStatusBlock(student, v);
  if (!block) {
    // The pack's rule is a POSITIVE predicate — "students ELIGIBLE FOR FAFSA should file FAFSA" —
    // and this branch had been reading "no block matched" as though it established that eligibility.
    // It does not. A block is a blacklist, and for a status the pack was never authored against
    // (`other` is not a status; it is the absence of one) nothing here has been decided at all.
    //
    // Declining is the whole point, and the direction matters: this must NOT become "you are not
    // eligible". Virginia has non-citizen aid pathways — the pack's own rule names VASA for students
    // who cannot file the FAFSA, and its tuition-equity provision is one such route. Saying "no form
    // for you" would close doors the source keeps open. Saying "PathWise cannot tell which form"
    // leaves them exactly as open as they were and sends the student to the office that knows.
    if (!v.classifiesStatus(student.immigration.status)) {
      const sc = v.statusClassification!;
      return {
        form: 'undetermined',
        label: `PathWise cannot determine which ${v.jurisdictionName} aid form applies`,
        reason:
          `${v.formSelectionRule} Which form applies therefore turns on the specific status held, and ` +
          `this record's status is not one of the ${sc.classified.length} ${v.jurisdictionName}'s aid ` +
          `pack has been authored against. That is a gap in PathWise's reading, not a closed door: ` +
          `no status block applies either, so nothing here says this student is ineligible. ` +
          `${UNDETERMINED_ROUTE}`,
        remains: UNDETERMINED_ROUTE,
      };
    }
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
    label: `Neither form opens ${v.jurisdictionName} state aid`,
    reason: `${block.headline}, and that block sits inside the form-selection rule itself — so the FAFSA route is closed too. The state alternative is only for students who cannot file the FAFSA, but it applies for the very aid this status blocks, so filing it would not reopen the door. ${REMAINING_ROUTE}`,
    remains: REMAINING_ROUTE,
  };
}

/** Per-provision evidence checklist: what is on record, what is still missing. */
export function buildProvisionChecklists(input: AidEligibilityRun): ProvisionChecklist[] {
  const have = new Set(input.evidence ?? []);
  const wanted = input.provisions ?? [];
  return aidView(input.packs.aid).provisions.filter((p) => wanted.includes(p.id)).map((p) => {
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
export function resolveAidDeadline(input: AidEligibilityRun): AidDeadline {
  const { asOf } = input.deadlines;
  const v = aidView(input.packs.aid);

  // Pull the candidate names out of the rule's own "{a, b, c}" set, so the screen speaks the
  // rulepack's vocabulary. Fall back to plain labels if the rule is ever rewritten without a set.
  const setText = v.deadlineRule.match(/\{([^}]*)\}/)?.[1] ?? '';
  const names = setText.split(',').map((s) => s.trim()).filter(Boolean);
  const labelFor = (keyword: string, fallback: string): string => {
    const hit = names.find((n) => n.toLowerCase().includes(keyword));
    return hit ? hit.charAt(0).toUpperCase() + hit.slice(1) : fallback;
  };

  const stateDate = input.deadlines.state ?? nextOccurrence(v.priorityDate, asOf);

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
    rule: v.deadlineRule,
    cite: v.deadlineCite,
  };
}

/**
 * Run the aid analysis for whichever jurisdiction's pack was injected. Returns a Finding, the same
 * shape runDomicileGate returns — one record, three readers.
 */
export function computeAidEligibility(input: AidEligibilityRun): Finding {
  const { student } = input;
  const status = student.immigration.status;
  const v = aidView(input.packs.aid);

  const block = findStatusBlock(student, v);
  const form = selectAidForm(student, v);
  const checklists = buildProvisionChecklists(input);
  const deadline = resolveAidDeadline(input);

  // Bound to this pack's own code, so an id the pack abbreviates after itself reads as an
  // initialism and one it does not stays a word. Never passed to `.map` bare — the index would
  // arrive as the jurisdiction code.
  const label = (id: string): string => humanize(id, v.jurisdictionCode);

  const steps: Finding['reasoning_steps'] = [
    // Display form only — `status` itself is what the pack's conditions are matched against.
    { claim: `The student holds ${formatImmigrationStatus(status)} status.`, from_events: [], from_evidence: [] },
  ];

  if (block) {
    steps.push({
      claim: `${block.headline}. ${v.jurisdictionName} state aid is closed by that one fact, before any question of need, merit or paperwork is reached.`,
      from_events: [],
      from_evidence: [],
    });
  } else if (!v.classifiesStatus(status)) {
    // Says the two things separately, because they are two facts and only the first was ever true
    // of an unclassified status: no block matched, AND that is not the same as the door being open.
    steps.push({
      claim:
        `No status block in the aid rulepack applies to this student — but this status is not one of ` +
        `the ${v.statusClassification!.classified.length} the ${v.jurisdictionName} aid pack has been ` +
        `authored against, so "no block matched" establishes nothing here. ${v.statusClassification!.note}`,
      from_events: [],
      from_evidence: [],
    });
    steps.push({
      claim:
        `PathWise therefore cannot say which form opens ${v.jurisdictionName} state aid for this ` +
        `student. It is not saying the door is closed: no rule in this pack closes it, and the ` +
        `state alternative exists precisely for students the FAFSA route does not fit.`,
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
    // The tally opens a sentence — `note` ends with a full stop — so it has to read like one.
    // This produced "…provision. none of its one required item on record yet", which is both
    // lower-cased mid-paragraph and ungrammatical. Presentation only: the counts, the item names
    // and the branch conditions are untouched.
    const tally = c.present.length
      ? `${c.present.length} ${items} on record: ${c.present.map(label).join(', ')}`
      : total === 1
        ? 'Its one required item is not yet on record'
        : `None of its ${total} required items are on record yet`;
    const missingText = c.missing.length ? `; still missing: ${c.missing.map(label).join(', ')}` : '';
    steps.push({
      claim: `${label(c.id)} provision — ${c.note} ${tally}${missingText}.`,
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
    claim: `${v.confidentialityNote} ${v.confidentialityConsequence}`,
    from_events: [],
    from_evidence: [],
  });

  // Missing evidence is stated as an open question, never resolved by assumption.
  //
  // What an open question MEANS, though, depends on whether anything is still open. When a status
  // block has already closed this jurisdiction's aid, no provision below is an available route and
  // no document makes one — so saying "without it, PathWise cannot establish it as a route to state
  // aid" would invite the student to go and get a document that changes nothing. The gap is still
  // reported (it is real, and a change of status would make it live again); what it is reported AS
  // is different.
  const unknowns: Finding['unknowns'] = [];
  for (const c of checklists) {
    const total = c.present.length + c.missing.length;
    const rests =
      total === 1
        ? 'That provision rests on this one item.'
        : `That provision needs all ${total} of its required items.`;
    const litigated = c.volatility ? ` The provision itself is ${c.volatility.replace(/_/g, ' ')}.` : '';

    for (const item of c.missing) {
      unknowns.push({
        what: `${label(item)} — required for the ${label(c.id).toLowerCase()} provision.`,
        why_it_matters: block
          ? `${rests} It is moot for this student either way: ${block.headline}, so no provision below is an available route to ${v.jurisdictionName} state aid and no document reopens one. PathWise reports it because it is genuinely absent from the record, not because producing it would change this finding.${litigated}`
          : `${rests} Without it, PathWise cannot establish it as a route to ${v.jurisdictionName} state aid.${litigated}`,
        how_to_resolve: block
          ? 'Nothing needs to be produced for this finding. Keep the document if you have it — it becomes relevant again only if the status this rests on changes.'
          : 'Upload the document that establishes it, or ask the financial aid office which proof they accept.',
      });
    }
  }

  // The status gap leads the list, because it qualifies the whole finding rather than one document.
  const unclassified = !block && !v.classifiesStatus(status);
  if (unclassified) {
    unknowns.unshift({
      what: `Which immigration status does "${formatImmigrationStatus(status)}" stand for, and which ${v.jurisdictionName} aid pathway does it fall under?`,
      why_it_matters:
        `${v.jurisdictionName}'s form-selection rule turns on the specific status held, and PathWise ` +
        `has read that rule for ${v.statusClassification!.classified.length} statuses — this is not ` +
        `one of them. No status block closes this student's aid either, so this is PathWise declining ` +
        `to answer, NOT a finding of ineligibility: the pathways this pack states, including its ` +
        `state alternative, remain open.`,
      how_to_resolve:
        `Tell the financial aid office the exact status on the record (the visa category or ` +
        `classification, not "other") and ask which application opens ${v.jurisdictionName} state aid for it.`,
    });
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

  // `unable_to_verify`, never `ineligible`. The pack has not been read for this status, which is a
  // statement about PathWise and not about the student — and the product already has a verdict that
  // means exactly that, used for an unmodelled jurisdiction. This is the same situation one layer in.
  const result: Finding['result'] = block
    ? 'ineligible'
    : unclassified
    ? 'unable_to_verify'
    : unknowns.length > 0
    ? 'review_recommended'
    : 'no_issue';

  const headline = block
    ? block.headline
    : unclassified
      ? // Names what PathWise has not done. It deliberately does not contain the words "not blocked",
        // which is the determinate claim this branch exists to stop making.
        `PathWise has not read ${v.jurisdictionName}'s aid rules for this immigration status`
      : `${form.label} — ${v.jurisdictionName} state aid is not blocked by status`;

  // A provision under litigation is more specific to this student than the pack-wide note, so it
  // wins when one is actually in play.
  const litigated = checklists.find((c) => c.volatility === 'under_litigation');
  const volatility: Finding['volatility'] = litigated
    ? {
        status: 'under_litigation',
        note: `The ${label(litigated.id).toLowerCase()} provision is under litigation. ${v.volatility.note}`,
      }
    : {
        status: v.volatility.status as NonNullable<Finding['volatility']>['status'],
        note: v.volatility.note,
      };

  return {
    rule_id: `${v.packId}:eligibility`,
    domain: 'aid',
    result,
    headline,
    reasoning_steps: steps,
    rule_citation: {
      text: v.formSelectionRule,
      // The pack's authority line may already name the block's cite; don't say it twice.
      authority:
        block && !v.authority.includes(block.cite) ? `${block.cite}; ${v.authority}` : v.authority,
      source_url: v.sourceUrl,
      verified_on: v.verifiedOn,
    },
    unknowns,
    deciding_office: 'financial_aid',
    volatility,
  };
}
