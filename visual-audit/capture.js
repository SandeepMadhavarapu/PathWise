/**
 * PathWise — final adversarial release audit. Capture + telemetry.
 * Runs against the SERVED PRODUCTION APPLICATION. Nothing here reads project source.
 *
 *   node visual-audit/capture.js
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROD = process.env.PROD || "https://path-wise-amber.vercel.app";
const ROOT = __dirname;
const SHOTS = path.join(ROOT, "screenshots");
fs.mkdirSync(SHOTS, { recursive: true });

const ROUTES = ["/", "/check", "/coverage", "/moment", "/student", "/student/changed",
  "/student/finding/aid", "/student/finding/domicile", "/student/finding/residency",
  "/student/journey", "/student/next", "/this-route-does-not-exist"];

const VIEWPORTS = [
  ["1440x900", 1440, 900], ["1280x720", 1280, 720], ["1512x764", 1512, 764],
  ["834x1112", 834, 1112], ["390x844", 390, 844],
];

const SWEEP = [320, 360, 390, 430, 480, 600, 768, 834, 900, 1024, 1280, 1440, 1512, 1920];

const slug = (r) => (r === "/" ? "root" : r.replace(/^\//, "").replace(/\//g, "-"));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
const sweepFindings = [];

/** Everything we can measure about one rendered state. */
async function telemetry(p) {
  return p.evaluate(() => {
    const de = document.documentElement;
    const overflow = de.scrollWidth - de.clientWidth;

    // text clipped by an overflow:hidden ancestor
    const clipped = [];
    for (const el of document.querySelectorAll("h1,h2,h3,p,span,a,button,li,td,div")) {
      const cs = getComputedStyle(el);
      if (cs.overflow !== "hidden" && cs.overflowX !== "hidden") continue;
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && (el.textContent || "").trim())
        clipped.push((el.className || el.tagName) + " :: " + (el.textContent || "").trim().slice(0, 40));
      if (clipped.length > 6) break;
    }

    // fixed elements covering page content
    const overlaps = [];
    for (const el of document.querySelectorAll("*")) {
      if (getComputedStyle(el).position !== "fixed") continue;
      const b = el.getBoundingClientRect();
      if (b.width < 8 || b.height < 8) continue;
      if (getComputedStyle(el).visibility === "hidden" || getComputedStyle(el).opacity === "0") continue;
      const foot = document.querySelector(".foot, .landing-footer, footer");
      if (foot) {
        const f = foot.getBoundingClientRect();
        const ov = Math.max(0, Math.min(f.bottom, b.bottom) - Math.max(f.top, b.top));
        if (ov > 2 && f.width > 0) overlaps.push(`${el.className || el.tagName} covers footer by ${Math.round(ov)}px`);
      }
    }

    // anything sticking out horizontally
    const outside = [];
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.right > de.clientWidth + 2 || b.left < -2) {
        outside.push((el.className || el.tagName) + " " + Math.round(b.left) + ".." + Math.round(b.right));
        if (outside.length > 4) break;
      }
    }

    return {
      overflow,
      docH: document.body.scrollHeight,
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
      images: document.images.length,
      clipped, overlaps, outside,
      storage: localStorage.length + sessionStorage.length + document.cookie.length,
      title: document.title,
      h1: document.querySelectorAll("h1").length,
      landmarks: ["main", "header", "footer", "nav", "aside"].filter((t) => document.querySelector(t)).length,
    };
  });
}

