/* Story-audit capture. Investigation only. */
const puppeteer = require("puppeteer-core");
const fs = require("fs"); const path = require("path");
const P = "https://path-wise-amber.vercel.app";
const OUT = path.join(__dirname, "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--no-sandbox"] });

  const cap = async (name, route, vp, act, scrollTo) => {
    const p = await b.newPage();
    await p.setViewport({ width: vp[0], height: vp[1], isMobile: vp[0] < 500, hasTouch: vp[0] < 500 });
    await p.goto(P + route, { waitUntil: "networkidle0" }); await w(1300);
    if (act) { try { await act(p); } catch (e) { console.log("   act failed: " + e.message); } await w(1300); }
    if (scrollTo) { await p.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: "start" }); }, scrollTo); await w(700); }
    const file = `${name}-${vp[0]}x${vp[1]}.png`;
    await p.screenshot({ path: path.join(OUT, file) });
    const above = await p.evaluate((h) => {
      const t = document.body.innerText.split("\n").map((s) => s.trim()).filter(Boolean);
      const vis = [...document.querySelectorAll("h1,h2,h3,.landing-line,.landing-lede,.eyebrow,.section-head,.cta-k,.hero-fact-v")]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.top < h && r.height > 0; })
        .map((e) => e.innerText.replace(/\s+/g, " ").trim().slice(0, 90));
      return { firstLines: t.slice(0, 6), headingsAboveFold: vis.slice(0, 8) };
    }, vp[1]);
    log.push({ name, route, viewport: vp.join("x"), file, ...above });
    console.log(`  ${file}`);
    await p.close();
  };

  const clickTxt = (re) => (p) => p.evaluate((r) => {
    const el = [...document.querySelectorAll("button,a")].find((e) => new RegExp(r, "i").test(e.textContent || ""));
    if (!el) throw new Error("no control " + r); el.click();
  }, re);

  const D = [1440, 900], D2 = [1280, 720], M = [390, 844];

  console.log("DESKTOP 1440x900");
  await cap("01-landing-initial", "/", D);
  await cap("02-landing-refusal", "/", D, null, ".ub");
  await cap("03-student-situation", "/student", D);
  await cap("04-student-ledger", "/student", D, null, ".cta");
  await cap("05-finding-residency", "/student/finding/residency", D);
  await cap("06-finding-reasoning-expanded", "/student/finding/residency", D,
    (p) => p.evaluate(() => document.querySelectorAll(".rtree-toggle").forEach((t) => t.click())));
  await cap("07-finding-aid-unknowns", "/student/finding/aid", D, null, ".unknowns");
  await cap("08-changed-refusal", "/student/changed", D);
  await cap("09-changed-collapsed", "/student/changed", D, async (p) => {
    await clickTxt("Use a sample document")(p); await w(1000);
    await p.click(".wc-ev-check input"); await w(300);
    await clickTxt("Add to my record")(p);
  }, ".ub");
  await cap("10-crossengine-moment", "/moment", D, clickTxt("I got a job"));
  await cap("11-check-result", "/check", D, async (p) => {
    await p.evaluate(() => document.querySelector(".check-form button[type=submit], .check-form .btn").click());
  }, ".hero");
  await cap("12-coverage", "/coverage", D);
  await cap("13-student-next", "/student/next", D);

  console.log("DESKTOP 1280x720 (fold test)");
  await cap("01-landing-initial", "/", D2);
  await cap("03-student-situation", "/student", D2);

  console.log("PHONE 390x844");
  await cap("01-landing-initial", "/", M);
  await cap("03-student-situation", "/student", M);
  await cap("05-finding-residency", "/student/finding/residency", M);
  await cap("08-changed-refusal", "/student/changed", M);
  await cap("10-crossengine-moment", "/moment", M, clickTxt("I got a job"));

  fs.writeFileSync(path.join(__dirname, "story-evidence.json"), JSON.stringify({ target: P, at: new Date().toISOString(), log }, null, 2));
  console.log(`\n${log.length} states captured`);
  await b.close();
})();
