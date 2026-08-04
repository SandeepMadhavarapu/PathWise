const puppeteer = require("puppeteer-core");
const path = require("path");
const P = "https://path-wise-amber.vercel.app";
const OUT = path.join(__dirname, "temporal-state");
const w = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });

  console.log("=== 1. BACK-BUTTON restoration: which fields survive? ===");
  await p.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1200);
  await p.select("#status", "J1"); await p.select("#state", "TN");
  await p.evaluate(() => {
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const set = (e, v) => { s.call(e, v); e.dispatchEvent(new Event("input", { bubbles: true })); };
    const d = document.querySelectorAll('input[type="date"]');
    set(d[0], "2021-09-01"); set(d[1], "2024-06-03");
    const n = document.querySelector('input[type="number"]'); if (n) set(n, "40");
  });
  await w(600);
  const grab = () => p.evaluate(() => ({
    status: document.querySelector("#status").value, state: document.querySelector("#state").value,
    presence: document.querySelectorAll('input[type=date]')[0].value,
    cptStart: document.querySelectorAll('input[type=date]')[1].value,
    hours: document.querySelector('input[type=number]')?.value,
    ls: localStorage.length, ss: sessionStorage.length, ck: document.cookie.length,
  }));
  const before = await grab();
  console.log("  entered   :", JSON.stringify(before));
  await p.goto(P + "/student", { waitUntil: "networkidle0" }); await w(900);
  await p.goBack({ waitUntil: "networkidle0" }); await w(1600);
  const after = await grab();
  console.log("  after Back:", JSON.stringify(after));
  const keys = ["status", "state", "presence", "cptStart", "hours"];
  const survived = keys.filter((k) => before[k] && before[k] === after[k]);
  console.log("  SURVIVED Back:", survived.length ? survived.join(", ") : "nothing");
  await p.screenshot({ path: path.join(OUT, "check-09-back-button-detail.png") });

  console.log("\n=== 2. privacy text actually on /student/changed ===");
  await p.goto(P + "/student/changed", { waitUntil: "networkidle0" }); await w(1400);
  console.log(JSON.stringify(await p.evaluate(() => {
    const t = document.body.innerText;
    const g = (re) => { const m = t.match(re); return m ? m[0].replace(/\s+/g, " ").slice(0, 200) : null; };
    return {
      uploaded: g(/[^.]*uploaded[^.]*\./i),
      readInTab: g(/[^.]*read in (this |the )?tab[^.]*\./i),
      neverLeaves: g(/[^.]*leaves? (this |your )?device[^.]*\./i),
      footer: document.querySelector(".foot")?.innerText.replace(/\s+/g, " ").slice(0, 170),
      topbar: document.querySelector(".topbar-privacy")?.innerText,
    };
  }), null, 1));

  console.log("\n=== 3. did /check render a result for J-1 / Tennessee? ===");
  await p.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1200);
  await p.select("#status", "J1"); await p.select("#state", "TN"); await w(400);
  await p.evaluate(() => document.querySelector(".check-form button[type=submit], .check-form .btn").click());
  await w(1700);
  console.log("  " + JSON.stringify(await p.evaluate(() => ({
    hero: !!document.querySelector(".hero"),
    cards: document.querySelectorAll(".domain-card").length,
    live: document.querySelector("[aria-live]")?.textContent.trim().slice(0, 160),
  }))));
  await p.evaluate(() => { const e = document.querySelector(".domain-cards"); if (e) e.scrollIntoView({ block: "center" }); });
  await w(700); await p.screenshot({ path: path.join(OUT, "check-10-j1-tennessee-result.png") });

  await p.goto(P + "/check", { waitUntil: "networkidle0" }); await w(1200);
  await p.evaluate(() => document.querySelector(".check-form button[type=submit], .check-form .btn").click());
  await w(1700);
  console.log("  VA/F-1 default: " + JSON.stringify(await p.evaluate(() => ({
    hero: !!document.querySelector(".hero"), cards: document.querySelectorAll(".domain-card").length,
  }))));
  await p.evaluate(() => { const e = document.querySelector(".hero"); if (e) e.scrollIntoView({ block: "start" }); });
  await w(700); await p.screenshot({ path: path.join(OUT, "check-11-va-f1-result.png") });
  await b.close();
})();