async function shoot(browser, route, vpName, w, h, state, act) {
  const p = await browser.newPage();
  const errors = [], warnings = [], failed = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning") warnings.push(m.text());
  });
  p.on("requestfailed", (q) => failed.push(q.url().slice(0, 90) + " :: " + ((q.failure() || {}).errorText || "?")));
  await p.setViewport({ width: w, height: h, isMobile: w < 500, hasTouch: w < 500 });
  const res = await p.goto(PROD + route, { waitUntil: "networkidle0" });
  await wait(1200);
  if (act) { try { await act(p); } catch (e) { errors.push("ACTION: " + e.message); } await wait(1100); }
  const t = await telemetry(p);
  const file = `${slug(route)}-${vpName}-${state}.png`;
  await p.screenshot({ path: path.join(SHOTS, file) });
  rows.push({
    route, url: PROD + route, viewport: vpName, state, file,
    ts: new Date().toISOString(), http: res.status(),
    errors: errors.length, warnings: warnings.length, failed: failed.length,
    overflow: t.overflow > 1 ? t.overflow + "px" : "0",
    clipping: t.clipped.length, overlap: t.overlaps.length, outside: t.outside.length,
    broken: t.broken, storage: t.storage, docH: t.docH, title: t.title,
    h1: t.h1, landmarks: t.landmarks,
    detail: [...t.clipped, ...t.overlaps, ...t.outside, ...errors.slice(0, 2), ...failed.slice(0, 2)].join(" ¦ ").slice(0, 300),
  });
  await p.close();
  return t;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  console.log("TARGET: " + PROD + "\n");

  // ---------- PHASE 2: every route at every required viewport ----------
  console.log("PHASE 2 — base capture");
  for (const [vn, w, h] of VIEWPORTS) {
    for (const r of ROUTES) await shoot(browser, r, vn, w, h, "initial");
    console.log(`  ${vn}: ${ROUTES.length} routes`);
  }

  // ---------- PHASE 3: interaction states (1440x900) ----------
  console.log("PHASE 3 — interaction states");
  const D = ["1440x900", 1440, 900];
  const S = async (route, state, act) => {
    await shoot(browser, route, D[0], D[1], D[2], state, act);
    console.log(`  ${route} :: ${state}`);
  };
  const click = (sel) => async (p) => { await p.click(sel); };
  const clickText = (re) => async (p) => {
    await p.evaluate((r) => {
      const el = [...document.querySelectorAll("button,a")].find((e) => new RegExp(r, "i").test(e.textContent || ""));
      if (!el) throw new Error("no control matching " + r); el.click();
    }, re);
  };

  await S("/student/changed", "sample-document-read", clickText("Use a sample document"));
  await S("/student/changed", "attested", async (p) => {
    await clickText("Use a sample document")(p); await wait(900);
    await p.click(".wc-ev-check input");
  });
  await S("/student/changed", "committed-collapsed", async (p) => {
    await clickText("Use a sample document")(p); await wait(900);
    await p.click(".wc-ev-check input"); await wait(300);
    await clickText("Add to my record")(p);
  });
  await S("/moment", "post-reveal", clickText("I got a job"));
  await S("/coverage", "tile-expanded", click(".cov-tile-head"));
  await S("/coverage", "packviewer-tab-switched", async (p) => {
    const tabs = await p.$$(".rp-tab"); if (tabs[1]) await tabs[1].click();
    await p.evaluate(() => document.querySelector(".rp-panel").scrollIntoView({ block: "start" }));
  });
  await S("/check", "submitted-result", async (p) => {
    await p.click(".check-form button[type=submit], .check-form .btn");
    await wait(1200);
    await p.evaluate(() => { const e = document.querySelector(".hero"); if (e) e.scrollIntoView({ block: "start" }); });
  });
  await S("/check", "cleared", async (p) => {
    await p.click(".check-form button[type=submit], .check-form .btn"); await wait(1000);
    await clickText("Clear workspace")(p);
  });
  for (const f of ["aid", "domicile", "residency"])
    await S(`/student/finding/${f}`, "disclosures-expanded",
      async (p) => { await p.evaluate(() => document.querySelectorAll(".rtree-toggle").forEach((t) => t.click())); });
  await S("/student/journey", "row-expanded", async (p) => {
    const b = await p.$(".jrow, .jt-row, button"); if (b) await b.click();
  });
  await S("/", "skip-link-focused", async (p) => { await p.keyboard.press("Tab"); await wait(450); });
  await S("/student", "cta-hover", async (p) => { await p.hover(".cta"); });

  // reduced motion + no-JS
  {
    const p = await browser.newPage();
    await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(PROD + "/student/changed", { waitUntil: "networkidle0" }); await wait(1300);
    await p.screenshot({ path: path.join(SHOTS, "student-changed-1440x900-reduced-motion.png") });
    const t = await telemetry(p);
    rows.push({ route: "/student/changed", url: PROD + "/student/changed", viewport: "1440x900",
      state: "reduced-motion", file: "student-changed-1440x900-reduced-motion.png",
      ts: new Date().toISOString(), http: 200, errors: 0, warnings: 0, failed: 0,
      overflow: t.overflow > 1 ? t.overflow + "px" : "0", clipping: t.clipped.length,
      overlap: t.overlaps.length, outside: t.outside.length, broken: t.broken, storage: t.storage,
      docH: t.docH, title: t.title, h1: t.h1, landmarks: t.landmarks, detail: "prefers-reduced-motion: reduce" });
    console.log("  /student/changed :: reduced-motion");
    await p.close();
  }
  {
    const p = await browser.newPage();
    await p.setJavaScriptEnabled(false);
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(PROD + "/", { waitUntil: "networkidle0" }); await wait(900);
    await p.screenshot({ path: path.join(SHOTS, "root-1440x900-no-js.png") });
    const t = await telemetry(p);
    rows.push({ route: "/", url: PROD + "/", viewport: "1440x900", state: "no-js",
      file: "root-1440x900-no-js.png", ts: new Date().toISOString(), http: 200,
      errors: 0, warnings: 0, failed: 0, overflow: t.overflow > 1 ? t.overflow + "px" : "0",
      clipping: t.clipped.length, overlap: t.overlaps.length, outside: t.outside.length,
      broken: t.broken, storage: t.storage, docH: t.docH, title: t.title, h1: t.h1,
      landmarks: t.landmarks, detail: "JavaScript disabled" });
    console.log("  / :: no-js");
    await p.close();
  }

  // ---------- PHASE 5: responsive sweep ----------
  console.log("PHASE 5 — responsive sweep, 14 widths");
  {
    const p = await browser.newPage();
    for (const w of SWEEP) {
      await p.setViewport({ width: w, height: 900 });
      for (const r of ROUTES.slice(0, 11)) {
        await p.goto(PROD + r, { waitUntil: "networkidle0" }); await wait(420);
        const t = await telemetry(p);
        if (t.overflow > 1) sweepFindings.push(`${w}px ${r} overflow ${t.overflow}px`);
        if (t.outside.length) sweepFindings.push(`${w}px ${r} outside: ${t.outside[0]}`);
        if (t.overlaps.length) sweepFindings.push(`${w}px ${r} overlap: ${t.overlaps[0]}`);
        if (t.clipped.length) sweepFindings.push(`${w}px ${r} clipped: ${t.clipped[0]}`);
      }
      process.stdout.write(` ${w}`);
    }
    console.log("");
    await p.close();
  }

  fs.writeFileSync(path.join(ROOT, "telemetry.json"),
    JSON.stringify({ target: PROD, capturedAt: new Date().toISOString(), rows, sweepFindings }, null, 2));
  console.log(`\nDONE  ${rows.length} states captured, ${fs.readdirSync(SHOTS).length} PNGs`);
  console.log("sweep findings: " + (sweepFindings.length ? "\n  " + sweepFindings.join("\n  ") : "none across 14 widths x 11 routes"));
  await browser.close();
})();
