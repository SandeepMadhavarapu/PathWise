import Link from "next/link";
import { Callout } from "@/components/Callout";

export default function Landing() {
  return (
    <main className="bare-page">
      <div className="bare-page-inner">
        <div className="landing-brand">
          <span className="logo">
            Path<span className="dot">Wise</span>
          </span>
        </div>

        <section className="landing surface">
          <div className="landing-eyebrow">One student · three offices</div>
          <h1 className="landing-line">
            Three offices decide your fate. None of them can see the whole you. PathWise does.
          </h1>
          <p className="landing-lede">
            International students face immigration (F-1), residency, and financial aid rules
            separately — PathWise reasons across all three at once.
          </p>
          <div className="landing-cta-row">
            <Link href="/student" className="btn landing-cta">
              View example student →
            </Link>
            <Link href="/check" className="landing-cta-alt">
              Or check your own status →
            </Link>
          </div>
          <Callout title="Nothing leaves this device">
            No account. Nothing stored on a server. PathWise reasons on your device.
          </Callout>
        </section>
      </div>
    </main>
  );
}
