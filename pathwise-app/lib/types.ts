// types.ts — the foundation every engine depends on.
// The timeline is the product. Everything else is a view over it.

export type ISODate = string; // 'YYYY-MM-DD'

export type ImmigrationStatus =
  | 'citizen' | 'LPR' | 'LPR_applicant'
  | 'F1' | 'J1' | 'M1'
  | 'H4' | 'DACA' | 'TPS' | 'undocumented' | 'other';

export type ProgramLevel = 'bachelors' | 'masters' | 'doctoral' | 'other';

export type Confidence = 'confirmed' | 'extracted' | 'asserted' | 'inferred';

export interface Student {
  id: string;
  immigration: {
    status: ImmigrationStatus;
    status_since?: ISODate;
    prior_statuses: { status: ImmigrationStatus; from: ISODate; to: ISODate }[];
  };
  dob: ISODate;
  institutions: Institution[];
  jurisdiction_history: { state: string; from: ISODate; to?: ISODate }[];
}

export interface Institution {
  id: string;
  name: string;
  state: string;
  level: ProgramLevel;
}

export type EventType =
  | 'enrollment' | 'program_start' | 'program_end' | 'level_change'
  | 'transfer' | 'i20_issued' | 'cpt_auth' | 'opt_auth' | 'ead_issued'
  | 'employment' | 'unemployment_gap' | 'physical_move' | 'lease_signed'
  | 'tax_filed' | 'license_issued' | 'vehicle_registered'
  | 'voter_registered' | 'job_offer_accepted' | 'admission_applied'
  | 'admission_accepted' | 'status_change' | 'aid_application'
  | 'verification_request';

// The atom of the timeline.
export interface Event {
  id: string;
  type: EventType;
  date: ISODate;
  end_date?: ISODate;
  jurisdiction?: string;
  institution_id?: string;
  program_level?: ProgramLevel;
  attrs: Record<string, unknown>; // intensity, hours_per_week, is_coop, in_field, ...
  evidence_ids: string[];
  confidence: Confidence;
}

export type DocType =
  | 'I-20' | 'EAD' | 'I-797' | 'lease' | 'tax_return' | 'license'
  | 'transcript' | 'offer_letter' | 'other';

/**
 * What PathWise genuinely learned by reading a file in the browser — and nothing more.
 *
 * These are facts about the FILE, never about the document's contents: PathWise reads the bytes,
 * not the words. `sha256` is the proof of read, because a hash cannot be produced without passing
 * over every byte, and it discloses nothing about what those bytes say. The file itself is never
 * uploaded, never stored, and is released the moment this record is built.
 */
export interface LocalFileRead {
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  lastModified?: ISODate;
  /** Undefined only where SubtleCrypto is unavailable (an insecure origin) — never fabricated. */
  sha256?: string;
  /** When the read happened, ISO-8601. */
  readAt: string;
  /**
   * Where the file came from. A sample generated for a walkthrough goes through the identical read
   * path, so this flag is the only thing keeping it from ever reading as the student's own document.
   */
  origin: 'picked' | 'sample';
}

export interface Evidence {
  id: string;
  doc_type: DocType;
  file_ref: string;
  extracted: Record<string, { value: unknown; confidence: number; page?: number; bbox?: number[] }>;
  user_corrected: boolean;
  /**
   * Present when this evidence came from a file read on the student's own device. Its absence means
   * the evidence was asserted without a file behind it — the two are deliberately distinguishable.
   *
   * These facts live here rather than in `extracted` on purpose: `extracted` is for document FIELDS
   * pulled from content, and PathWise pulls none. Putting a filename there would claim an extraction
   * that never happened.
   */
  local?: LocalFileRead;
}

export type FindingResult =
  | 'no_issue' | 'review_recommended' | 'potential_risk'
  | 'unable_to_verify' | 'ineligible';

export type DecidingOffice =
  | 'DSO' | 'registrar' | 'domicile_officer'
  | 'financial_aid' | 'USCIS' | 'SEVP';

export interface RuleCitation {
  text: string;
  source_url?: string;
  authority: string;
  verified_on?: ISODate;
}

export interface Finding {
  rule_id: string;
  domain: 'immigration' | 'residency' | 'aid';
  result: FindingResult;
  headline: string;
  reasoning_steps: { claim: string; from_events: string[]; from_evidence: string[] }[];
  rule_citation: RuleCitation;
  unknowns: { what: string; why_it_matters: string; how_to_resolve: string }[];
  deciding_office: DecidingOffice;
  volatility?: { status: 'stable' | 'under_litigation' | 'recently_changed'; note: string };
}

// ---- Event Consequence Engine ----

export interface LifeEvent {
  type:
    | 'job_started' | 'job_offer_signed' | 'job_ended'
    | 'graduated' | 'program_changed' | 'level_changed'
    | 'transferred' | 'moved_state' | 'status_changed'
    | 'married' | 'turned_24' | 'ead_received';
  date: ISODate;
  attrs: {
    hours_per_week?: number;
    employer?: string;
    in_field?: boolean;
    is_coop?: boolean;
    state?: string;
    [k: string]: unknown;
  };
}

export interface Consequence {
  domain: 'immigration' | 'residency' | 'aid';
  kind:
    | 'clock_paused' | 'clock_started' | 'clock_not_paused'
    | 'obligation_created' | 'finding_invalidated'
    | 'eligibility_changed' | 'deadline_moved';
  effect: string;
  new_deadline?: { date?: ISODate; derivation: string; consequence_of_missing: string };
  supersedes?: string[]; // finding ids this event makes stale
  cite: RuleCitation;
  counterintuitive?: boolean;
}
