import Link from "next/link";

import { runDomicileAnalysis } from "@/lib/engines/domicile";
import { DOMICILE_DURATION_DAYS, GATE_CITE } from "@/lib/engines/domicile-gate";
import { marcusDomicile, marcusStudent } from "@/lib/fixtures/marcus";
import { formatStatusCode } from "@/lib/status-display";
import { FindingDetail } from "@/components/FindingDetail";
import { DomicileAnalysisDetail } from "@/components/DomicileAnalysis";

// The other branch of Engine B. Priya's record ends at the gate; Marcus's passes it, and everything
// past the gate — dependency, the intent factors and their weights, the durational clock, the rules
// of construction — is computed here by the same engine reading the same rulepack.
export default function DomicileAnalysisPage() {
  const analysis = runDomicileAnalysis(marcusDomicile);

  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">the domicile analysis in full</span>
        </div>
        <div className="topnav">
          <Link href="/student" className="pill" style={{ textDecoration: "none" }}>
            ← Back
          </Link>
          <span className="pill">Example student · Marcus</span>
        </div>
      </div>

      <div className="jintro">
        <div className="jintro-eyebrow">Residency · past the gate</div>
        <h1>
          The same gate that refuses Priya lets Marcus through — and then Engine B has nine sections
          of work to do.
        </h1>
        <p>
          Marcus was on the same student visa Priya holds until he became a lawful permanent
          resident. PathWise reads the identical clause for both of them; for him it does not fire, so
          the analysis carries on past it. What follows is the whole determination: whether his own
          acts or his parents&apos; are the ones weighed, which factors the guidelines credit and what
          each is worth, which cannot apply to him at all, which ones the guidelines themselves warn
          carry little weight — and the {DOMICILE_DURATION_DAYS}-day clock, started where the rule
          says it starts rather than where a student would assume.{" "}
          <span className="cite wrap">{GATE_CITE}</span>
        </p>
        <div className="jstats">
          <span className="jstat">
            <strong>{formatStatusCode(marcusStudent.immigration.status)}</strong> status — the gate
            does not fire
          </span>
          <span className="jstat">
            <strong>{marcusDomicile.events.length}</strong> events on the record
          </span>
          <span className="jstat">
            <strong>{analysis.intent?.rows.length ?? 0}</strong> intent factors weighed
          </span>
          <span className="jstat">
            <strong>{analysis.construction.filter((r) => r.relevant).length}</strong> rules of
            construction in play
          </span>
        </div>
      </div>

      <FindingDetail
        finding={analysis.finding}
        analysis={<DomicileAnalysisDetail analysis={analysis} />}
      />

      <Link href="/student/finding/residency" className="memorystrip">
        <span>
          <span className="ms-k">One engine, two answers.</span> Priya&apos;s record stops at the same
          clause this one clears — and PathWise says why rather than shrugging.
        </span>
        <span className="ms-go">See the finding that refuses →</span>
      </Link>

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · Every weight,
        threshold, exception and section reference on this page is read from{" "}
        <code>lib/rulepacks/va-domicile.json</code>. PathWise advises; the office decides.
      </div>
    </main>
  );
}
