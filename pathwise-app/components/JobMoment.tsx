"use client";

import { useState } from "react";
import { applyLifeEvent } from "@/lib/engines/consequence-engine";
import { priyaStudent, priyaJobOffer } from "@/lib/fixtures/priya";

const toneIcon: Record<string, string> = { warn: "⚠", ok: "✓", info: "◆" };

export function JobMoment() {
  const [revealed, setRevealed] = useState(false);
  const consequences = applyLifeEvent(priyaStudent, priyaJobOffer);

  return (
    <div className="moment">
      <div className="moment-head">
        <div>
          <div className="moment-eyebrow">The life-event test</div>
          <h2>Priya does something good — she signs a job offer.</h2>
          <p className="moment-sub">
            Start date {String(priyaJobOffer.attrs.start_date)}. A calendar app would say
            &ldquo;congrats.&rdquo; Watch what a reasoning engine says instead.
          </p>
        </div>
        {!revealed && (
          <button className="btn" onClick={() => setRevealed(true)}>
            I got a job →
          </button>
        )}
      </div>

      {revealed && (
        <>
          <div className="moment-count">
            You reported a job. <strong>{consequences.length} things changed</strong> across your three
            offices.
          </div>
          <ol className="conseq">
            {consequences.map((c, i) => (
              <li key={i} className={`conseq-item ${c.tone}`}>
                <span className="ci-icon">{toneIcon[c.tone]}</span>
                <div className="ci-body">
                  <div className="ci-top">
                    <span className="ci-domain">{c.domain}</span>
                    {c.counterintuitive && <span className="ci-flag">counter-intuitive</span>}
                    {!c.applies && <span className="ci-flag muted">does not apply</span>}
                  </div>
                  <div className="ci-effect">{c.effect}</div>
                  {c.newDeadline && (
                    <div className="ci-deadline">
                      <strong>Deadline{c.newDeadline.date ? ` ${c.newDeadline.date}` : ""}</strong>
                      <span className="ci-derivation"> — {c.newDeadline.derivation}</span>
                      <div className="ci-miss">If missed: {c.newDeadline.consequenceOfMissing}</div>
                    </div>
                  )}
                  {c.supersedes && (
                    <div className="ci-stale">Re-run needed · supersedes: {c.supersedes.join(", ")}</div>
                  )}
                  <div className="ci-cite">
                    <span className="cite">{c.cite.authority}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="moment-foot">
            None of Priya&apos;s three offices would have caught all four. That is the whole point of
            PathWise.
          </p>
        </>
      )}
    </div>
  );
}
