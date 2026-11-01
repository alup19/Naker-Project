"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type SearchOption = { value: string; label: string };

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  emptyMessage = "Nenhuma opção encontrada.",
  className = "",
  openUpwards = false,
}: {
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  placeholder: string;
  emptyMessage?: string;
  className?: string;
  openUpwards?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")),
  );
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function choose(option: SearchOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <div className="relative">
        <input
          role="combobox"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          className="field pr-10"
          placeholder={placeholder}
          value={open ? query : selected?.label ?? ""}
          onFocus={() => { setQuery(""); setActiveIndex(0); setOpen(true); }}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && open && filtered[activeIndex]) {
              event.preventDefault();
              choose(filtered[activeIndex]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
        />
        <ChevronDown size={17} aria-hidden="true" className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa69b] transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div id={listId} role="listbox" className={`absolute inset-x-0 z-50 max-h-64 overflow-y-auto rounded-xl border border-[#806b2c] bg-[#171715] p-1.5 shadow-2xl shadow-black/70 ${openUpwards ? "bottom-full mb-2" : "top-full mt-2"}`}>
          {filtered.length ? filtered.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              id={`${listId}-${index}`}
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${index === activeIndex ? "bg-[#d4af371c] text-[#f5e6a8]" : "text-[#f5f5f0] hover:bg-white/5"}`}
            >
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check size={16} className="ml-3 shrink-0 text-[#d4af37]" />}
            </button>
          )) : <p className="px-3 py-4 text-sm text-[#aaa69b]">{emptyMessage}</p>}
        </div>
      )}
    </div>
  );
}
