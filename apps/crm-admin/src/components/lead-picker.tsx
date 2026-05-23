import { useEffect, useRef, useState } from "react";
import { useLeadsSearchQuery } from "@social-crm/api";

interface LeadPickerProps {
  value: string; // leadId
  onChange: (leadId: string, displayLabel: string) => void;
  label?: string;
  placeholder?: string;
}

export function LeadPicker({ value, onChange, label, placeholder }: LeadPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchQuery = useLeadsSearchQuery(inputValue);
  const leads = searchQuery.data?.data ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function handleSelect(lead: { id: string; fullName?: string | null; displayName?: string | null; phone?: string | null }) {
    const label = [lead.fullName || lead.displayName, lead.phone].filter(Boolean).join(" · ");
    setInputValue(label);
    setOpen(false);
    onChange(lead.id, label);
  }

  function handleClear() {
    setInputValue("");
    setOpen(false);
    onChange("", "");
  }

  // When a lead is pre-selected (e.g. via ?leadId=), show the id as placeholder until search
  const currentValueLabel = value && !inputValue ? `ID: ${value.slice(0, 8)}…` : undefined;

  return (
    <div ref={containerRef} className="relative">
      {label ? (
        <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      ) : null}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={inputValue}
          placeholder={currentValueLabel ?? (placeholder ?? "Tìm tên hoặc SĐT ứng viên…")}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { if (inputValue.length >= 1) setOpen(true); }}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        {(value || inputValue) ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        ) : null}
      </div>

      {open && leads.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {leads.map((lead) => {
            const name = lead.fullName || lead.displayName || "—";
            const phone = lead.phone ?? "";
            const idPrefix = lead.id.slice(0, 8);
            return (
              <li key={lead.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-indigo-50"
                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                  onClick={() => handleSelect(lead)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{name}</span>
                    {phone ? <span className="ml-2 text-slate-500">{phone}</span> : null}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-400">{idPrefix}…</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : open && inputValue.length >= 1 && !searchQuery.isFetching ? (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500 shadow-lg">
          Không tìm thấy ứng viên phù hợp
        </div>
      ) : null}
    </div>
  );
}
