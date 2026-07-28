// validate.ts — the checks that are about AUTHORING QUALITY rather than structural safety.
//
// Two layers, deliberately separated:
//
//   schema.ts  parses, ships, and throws. It enforces the things that must be true for the engines
//              to be safe — required fields, and membership of the closed sets that select engine
//              behaviour. If one of those is wrong the app cannot start.
//
//   this file  is the editorial standard. Is the source URL an official one? Is the verification
//              date real, and not in the future? Does a pack that claims `modelled` actually carry
//              the rules that claim implies?
//
// The second set is not a runtime concern — a pack that is structurally sound but under-verified
// answers correctly, it is just not yet trustworthy enough to ship. So these run in `npm test`,
// which is the gate before a deploy, and nothing here is imported by a page.

import type { AidPack, Capability, DomicilePack } from './schema';
import { jurisdictionByCode } from '../coverage';

export interface ValidationProblem {
  packId: string;
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Hosts a citation may point at.
 *
 * A rule pack's authority is a government or public-university publication or it is not an
 * authority. This is the check that stops a plausible-looking blog post becoming the basis of a
 * finding — the failure that would be hardest for a reader to catch, because a link looks like a
 * link.
 */
const OFFICIAL_HOST = /(^|\.)(gov|edu|us)$/i;

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function checkSourceUrl(packId: string, label: string, url: string, out: ValidationProblem[]): void {
  const host = hostOf(url);
  if (!host) {
    out.push({ packId, severity: 'error', message: `${label} is not a valid URL: ${url}` });
    return;
  }
  if (!url.startsWith('https://')) {
    out.push({ packId, severity: 'error', message: `${label} must be https: ${url}` });
  }
  if (!OFFICIAL_HOST.test(host)) {
    out.push({
      packId,
      severity: 'error',
      message:
        `${label} points at "${host}", which is not a .gov/.edu/.us host. A rule pack's authority ` +
        `has to be the body's own publication — PathWise will not rest a finding on a secondary source.`,
    });
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function checkVerifiedOn(packId: string, date: string, today: string, out: ValidationProblem[]): void {
  if (!ISO_DATE.test(date)) {
    out.push({ packId, severity: 'error', message: `verified_on must be YYYY-MM-DD (got "${date}")` });
    return;
  }
  if (date > today) {
    out.push({
      packId,
      severity: 'error',
      message: `verified_on "${date}" is in the future — a source cannot have been read on a day that has not happened`,
    });
  }
}

/**
 * What a capability level OBLIGES the pack to carry.
 *
 * This is the honesty check with the most teeth: a pack may not declare `modelled` for residency
 * and then omit the rules that word implies. Without it, "modelled" would mean whatever the author
 * felt like, and the coverage map — which is derived from these declarations — would inherit the
 * vagueness.
 */
function checkDomicileCapabilities(pack: DomicilePack, out: ValidationProblem[]): void {
  const residency = pack.capabilities.find((c) => c.domain === 'residency');
  if (!residency) {
    out.push({
      packId: pack.pack_id,
      severity: 'error',
      message: 'a domicile pack must declare a residency capability',
    });
    return;
  }
  if (residency.level !== 'modelled') return;

  const required: [keyof DomicilePack, string][] = [
    ['gates', 'at least one gate'],
    ['intent_factors', 'the intent factors it weighs'],
  ];
  for (const [field, what] of required) {
    const value = pack[field];
    if (!Array.isArray(value) || value.length === 0) {
      out.push({
        packId: pack.pack_id,
        severity: 'error',
        message: `declares residency "modelled" but carries no ${what} (${String(field)})`,
      });
    }
  }

  // A clock is NOT required — some states have no durational rule. But if the pack declares it
  // answers one, it has to have one.
  if (residency.answers?.includes('durational_clock') && !pack.clock) {
    out.push({
      packId: pack.pack_id,
      severity: 'error',
      message: 'declares it answers "durational_clock" but carries no clock block',
    });
  }
  if (pack.clock && !residency.answers?.includes('durational_clock')) {
    out.push({
      packId: pack.pack_id,
      severity: 'warning',
      message: 'carries a clock block but does not list "durational_clock" among what it answers',
    });
  }
}

function checkAidCapabilities(pack: AidPack, out: ValidationProblem[]): void {
  const aid = pack.capabilities.find((c) => c.domain === 'aid');
  if (!aid) {
    out.push({ packId: pack.pack_id, severity: 'error', message: 'an aid pack must declare an aid capability' });
    return;
  }
  if (aid.level !== 'modelled') return;
  if (pack.form_selection.fafsa_blocks.length === 0) {
    out.push({
      packId: pack.pack_id,
      severity: 'error',
      message: 'declares aid "modelled" but states no form-selection blocks',
    });
  }
}

/** Shared checks over any pack header. */
function checkHeader(
  pack: DomicilePack | AidPack,
  today: string,
  out: ValidationProblem[],
): void {
  const id = pack.pack_id;

  if (pack.schema_version !== 1) {
    out.push({ packId: id, severity: 'error', message: `unknown schema_version ${pack.schema_version}` });
  }

  if (!jurisdictionByCode(pack.jurisdiction)) {
    out.push({
      packId: id,
      severity: 'error',
      message: `jurisdiction "${pack.jurisdiction}" is not listed in coverage.json`,
    });
  }

  checkSourceUrl(id, 'source_url', pack.source_url, out);
  checkVerifiedOn(id, pack.verified_on, today, out);

  if (pack.agencies.length === 0) {
    out.push({ packId: id, severity: 'error', message: 'must name at least one deciding agency' });
  }
  for (const agency of pack.agencies) {
    if (agency.source_url) checkSourceUrl(id, `agencies.${agency.id}.source_url`, agency.source_url, out);
  }

  const ids = pack.agencies.map((a) => a.id);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupes.length) {
    out.push({ packId: id, severity: 'error', message: `duplicate agency ids: ${[...new Set(dupes)].join(', ')}` });
  }

  // A pack answering for a domain it does not decide is a claim with no office behind it. The
  // parser already checks this for determinate levels; here it is checked for all of them, because
  // even "sourced_only" has to name WHO the source belongs to.
  for (const cap of pack.capabilities) {
    if (!pack.agencies.some((a) => a.decides.includes(cap.domain))) {
      out.push({
        packId: id,
        severity: 'error',
        message: `declares a ${cap.domain} capability but names no agency that decides ${cap.domain}`,
      });
    }
  }
}

export function validateDomicilePack(
  pack: DomicilePack,
  today: string,
  out: ValidationProblem[] = [],
): ValidationProblem[] {
  checkHeader(pack, today, out);
  checkDomicileCapabilities(pack, out);

  const gateIds = pack.gates.map((g) => g.id);
  const dupes = gateIds.filter((v, i) => gateIds.indexOf(v) !== i);
  if (dupes.length) {
    out.push({
      packId: pack.pack_id,
      severity: 'error',
      message: `duplicate gate ids: ${[...new Set(dupes)].join(', ')}`,
    });
  }

  // An auxiliary act naming a factor the pack does not weigh is a warning about nothing.
  const factorIds = new Set((pack.intent_factors ?? []).map((f) => f.id));
  for (const act of pack.auxiliary_acts_warning?.acts ?? []) {
    // Acts are matched to factors by word-stem, so an exact miss is a warning rather than an error.
    if (factorIds.size > 0 && !factorIds.has(act)) {
      out.push({
        packId: pack.pack_id,
        severity: 'warning',
        message: `auxiliary act "${act}" does not exactly name an intent factor — it will be matched by stem`,
      });
    }
  }

  return out;
}

export function validateAidPack(
  pack: AidPack,
  today: string,
  out: ValidationProblem[] = [],
): ValidationProblem[] {
  checkHeader(pack, today, out);
  checkAidCapabilities(pack, out);

  // A provision's required-evidence ids are what the checklist is built from; an empty list would
  // make a provision that is satisfied by nothing at all.
  for (const p of pack.state_provisions) {
    if (p.requires.length === 0) {
      out.push({
        packId: pack.pack_id,
        severity: 'error',
        message: `state provision "${p.id}" requires no evidence — it would be satisfied vacuously`,
      });
    }
  }

  return out;
}

/**
 * A pack that speaks for a domain another pack in the same jurisdiction has already spoken for.
 *
 * The coverage map is derived from these declarations, and the derivation takes the first pack to
 * claim a domain — so two claims on one domain would make the map depend on registration order,
 * which is not a fact about the jurisdiction.
 */
export function duplicateDomainClaims(
  registered: ReadonlyArray<{ code: string; capabilities: readonly Capability[] }>,
): string[] {
  const problems: string[] = [];
  for (const { code, capabilities } of registered) {
    const seen = new Set<string>();
    for (const cap of capabilities) {
      if (seen.has(cap.domain)) {
        problems.push(`${code}: more than one registered pack declares a "${cap.domain}" capability`);
      }
      seen.add(cap.domain);
    }
  }
  return problems;
}
