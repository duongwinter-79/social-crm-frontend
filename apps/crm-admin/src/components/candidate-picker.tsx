import { useMemo, useState } from "react";
import { Input, Select } from "@social-crm/ui";
import { useCandidatesQuery, type CandidateRef } from "@social-crm/api";
import { useI18n } from "@/i18n";
import { getLeadDisplayName } from "@/lib/lead-display";

type CandidatePickerProps = {
  value: string;
  onChange: (candidateId: string, candidate?: CandidateRef) => void;
  label: string;
  searchLabel: string;
  placeholder: string;
  emptyLabel: string;
  noLeadDetailLabel: string;
  disabled?: boolean;
  className?: string;
};

export function CandidatePicker(props: CandidatePickerProps) {
  const { copy } = useI18n();
  const [search, setSearch] = useState("");
  const candidateQuery = useCandidatesQuery({ offset: 0, limit: 50, search: search || undefined });
  const candidates = candidateQuery.data?.data ?? [];
  const selectedCandidate = useMemo(() => candidates.find((candidate) => candidate.id === props.value), [candidates, props.value]);

  return (
    <div className={props.className ?? "space-y-4"}>
      <Input
        label={props.searchLabel}
        placeholder={props.placeholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={props.disabled}
      />
      <Select
        label={props.label}
        value={props.value}
        onChange={(event) => {
          const nextCandidate = candidates.find((candidate) => candidate.id === event.target.value);
          props.onChange(event.target.value, nextCandidate);
        }}
        disabled={props.disabled || candidateQuery.isLoading}
      >
        <option value="">{props.emptyLabel}</option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidateLabel(candidate, props.noLeadDetailLabel)}
          </option>
        ))}
      </Select>
      <div className="text-xs leading-5 text-slate-500">
        {candidateQuery.isLoading
          ? copy({ en: "Loading candidates...", vi: "Đang tải ứng viên..." })
          : selectedCandidate
            ? copy({ en: `Selected ${selectedCandidate.code || selectedCandidate.id.slice(0, 8)}`, vi: `Đã chọn ${selectedCandidate.code || selectedCandidate.id.slice(0, 8)}` })
            : copy({ en: `${candidateQuery.data?.total ?? candidates.length} candidates available`, vi: `${candidateQuery.data?.total ?? candidates.length} ứng viên có thể chọn` })}
      </div>
    </div>
  );
}

function candidateLabel(candidate: CandidateRef, noLeadDetailLabel: string) {
  const leadLabel = candidate.lead
    ? getLeadDisplayName(candidate.lead) || candidate.lead.phone || noLeadDetailLabel
    : noLeadDetailLabel;
  return `${candidate.code || candidate.id.slice(0, 8)} - ${leadLabel}`;
}
