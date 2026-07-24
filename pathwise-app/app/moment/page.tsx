import Link from "next/link";
import { JobMoment } from "@/components/JobMoment";

export default function MomentPage() {
  return (
    <main className="wrap">
      <div className="topbar">
        <div className="brand">
          <Link href="/" className="logo" style={{ textDecoration: "none" }}>
            Path<span className="dot">Wise</span>
          </Link>
          <span className="tag">the life-event test</span>
        </div>
        <Link href="/student" className="pill">
          ← Back to Priya&apos;s standing
        </Link>
      </div>

      <JobMoment />

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · Every consequence
        shows its derivation and the regulation behind it.
      </div>
    </main>
  );
}
