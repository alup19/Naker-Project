"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { SearchOption } from "./searchable-select";

export function ChoiceSelect({
  value,
  options,
  onChange,
  label,
  className = "",
  openUpwards = false,
}: {
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
  openUpwards?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="field flex min-h-12 w-full items-center justify-between gap-3 text-left"
      >
        <span className="truncate">{selected?.label ?? label}</span>
        <ChevronDown aria-hidden="true" size={17} className={`shrink-0 text-[#aaa69b] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={listId} role="listbox" aria-label={label} className={`absolute inset-x-0 z-50 max-h-64 overflow-y-auto rounded-xl border border-[#806b2c] bg-[#171715] p-1.5 shadow-2xl shadow-black/70 ${openUpwards ? "bottom-full mb-2" : "top-full mt-2"}`}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${option.value === value ? "bg-[#d4af371c] text-[#f5e6a8]" : "text-[#f5f5f0] hover:bg-white/5"}`}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={16} className="ml-3 shrink-0 text-[#d4af37]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
