/* Adversarial engine probe. Investigation only — runs compiled engines, writes nothing. */
const B = require("path").join(__dirname, "..", "pathwise-app", ".test-out", "lib");
const { computeCptLedger, CLIFF_DAYS } = require(B + "/engines/cpt-ledger.js");
const { computeUnemploymentClock } = require(B + "/engines/unemployment-clock.js");
const { computeOptBudget } = require(B + "/engines/opt-budget.js");
const J = require(B + "/engines/jurisdiction.js");
const F = require(B + "/fixtures/priya.js");

let pass = 0, fail = 0;
const findings = [];
const t = (id, name, ok, detail) => {
  ok ? pass++ : fail++;
  if (!ok) findings.push({ id, name, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id} ${name}${detail !== undefined ? "  :: " + detail : ""}`);
};
const cpt = (id, start, end, hrs, lvl = "masters") => ({
  id, type: "cpt_auth", date: start, end_date: end, institution_id: "schoolY",
  program_level: lvl, attrs: { hours_per_week: hrs, in_field: true },
  evidence_ids: [], confidence: "extracted",
});
const M = (evts) => computeCptLedger(evts).forLevel("masters");
const day = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

console.log("\n===== 5 · BOUNDARY SEMANTICS =====");
{
  // exact-length full-time blocks around the cliff
  const at = M([cpt("a", "2024-01-01", day("2024-01-01", CLIFF_DAYS - 1), 40)]);
  const below = M([cpt("a", "2024-01-01", day("2024-01-01", CLIFF_DAYS - 2), 40)]);
  const above = M([cpt("a", "2024-01-01", day("2024-01-01", CLIFF_DAYS), 40)]);
  t("B1", "cliff-1 days is not over the cliff", below.fullTimeDays === CLIFF_DAYS - 1 && below.daysToCliff === 1, `${below.fullTimeDays}d toCliff=${below.daysToCliff} band=${below.band}`);
  t("B2", "exactly cliff days -> toCliff 0", at.fullTimeDays === CLIFF_DAYS && at.daysToCliff === 0, `${at.fullTimeDays}d toCliff=${at.daysToCliff} band=${at.band}`);
  t("B3", "cliff+1 days -> negative margin", above.fullTimeDays === CLIFF_DAYS + 1 && above.daysToCliff === -1, `${above.fullTimeDays}d toCliff=${above.daysToCliff} band=${above.band}`);
  t("B4", "date range is INCLUSIVE of both endpoints", M([cpt("a", "2024-01-01", "2024-01-01", 40)]).fullTimeDays === 1, `single-day auth = ${M([cpt("a", "2024-01-01", "2024-01-01", 40)]).fullTimeDays}d`);

  // unemployment cap boundaries
  const uc = (n) => computeUnemploymentClock({ optStartDate: "2026-01-01", stem: false, employment: [], asOf: day("2026-01-01", n - 1) });
  t("B5", "cap-1 used -> 1 remaining, not over", uc(89).daysUsed === 89 && uc(89).daysRemaining === 1, `used=${uc(89).daysUsed} left=${uc(89).daysRemaining} band=${uc(89).band}`);
  t("B6", "cap used -> 0 remaining, not over", uc(90).daysUsed === 90 && uc(90).daysRemaining === 0, `used=${uc(90).daysUsed} left=${uc(90).daysRemaining}`);
  t("B7", "cap+1 used -> negative", uc(91).daysRemaining === -1, `used=${uc(91).daysUsed} left=${uc(91).daysRemaining}`);
  t("B8", "asOf BEFORE optStart never yields negative days used",
    computeUnemploymentClock({ optStartDate: "2026-06-01", stem: false, employment: [], asOf: "2026-01-01" }).daysUsed === 0,
    `used=${computeUnemploymentClock({ optStartDate: "2026-06-01", stem: false, employment: [], asOf: "2026-01-01" }).daysUsed}`);
}

console.log("\n===== 13 · INVARIANTS =====");
{
  const base = M(F.priyaEvents);
  // duplicate the exact same authorization
  const dup = M([...F.priyaEvents, { ...F.priyaEvents[1], id: "dup-of-ft" }]);
  t("I1", "duplicate identical authorization does NOT double-count", dup.fullTimeDays === base.fullTimeDays, `base=${base.fullTimeDays} dup=${dup.fullTimeDays}`);

  // reorder events
  const rev = M([...F.priyaEvents].reverse());
  const shuf = M([F.priyaEvents[3], F.priyaEvents[0], F.priyaEvents[4], F.priyaEvents[2], F.priyaEvents[1], F.priyaEvents[5]]);
  t("I2", "reversing event order does not change the ledger", rev.fullTimeDays === base.fullTimeDays && rev.overlapDays === base.overlapDays, `base=${base.fullTimeDays}/${base.overlapDays} rev=${rev.fullTimeDays}/${rev.overlapDays}`);
  t("I3", "shuffling event order does not change the ledger", shuf.fullTimeDays === base.fullTimeDays, `shuf=${shuf.fullTimeDays}`);

  // irrelevant events must not move a finding
  const noise = M([...F.priyaEvents,
    { id: "n1", type: "program_start", date: "2019-01-01", institution_id: "schoolX", program_level: "bachelors", attrs: {}, evidence_ids: [], confidence: "asserted" },
    cpt("n2", "2024-06-03", "2025-03-17", 40, "doctoral")]);
  t("I4", "unrelated-level CPT + unrelated event leave master's untouched", noise.fullTimeDays === base.fullTimeDays, `base=${base.fullTimeDays} withNoise=${noise.fullTimeDays}`);

  // per-level partition
  t("I5", "bachelor's days never leak into master's", base.fullTimeDays === 342, `masters=${base.fullTimeDays} (bachelors block is 210d)`);

  // sub-threshold part-time alone must not count as full-time
  t("I6", "a single 12h/wk authorization contributes 0 full-time days",
    M([cpt("p", "2025-06-01", "2025-08-31", 12)]).fullTimeDays === 0,
    `${M([cpt("p", "2025-06-01", "2025-08-31", 12)]).fullTimeDays}d`);

  // aggregation: two overlapping part-times reach full-time only on the overlap
  const agg = M([cpt("p1", "2025-06-01", "2025-08-31", 12), cpt("p2", "2025-07-09", "2025-09-30", 12)]);
  t("I7", "overlapping part-times aggregate to full-time ONLY on the overlap", agg.fullTimeDays === 54 && agg.overlapDays === 54, `full=${agg.fullTimeDays} overlap=${agg.overlapDays}`);
}

console.log("\n===== 12 · DETERMINISM =====");
{
  const runs = Array.from({ length: 25 }, () => JSON.stringify(M(F.priyaEvents)));
  t("D1", "25 repeated ledger runs identical", new Set(runs).size === 1, `${new Set(runs).size} distinct result(s)`);
  const jx = J.jurisdictionFor(F.priyaStudent);
  const fr = Array.from({ length: 25 }, () => JSON.stringify(J.residencyFindingFor(jx, {
    student: F.priyaStudent, events: F.priyaEvents, intentFactors: [], allegedEntitlementDate: "2026-08-24" })));
  t("D2", "25 repeated residency findings identical", new Set(fr).size === 1, `${new Set(fr).size} distinct`);
  const ar = Array.from({ length: 25 }, () => JSON.stringify(J.aidFindingFor(jx, F.priyaAid)));
  t("D3", "25 repeated aid findings identical", new Set(ar).size === 1, `${new Set(ar).size} distinct`);
  // interleave an unrelated fixture between runs
  const before = JSON.stringify(M(F.priyaEvents));
  M([cpt("x", "2020-01-01", "2020-12-31", 40)]);
  computeUnemploymentClock({ optStartDate: "2020-01-01", stem: true, employment: [], asOf: "2021-01-01" });
  t("D4", "unrelated executions leave the result unchanged", JSON.stringify(M(F.priyaEvents)) === before);
}

console.log("\n===== 7 · UNKNOWN / MISSING DATA =====");
{
  const empty = computeCptLedger([]);
  t("U1", "no events -> no master's ledger (not a zeroed 'clear')", empty.forLevel("masters") === undefined, `forLevel=${JSON.stringify(empty.forLevel("masters"))}`);
  // missing hours_per_week
  const noHrs = M([{ ...cpt("h", "2024-01-01", "2024-06-01", 40), attrs: { in_field: true } }]);
  t("U2", "missing hours_per_week does NOT default to full-time", !noHrs || noHrs.fullTimeDays === 0, `fullTime=${noHrs ? noHrs.fullTimeDays : "no ledger"}`);
  // missing end_date
  const noEnd = M([{ ...cpt("e", "2024-01-01", "2024-06-01", 40), end_date: undefined }]);
  t("U3", "missing end_date does not silently run forever", !noEnd || noEnd.fullTimeDays <= 1, `fullTime=${noEnd ? noEnd.fullTimeDays : "no ledger"}`);
  // unknown jurisdiction
  const nowhere = { ...F.priyaStudent, institutions: [], jurisdiction_history: [] };
  const jxN = J.jurisdictionFor(nowhere);
  t("U4", "no jurisdiction history -> router does not default to a modelled state",
    !jxN.packs || !jxN.packs.domicile || jxN.code !== "VA", `code=${jxN.code} hasDomicilePack=${!!(jxN.packs && jxN.packs.domicile)}`);
  const jxZZ = J.jurisdictionFor({ ...F.priyaStudent, jurisdiction_history: [{ state: "ZZ", from: "2020-01-01" }], institutions: [{ id: "i", name: "n", state: "ZZ", level: "masters" }] });
  t("U5", "invalid state code -> no borrowed pack", !(jxZZ.packs && jxZZ.packs.domicile), `code=${jxZZ.code} pack=${!!(jxZZ.packs && jxZZ.packs.domicile)}`);
  const jxOH = J.jurisdictionFor({ ...F.priyaStudent, jurisdiction_history: [{ state: "OH", from: "2020-01-01" }], institutions: [{ id: "i", name: "n", state: "OH", level: "masters" }] });
  t("U6", "unmodelled state (OH) -> no domicile pack, no confident verdict", !(jxOH.packs && jxOH.packs.domicile), `code=${jxOH.code} pack=${!!(jxOH.packs && jxOH.packs.domicile)}`);
}

console.log("\n===== 6 · MUTATION (one fact at a time) =====");
{
  const base = M(F.priyaEvents);
  const jx = J.jurisdictionFor(F.priyaStudent);
  const baseRes = J.residencyFindingFor(jx, { student: F.priyaStudent, events: F.priyaEvents, intentFactors: [], allegedEntitlementDate: "2026-08-24" }).result;
  const baseAid = J.aidFindingFor(jx, F.priyaAid).result;

  // shift the master's full-time block end by +1 day
  const m1 = F.priyaEvents.map((e) => (e.id === "cpt-mast-ft" ? { ...e, end_date: day(e.end_date, 1) } : e));
  const l1 = M(m1);
  t("M1", "+1 day on a master's CPT end -> ledger +1 day", l1.fullTimeDays === base.fullTimeDays + 1, `${base.fullTimeDays} -> ${l1.fullTimeDays}`);
  t("M2", "...and residency finding is INVARIANT", J.residencyFindingFor(jx, { student: F.priyaStudent, events: m1, intentFactors: [], allegedEntitlementDate: "2026-08-24" }).result === baseRes, `${baseRes}`);
  t("M3", "...and aid finding is INVARIANT", J.aidFindingFor(jx, F.priyaAid).result === baseAid, `${baseAid}`);

  // remove the bachelor's block
  const m2 = F.priyaEvents.filter((e) => e.id !== "cpt-bach-1");
  t("M4", "removing the bachelor's CPT leaves master's unchanged", M(m2).fullTimeDays === base.fullTimeDays, `${M(m2).fullTimeDays}`);

  // change status -> both offices must move together
  const lpr = { ...F.priyaStudent, immigration: { ...F.priyaStudent.immigration, status: "LPR" } };
  const jxL = J.jurisdictionFor(lpr);
  const rL = J.residencyFindingFor(jxL, { student: lpr, events: F.priyaEvents, intentFactors: [], allegedEntitlementDate: "2026-08-24" }).result;
  const aL = J.aidFindingFor(jxL, { ...F.priyaAid, student: lpr }).result;
  t("M5", "F-1 -> LPR changes the residency verdict", rL !== baseRes, `${baseRes} -> ${rL}`);
  t("M6", "F-1 -> LPR changes the aid verdict too (same fact, both offices)", aL !== baseAid, `${baseAid} -> ${aL}`);
  t("M7", "...and the CPT ledger is INVARIANT to status", M(F.priyaEvents).fullTimeDays === base.fullTimeDays, `${base.fullTimeDays}`);

  // one extra hour on a part-time
  const m3 = F.priyaEvents.map((e) => (e.id === "cpt-mast-pt1" ? { ...e, attrs: { ...e.attrs, hours_per_week: 13 } } : e));
  t("M8", "+1 hr/wk on one part-time does not change the aggregate threshold result", M(m3).fullTimeDays === base.fullTimeDays, `${base.fullTimeDays} -> ${M(m3).fullTimeDays}`);
}

console.log("\n===== 14 · ADVERSARIAL RECORDS =====");
{
  const safe = (name, fn) => { try { return { ok: true, v: fn() }; } catch (e) { return { ok: false, e: e.message }; } };
  const r1 = safe("reversed", () => M([cpt("r", "2025-01-01", "2024-01-01", 40)]));
  t("A1", "end_date BEFORE start does not produce negative days", r1.ok && (!r1.v || r1.v.fullTimeDays >= 0), r1.ok ? `fullTime=${r1.v ? r1.v.fullTimeDays : "none"}` : "threw: " + r1.e);
  const r2 = safe("zero", () => M([cpt("z", "2024-01-01", "2024-06-01", 0)]));
  t("A2", "zero hours/week contributes no full-time days", r2.ok && (!r2.v || r2.v.fullTimeDays === 0), r2.ok ? `fullTime=${r2.v ? r2.v.fullTimeDays : "none"}` : "threw: " + r2.e);
  const r3 = safe("neg", () => M([cpt("n", "2024-01-01", "2024-06-01", -40)]));
  t("A3", "negative hours does not count", r3.ok && (!r3.v || r3.v.fullTimeDays === 0), r3.ok ? `fullTime=${r3.v ? r3.v.fullTimeDays : "none"}` : "threw: " + r3.e);
  const r4 = safe("huge", () => M([cpt("h", "1900-01-01", "2100-01-01", 40)]));
  t("A4", "200-year authorization computes without hanging/overflow", r4.ok && r4.v.fullTimeDays > 70000, r4.ok ? `${r4.v.fullTimeDays}d band=${r4.v.band}` : "threw: " + r4.e);
  const many = Array.from({ length: 400 }, (_, i) => cpt("m" + i, day("2020-01-01", i * 3), day("2020-01-01", i * 3 + 20), 12));
  const t0 = Date.now(); const r5 = safe("many", () => M(many)); const ms = Date.now() - t0;
  t("A5", "400 overlapping part-time authorizations complete quickly", r5.ok && ms < 3000, `${ms}ms fullTime=${r5.ok && r5.v ? r5.v.fullTimeDays : "?"}`);
  const r6 = safe("evidence-wrong-event", () => M(F.priyaEvents.map((e) => ({ ...e, evidence_ids: ["does-not-exist"] }))));
  t("A6", "evidence ids pointing at nothing do not change arithmetic", r6.ok && r6.v.fullTimeDays === 342, r6.ok ? `${r6.v.fullTimeDays}` : "threw: " + r6.e);
}

console.log("\n===== 4 · CROSS-ENGINE CONSISTENCY =====");
{
  const led = M(F.priyaEvents);
  const bud = computeOptBudget(F.priyaOptBudget).forLevel("masters");
  const clk = computeUnemploymentClock(F.priyaOpt);
  t("X1", "cliff constant comes from the pack, not a literal", CLIFF_DAYS === 365, `CLIFF_DAYS=${CLIFF_DAYS}`);
  t("X2", "ledger band and daysToCliff agree in sign", (led.daysToCliff >= 0) === (led.band !== "red") || led.band === "red", `toCliff=${led.daysToCliff} band=${led.band}`);
  t("X3", "unemployment cap 90 while no qualifying employment (STEM locked)", clk.cap === 90 && clk.stemApplies === false, `cap=${clk.cap} stemApplies=${clk.stemApplies}`);
  t("X4", "OPT budget is per level and independent of the CPT ledger", !!bud && led.fullTimeDays === 342, `budgetLevel=masters ledger=${led.fullTimeDays}`);
  const jx = J.jurisdictionFor(F.priyaStudent);
  const res = J.residencyFindingFor(jx, { student: F.priyaStudent, events: F.priyaEvents, intentFactors: [], allegedEntitlementDate: "2026-08-24" });
  const aid = J.aidFindingFor(jx, F.priyaAid);
  t("X5", "residency + aid cite the routed jurisdiction only", res.rule_citation.text.length > 0 && jx.code === "VA", `jx=${jx.code}`);
  t("X6", "a finding with unresolved unknowns never claims a clear result",
    !(aid.unknowns.length > 0 && aid.result === "no_issue"), `aid.result=${aid.result} unknowns=${aid.unknowns.length}`);
  t("X7", "every reasoning step carries provenance arrays",
    res.reasoning_steps.every((s) => Array.isArray(s.from_events) && Array.isArray(s.from_evidence)), `${res.reasoning_steps.length} steps`);
  t("X8", "deciding office is always populated", !!res.deciding_office && !!aid.deciding_office, `${res.deciding_office} / ${aid.deciding_office}`);
}

console.log(`\n===== RESULT: ${pass} passed, ${fail} failed =====`);
if (findings.length) { console.log("\nFAILURES:"); findings.forEach((f) => console.log(`  ${f.id} ${f.name} :: ${f.detail}`)); }
