import Link from "next/link";
// The coverage claim in the strip below is a count out of rulepacks/coverage.json, not a boast typed
// into a link label — the same file the /coverage map is drawn from.
import { STATE_COUNT } from "@/lib/coverage";
import { MODELLED_COUNT, MODELLED_NAMES, SOURCED_ONLY_COUNT } from "@/lib/jurisdiction-coverage";
import { Callout } from "@/components/Callout";
import { SystemsHero } from "@/components/SystemsHero";

// What PathWise does with an answer, stated as the five things every finding on every screen
// actually carries. This is the differentiator, and it is checkable: open any finding and all five
// are there. Kept as data so the landing lists exactly as many as the product delivers.
const GUARANTEES: { k: string; v: string }[] = [
  { k: "What was decided", v: "a verdict, in one line, in plain words" },
  { k: "Why", v: "the reasoning chain that produced it, step by step" },
  { k: "Who decides", v: "the office that actually rules on it — never PathWise" },
  { k: "On what authority", v: "the regulation quoted, linked, and dated when it was verified" },
  { k: "What is still unknown", v: "named as an open question instead of guessed at" },
];

export default function Landing() {
  return (
    // header / main / footer, where there used to be one <main> wrapping everything. The landing
    // was the only screen in the product with no landmark structure at all — a screen-reader user
    // could not skip the pitch to reach the actions, because there was nothing to skip TO.
    <div className="bare-page">
      <div className="bare-page-inner">
        <header className="landing-brand">
          <span className="logo">
            Path<span className="dot">Wise</span>
          </span>
        </header>

        <main>
          <section className="landing surface">
            <div className="landing-eyebrow">One student · three systems</div>
            <h1 className="landing-line">
              Three offices decide your fate. None of them can see the whole you. PathWise does.
            </h1>
            <p className="landing-lede">
              An international student&apos;s immigration status, tuition residency and financial aid
              are decided by three offices that never talk to each other. PathWise is one reasoning
              engine over one record, so it catches what falls between them.
            </p>

            {/* The landing shows Priya's real findings and, until now, said nothing about whose they
                were. Every other screen that renders her carries a "Worked example" badge from the
                shell — and the landing is the one page with no shell, so the claim has to be made
                here or not at all. It is also the first thing a visitor ever reads, which is the
                worst possible place to leave it implied. */}
            <p className="landing-proof-label">
              <span className="lpl-k">Worked example</span>
              <span className="lpl-sep" aria-hidden="true">
                ·
              </span>
              computed live, by the same engines the app runs on
            </p>

            <SystemsHero />

            {/* Two actions, one size, one shape. This row used to be a filled button reading "See
                the whole record" — which record? — beside a plain text link offering to check your
                own. So the product's only tool, the single screen that reasons over the reader's
                OWN facts, was the quieter of the two, and the louder one led to a stranger's file.
                They are peers now, and the tool is named first. */}
            <div className="landing-cta-row">
              <Link href="/check" className="btn landing-cta">
                Check my status →
              </Link>
              <Link href="/student" className="btn ghost landing-cta">
                See the worked example →
              </Link>
            </div>
          </section>

          <section className="landing-refuse surface">
            <div className="landing-eyebrow">The part that matters</div>
            <h2 className="landing-h2">PathWise does not guess — and shows you why.</h2>
            <p className="landing-lede">
              When the record cannot settle a question, PathWise says so rather than picking the
              likelier answer. Every finding it does make arrives with all five of these attached:
            </p>
            <ul className="landing-guarantees">
              {GUARANTEES.map((g) => (
                <li key={g.k}>
                  <span className="lg-k">{g.k}</span>
                  <span className="lg-v">{g.v}</span>
                </li>
              ))}
            </ul>
            <Link href="/student/changed" className="landing-cta-alt">
              Watch it refuse to guess, then change its mind when evidence arrives →
            </Link>
          </section>
        </main>

        {/* The two site-level statements: how PathWise treats your data, and how far its rules
            actually reach. Both are claims about the product rather than steps in the pitch, which
            is what a contentinfo landmark is for. */}
        <footer className="landing-footer">
          <Callout title="Nothing leaves this device">
            No account. Nothing stored on a server. PathWise reasons on your device — the app makes
            no network requests once it has loaded, and a document you pick is read in the tab and
            never uploaded.
          </Callout>

          {/* The claim this strip is allowed to make is the ARCHITECTURE, not the coverage. It used
              to read "the other 50 the same shape of file", which implied fifty authored rule packs;
              there are four files, one modelled jurisdiction, and a map that says so. The honest
              version is stronger anyway, because /coverage can substantiate every word of it. */}
          <Link href="/coverage" className="memorystrip surface landing-strip">
            <span>
              <span className="ms-k">The rules are data, not code.</span> Every rule is a cited, dated
              JSON file the engines read —{" "}
              {MODELLED_COUNT === 1
                ? `${MODELLED_NAMES[0]} is fully modelled`
                : `${MODELLED_COUNT} states are fully modelled`}
              , {SOURCED_ONLY_COUNT} more have their deciding agency and published rule on record and
              linked, and all {STATE_COUNT} states and DC carry a status derived from the packs
              themselves — including the ones PathWise could not verify at all.
            </span>
            <span className="ms-go">See the coverage map →</span>
          </Link>
        </footer>
      </div>
    </div>
  );
}
