/** A-1 verification. Runs against whatever BASE is given (local build, then production). */
const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3210";
const TAG = process.env.TAG || "local";
const OUT = path.join(__dirname, "temporal-state");
fs.mkdirSync(OUT, { recursive: true });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const chk = (name, ok, detail) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? "  :: " + detail : ""}`);
  if (!ok) fails.push(name);
};

const fields = (p) => p.evaluate(() => ({
  status: document.querySelector("#status").value,
  state: document.querySelector("#state").value,
  presence: document.querySelectorAll('input[type=date]')[0].value,
  cptStart: document.querySelectorAll('input[type=date]')[1].value,
  hours: document.querySelector('input[type=number]')?.value ?? "",
}));
const store = (p) => p.evaluate(() => ({
  ls: localStorage.length, ss: sessionStorage.length, ck: document.cookie.length,
}));
const promise = (p) => p.evaluate(() =>
  document.querySelector(".check-lifetime")?.innerText.replace(/\s+/g, " ").trim() ?? null);

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  console.log(`\n=== A-1 VERIFICATION · ${TAG} · ${BASE} ===`);

  // --- 2. the false claim is gone; 3. real claims intact ---
  await p.goto(BASE + "/check", { waitUntil: "networkidle0" }); await w(1300);
  const txt = await promise(p);
  console.log("\n  PROMISE TEXT NOW:\n  \"" + txt + "\"\n");
  chk("2 false claim removed: no 'going back ... clears'", !/going back[^.]*clear/i.test(txt));
  chk("2 false claim removed: no 'no history to come back to'", !/no history to come back/i.test(txt));
  chk("3 keeps: nothing leaves this device", /Nothing you type leaves your device/i.test(txt));
  chk("3 keeps: no account, no server, no request", /no account, no server and no request/i.test(txt));
  chk("3 keeps: nothing written to disk / no cookie", /written to disk/i.test(txt) && /no cookie/i.test(txt));
  chk("3 keeps: refresh or close clears", /Refreshing or closing the tab clears/i.test(txt));
  chk("3 keeps: shared/public computer", /shared or public computer/i.test(txt));
  chk("3 adds: names the Back-button exception honestly", /press Back/i.test(txt) && /goes when the tab does/i.test(txt));
  await p.screenshot({ path: path.join(OUT, `a1-${TAG}-01-promise.png`) });

  // --- 1 + 6. reproduce the original A-1 scenario ---
  await p.select("#status", "J1"); await p.select("#state", "TN");
  await p.evaluate(() => {
    const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const set = (e, v) => { s.call(e, v); e.dispatchEvent(new Event("input", { bubbles: true })); };
    const d = document.querySelectorAll('input[type="date"]');
    set(d[0], "2021-09-01"); set(d[1], "2024-06-03");
    const n = document.querySelector('input[type="number"]'); if (n) set(n, "40");
  });
  await w(700);
  const entered = await fields(p);
  await p.goto(BASE + "/student", { waitUntil: "networkidle0" }); await w(900);
  await p.goBack({ waitUntil: "networkidle0" }); await w(1600);
  const back = await fields(p);
  const restored = Object.keys(entered).filter((k) => entered[k] && entered[k] === back[k]);
  console.log("");
  chk("1+6 Back still behaves normally (bfcache unchanged)", restored.length === 5,
    `restored ${restored.length}/5 fields — behaviour deliberately NOT changed`);
  chk("6 the page no longer contradicts what Back does", !/going back[^.]*clear/i.test(await promise(p)));
  await p.screenshot({ path: path.join(OUT, `a1-${TAG}-02-back-button.png`) });

  // --- 4. storage still zero ---
  const st = await store(p);
  chk("4 localStorage = 0", st.ls === 0, String(st.ls));
  chk("4 sessionStorage = 0", st.ss === 0, String(st.ss));
  chk("4 cookies = 0", st.ck === 0, String(st.ck));

  // --- 5. refresh / new tab / reopen still reset ---
  await p.reload({ waitUntil: "networkidle0" }); await w(1300);
  const afterReload = await fields(p);
  chk("5 refresh resets", afterReload.status === "F1" && afterReload.state === "VA" && !afterReload.presence,
    JSON.stringify(afterReload));
  await p.select("#status", "LPR"); await w(400);
  const p2 = await b.newPage(); await p2.setViewport({ width: 1440, height: 900 });
  await p2.goto(BASE + "/check", { waitUntil: "networkidle0" }); await w(1200);
  const nt = await fields(p2);
  chk("5 new tab resets", nt.status === "F1" && nt.state === "VA", JSON.stringify(nt));
  await p2.close(); await p.close();
  const p3 = await b.newPage(); await p3.setViewport({ width: 1440, height: 900 });
  await p3.goto(BASE + "/check", { waitUntil: "networkidle0" }); await w(1200);
  const ro = await fields(p3);
  chk("5 reopened tab resets", ro.status === "F1" && ro.state === "VA", JSON.stringify(ro));

  // --- 7. no application behaviour changed: form still computes ---
  await p3.evaluate(() => document.querySelector(".check-form button[type=submit], .check-form .btn").click());
  await w(1700);
  const res = await p3.evaluate(() => ({
    hero: !!document.querySelector(".hero"),
    cards: document.querySelectorAll(".domain-card").length,
    live: document.querySelector("[aria-live]")?.textContent.trim().slice(0, 90),
  }));
  chk("7 /check still computes a finding", res.hero === true && res.cards === 3, JSON.stringify(res));
  await p3.screenshot({ path: path.join(OUT, `a1-${TAG}-03-still-computes.png`) });

  // clear workspace still works
  await p3.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((e) => /Clear workspace/i.test(e.textContent));
    if (el) el.click();
  });
  await w(900);
  const cleared = await fields(p3);
  chk("7 Clear workspace still resets", cleared.status === "F1" && cleared.state === "VA", JSON.stringify(cleared));

  // overflow + errors on /check
  const ov = await p3.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  chk("7 no horizontal overflow on /check", ov <= 1, ov + "px");
  chk("7 no console errors", errs.length === 0, errs.join(" | ") || "none");

  console.log("\n" + (fails.length ? `  ${fails.length} FAILURE(S): ${fails.join(", ")}` : "  ALL A-1 CHECKS PASSED"));
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
