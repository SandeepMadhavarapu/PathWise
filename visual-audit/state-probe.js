/**
 * STATE / PERSISTENCE audit — against the SERVED production application.
 * Investigation only: reads and screenshots, changes nothing.
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const P = "https://path-wise-amber.vercel.app";
const OUT = path.join(__dirname, "temporal-state");
fs.mkdirSync(OUT, { recursive: true });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const rec = (o) => { log.push(o); console.log("  " + JSON.stringify(o)); };

const storage = (p) => p.evaluate(() => ({
  ls: localStorage.length, ss: sessionStorage.length,
  cookie: document.cookie.length, hash: location.hash, search: location.search,
  histLen: history.length,
}));

const checkState = (p) => p.evaluate(() => ({
  status: document.querySelector("#status")?.value ?? null,
  state: document.querySelector("#state")?.value ?? null,
  presence: document.querySelector('input[type="date"]')?.value ?? null,
  cptRows: document.querySelectorAll(".field-row .field input[type=date]").length,
  firstStart: document.querySelectorAll('input[type="date"]')[1]?.value ?? null,
  hours: document.querySelector('input[type="number"]')?.value ?? null,
  hasResult: !!document.querySelector(".hero"),
  resultText: document.querySelector(".hero-fact-v")?.innerText?.trim() ?? null,
}));

const changedState = (p) => p.evaluate(() => ({
  bandVerdict: document.querySelector(".ub")?.innerText?.split("\n")[0]?.trim() ?? null,
  settled: document.querySelector(".ub")?.className.includes("ub--settled") ?? null,
  evidenceRead: !!document.querySelector(".wc-ev-facts, .wc-ev-attest"),
  committed: !!document.querySelector(".wc-changes"),
  sampleBtn: !!Array.from(document.querySelectorAll("button")).find(b => /sample document/i.test(b.textContent)),
}));

const shot = async (p, n) => { await p.screenshot({ path: path.join(OUT, n + ".png") }); return n + ".png"; };

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });

  // ============ /check lifecycle ============
  console.log("=== /check ===");
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900 });

  // A. fresh visit
  await p.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1200);
  rec({ step: "A fresh visit", ...(await checkState(p)), ...(await storage(p)), shot: await shot(p, "check-01-fresh") });

  // B. enter information
  await p.select("#status", "J1");
  await p.select("#state", "TN");
  await p.evaluate(() => {
    const set = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      s.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const dates = document.querySelectorAll('input[type="date"]');
    set(dates[0], "2021-09-01");            // presence since
    set(dates[1], "2024-06-03");            // cpt start
    set(dates[2], "2025-03-17");            // cpt end
    const n = document.querySelector('input[type="number"]'); if (n) set(n, "40");
  });
  await w(700);
  rec({ step: "B entered info", ...(await checkState(p)), ...(await storage(p)), shot: await shot(p, "check-02-entered") });

  // submit -> result
  await p.evaluate(() => document.querySelector(".check-form button[type=submit], .check-form .btn").click());
  await w(1400);
  rec({ step: "B2 submitted", ...(await checkState(p)), ...(await storage(p)), shot: await shot(p, "check-03-result") });

  // C+D. navigate away and back
  await p.goto(P + "/student", { waitUntil: "networkidle0" }); await w(900);
  await p.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1200);
  rec({ step: "C+D navigate away and back", ...(await checkState(p)), ...(await storage(p)), shot: await shot(p, "check-04-after-nav-return") });

  // re-enter, then browser BACK button
  await p.select("#status", "J1");
  await w(400);
  await p.goto(P + "/student", { waitUntil: "networkidle0" }); await w(800);
  await p.goBack({ waitUntil: "networkidle0" }); await w(1200);
  rec({ step: "D2 browser Back button", ...(await checkState(p)), ...(await storage(p)), shot: await shot(p, "check-05-browser-back") });

  // E. refresh
  await p.select("#status", "M1"); await w(400);
  await p.reload({ waitUntil: "networkidle0" }); await w(1200);
  rec({ step: "E refresh", ...(await checkState(p)), ...(await storage(p)), shot: await shot(p, "check-06-refresh") });

  // F. same URL in a NEW TAB
  await p.select("#status", "LPR"); await w(400);
  const p2 = await b.newPage(); await p2.setViewport({ width: 1440, height: 900 });
  await p2.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1100);
  rec({ step: "F new tab, same URL", ...(await checkState(p2)), ...(await storage(p2)), shot: await shot(p2, "check-07-new-tab") });
  await p2.close();

  // G. close and reopen the tab
  await p.close();
  const p3 = await b.newPage(); await p3.setViewport({ width: 1440, height: 900 });
  await p3.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1100);
  rec({ step: "G reopened tab", ...(await checkState(p3)), ...(await storage(p3)), shot: await shot(p3, "check-08-reopened-tab") });

  // ============ /student/changed lifecycle ============
  console.log("=== /student/changed ===");
  await p3.goto(P + "/student/changed", { waitUntil: "networkidle0" }); await w(1400);
  rec({ step: "I0 pre-document", ...(await changedState(p3)), ...(await storage(p3)), shot: await shot(p3, "changed-01-pre-document") });

  const clickTxt = (re) => p3.evaluate((r) => {
    const el = [...document.querySelectorAll("button,a")].find((e) => new RegExp(r, "i").test(e.textContent || ""));
    if (!el) throw new Error("no control " + r); el.click();
  }, re);

  await clickTxt("Use a sample document"); await w(1300);
  rec({ step: "I1 sample read", ...(await changedState(p3)), ...(await storage(p3)), shot: await shot(p3, "changed-02-document-read") });

  await p3.click(".wc-ev-check input"); await w(500);
  await clickTxt("Add to my record"); await w(1600);
  rec({ step: "J document committed", ...(await changedState(p3)), ...(await storage(p3)), shot: await shot(p3, "changed-03-committed") });

  // K. refresh after document-derived state exists
  await p3.reload({ waitUntil: "networkidle0" }); await w(1500);
  rec({ step: "K refresh after commit", ...(await changedState(p3)), ...(await storage(p3)), shot: await shot(p3, "changed-04-after-refresh") });

  // navigate away and back
  await p3.goto(P + "/student", { waitUntil: "networkidle0" }); await w(800);
  await p3.goto(P + "/student/changed", { waitUntil: "networkidle0" }); await w(1400);
  rec({ step: "K2 nav away and back", ...(await changedState(p3)), ...(await storage(p3)), shot: await shot(p3, "changed-05-after-nav") });

  // ============ is any warning shown before loss? ============
  console.log("=== loss warning ===");
  const warn = await p3.evaluate(() => {
    const t = document.body.innerText;
    return {
      hasBeforeUnload: typeof window.onbeforeunload === "function",
      mentionsNotSaved: /nothing is saved|not saved|clears everything|no history to come back/i.test(t),
    };
  });
  await p3.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1100);
  const warnCheck = await p3.evaluate(() => {
    const t = document.body.innerText;
    const m = t.match(/Nothing you type leaves your device[\s\S]{0,340}/);
    return { hasBeforeUnload: typeof window.onbeforeunload === "function",
      promiseText: m ? m[0].replace(/\s+/g, " ").slice(0, 330) : null };
  });
  rec({ step: "loss warning /student/changed", ...warn });
  rec({ step: "loss warning /check", ...warnCheck });

  fs.writeFileSync(path.join(__dirname, "state-evidence.json"),
    JSON.stringify({ target: P, at: new Date().toISOString(), log }, null, 2));
  console.log("\nscreenshots -> visual-audit/temporal-state/");
  await b.close();
})();
