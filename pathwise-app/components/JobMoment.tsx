"use client";

import { useState } from "react";
import { applyLifeEvent } from "@/lib/engines/consequence-engine";
import { priyaStudent, priyaJobOffer } from "@/lib/fixtures/priya";
import type { StatusKey } from "@/lib/tokens";
import { StatusGlyph } from "./StatusGlyph";
import { Capsule } from "./Capsule";

const TONE_STATUS: Record<string, StatusKey> = { warn: "warn", ok: "done", info: "active" };

export function JobMoment() {
  const [revealed, setRevealed] = useState(false);
  const consequences = applyLifeEvent(priyaStudent, priyaJobOffer);

  return (
    <div className="moment surface">
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
            {consequences.map((c, i) => {
              const status = TONE_STATUS[c.tone] ?? "active";
              return (
                <li
                  key={i}
                  className="conseq-item in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <StatusGlyph status={status} />
                  <div className="ci-body">
                    <div className="ci-top">
                      <span className="t-micro">{c.domain}</span>
                      {c.counterintuitive && (
                        <Capsule variant="tinted" status="blocked">
                          counter-intuitive
                        </Capsule>
                      )}
                      {!c.applies && <Capsule variant="neutral">does not apply</Capsule>}
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
              );
            })}
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
