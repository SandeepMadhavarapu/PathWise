import Link from "next/link";
import { JobMoment } from "@/components/JobMoment";

export default function MomentPage() {
  return (
    <>
      <Link href="/student" className="back-link">
        ← Back to Priya&apos;s standing
      </Link>

      <JobMoment />

      <div className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · Every consequence
        shows its derivation and the regulation behind it.
      </div>
    </>
  );
}
