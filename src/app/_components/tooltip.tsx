"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition(rect.top < 80 ? "bottom" : "top");
  }, []);

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`absolute left-1/2 z-50 w-56 -translate-x-1/2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-zinc-100 shadow-2xl ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {content}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-[5px] border-transparent ${
              position === "top"
                ? "top-full border-t-zinc-950"
                : "bottom-full border-b-zinc-950"
            }`}
          />
        </div>
      )}
    </span>
  );
}

export function InfoTip({ content }: { content: string }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        tabIndex={-1}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold leading-none text-zinc-300 hover:bg-orange-500/20 hover:text-orange-400"
        aria-label="Información"
      >
        ?
      </button>
    </Tooltip>
  );
}
