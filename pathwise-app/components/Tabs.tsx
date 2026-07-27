"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  href: string;
}

// Text-only tabs with a 2px underline that slides between them (translate + width, 220ms).
export function Tabs({ tabs, activeId }: { tabs: TabItem[]; activeId: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(`[data-tab-id="${activeId}"]`);
    if (!active) return;
    setLine({ left: active.offsetLeft, width: active.offsetWidth });
  }, [activeId, tabs]);

  return (
    <div className="tabs" ref={listRef}>
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          data-tab-id={tab.id}
          className={`tab${tab.id === activeId ? " active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
      {line ? (
        <span
          className="tabs-underline"
          style={{ transform: `translateX(${line.left}px)`, width: `${line.width}px` }}
        />
      ) : null}
    </div>
  );
}
