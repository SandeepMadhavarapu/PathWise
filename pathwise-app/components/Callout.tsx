"use client";

import { useState } from "react";
import { CloseIcon } from "./icons";

export function Callout({
  title,
  children,
  dismissible = false,
}: {
  title: string;
  children: React.ReactNode;
  dismissible?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="callout">
      {dismissible ? (
        <button
          type="button"
          className="callout-close"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <CloseIcon className="icon-14" />
        </button>
      ) : null}
      <div className="callout-title t-card-title">{title}</div>
      <div className="callout-body t-body">{children}</div>
    </div>
  );
}
