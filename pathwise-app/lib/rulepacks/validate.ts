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

/**
 * State agencies that publish on a .org or .com domain.
 *
 * The host heuristic above approximates "this is the body's own publication" and it produces false
 * negatives, because a number of genuine state agencies do not sit on a .gov: PHEAA, ISAC and HESAA
 * are statutory state bodies in Pennsylvania, Illinois and New Jersey; FAME is Maine's; VSAC is
 * Vermont's. Loosening the regex to admit .org would also admit every advocacy site and scraper
 * that has ever written about financial aid, which is the thing it exists to keep out.
 *
 * So: an allowlist, one line per domain, each one a record that somebody checked this host belongs
 * to that agency. It fails closed — a .org that is not on this list is still rejected — and it is
 * greppable, which a regex exception would not be.
 */
const OFFICIAL_NON_GOV_HOSTS: ReadonlySet<string> = new Set([
  'www.pheaa.org',       // Pennsylvania Higher Education Assistance Authority (state authority)
  'www.isac.org',        // Illinois Student Assistance Commission (state commission)
  'www.hesaa.org',       // NJ Higher Education Student Assistance Authority (state authority)
  'okhighered.org',      // Oklahoma State Regents for Higher Education
  'www.vsac.org',        // Vermont Student Assistance Corporation (public non-profit created by statute)
  'www.famemaine.com',   // Finance Authority of Maine (state authority)
  'www.msfinancialaid.org', // Mississippi Office of Student Financial Aid
  // The NC Residency Determination Service's own domain. RDS is statutory — Session Law 2015-241
  // authorises the NC State Education Assistance Authority to run a single centralised process
  // under N.C.G.S. §§ 116-143.1–143.3B, and its determination binds every institution in the state.
  'www.ncresidency.org',
]);

function isOfficialHost(host: string): boolean {
  return OFFICIAL_HOST.test(host) || OFFICIAL_NON_GOV_HOSTS.has(host);
}

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
  if (!isOfficialHost(host)) {
    out.push({
      packId,
      severity: 'error',
      message:
        `${label} points at "${host}", which is neither a .gov/.edu/.us host nor an allowlisted ` +
        `state agency domain. An authority has to be the body's own publication — PathWise will not ` +
        `rest a finding on a secondary source. If this host IS a state agency, add it to ` +
        `OFFICIAL_NON_GOV_HOSTS with a comment naming the body.`,
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

/**
 * The jurisdiction index's own source links, held to the pack standard.
 *
 * These are rendered to a student as "Official source →" on /coverage, which makes them exactly as
 * load-bearing as a pack's citation: a student who clicks one is being told this is where the rule
 * lives. There is no reason for the index to be checked less carefully than the packs are.
 */
export function validateIndexSources(
  jurisdictions: ReadonlyArray<{
    code: string;
    authority?: string;
    source_url?: string;
    source_check?: string;
    aid_authority?: string;
    aid_source_url?: string;
    aid_source_check?: string;
    unverifiable?: string;
  }>,
): ValidationProblem[] {
  const out: ValidationProblem[] = [];
  const CHECKS = new Set(['fetched', 'serving_blocked']);

  for (const j of jurisdictions) {
    for (const [label, url, authority, check] of [
      ['source_url', j.source_url, j.authority, j.source_check],
      ['aid_source_url', j.aid_source_url, j.aid_authority, j.aid_source_check],
    ] as const) {
      if (!url) {
        // A named authority with no link is fine; a link is what needs the checking.
        continue;
      }
      checkSourceUrl(j.code, label, url, out);
      if (!authority) {
        out.push({
          packId: j.code,
          severity: 'error',
          message: `${label} is set but no authority is named — a link with no body behind it says nothing about who decides`,
        });
      }
      if (!check || !CHECKS.has(check)) {
        out.push({
          packId: j.code,
          severity: 'error',
          message: `${label} is set but ${label.replace('_url', '_check')} does not record HOW it was confirmed`,
        });
      }
    }

    // The two are mutually exclusive by meaning: `unverifiable` says a source was sought and not
    // confirmed, so carrying one alongside a confirmed link would be saying both at once.
    if (j.unverifiable && (j.source_url || j.aid_source_url)) {
      out.push({
        packId: j.code,
        severity: 'error',
        message: 'is marked unverifiable but also carries a source link — one of the two is wrong',
      });
    }
  }
  return out;
}
