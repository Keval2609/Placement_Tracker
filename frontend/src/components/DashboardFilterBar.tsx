import React, { useEffect, useState } from "react";
import { Filter, Calendar, Building2, CheckSquare, Square, RotateCcw } from "lucide-react";
import { ApplicationStatus, CompanyType, DeadlineWindow } from "../types/drive";

const ALL_STATUSES: { id: ApplicationStatus; label: string }[] = [
  { id: "not_applied", label: "Not Applied" },
  { id: "applied", label: "Applied" },
  { id: "oa", label: "OA Stage" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

const ALL_COMPANY_TYPES: { id: CompanyType; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "startup", label: "Startup" },
  { id: "service", label: "Service" },
  { id: "psu", label: "PSU" },
  { id: "unknown", label: "Unknown" },
];

const STORAGE_KEY_COMPANY_TYPES = "pt_filter_company_types";

interface DashboardFilterBarProps {
  selectedStatuses: ApplicationStatus[];
  onStatusesChange: (statuses: ApplicationStatus[]) => void;
  selectedCompanyTypes: CompanyType[];
  onCompanyTypesChange: (types: CompanyType[]) => void;
  deadlineWindow: DeadlineWindow;
  onDeadlineWindowChange: (window: DeadlineWindow) => void;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  selectedStatuses,
  onStatusesChange,
  selectedCompanyTypes,
  onCompanyTypesChange,
  deadlineWindow,
  onDeadlineWindowChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize company_type filter from localStorage if present
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COMPANY_TYPES);
      if (saved) {
        const parsed = JSON.parse(saved) as CompanyType[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          onCompanyTypesChange(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompanyTypeToggle = (type: CompanyType) => {
    let next: CompanyType[];
    if (selectedCompanyTypes.includes(type)) {
      next = selectedCompanyTypes.filter((t) => t !== type);
    } else {
      next = [...selectedCompanyTypes, type];
    }
    onCompanyTypesChange(next);
    try {
      localStorage.setItem(STORAGE_KEY_COMPANY_TYPES, JSON.stringify(next));
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleStatusToggle = (status: ApplicationStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const handleResetFilters = () => {
    onStatusesChange(ALL_STATUSES.map((s) => s.id));
    const allComp = ALL_COMPANY_TYPES.map((c) => c.id);
    onCompanyTypesChange(allComp);
    onDeadlineWindowChange("all");
    try {
      localStorage.setItem(STORAGE_KEY_COMPANY_TYPES, JSON.stringify(allComp));
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-xl">
      {/* Top Filter Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Filter & Search Drives
          </h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {selectedCompanyTypes.length}/{ALL_COMPANY_TYPES.length} Types
          </span>
        </div>

        {/* Deadline Window Buttons */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => onDeadlineWindowChange("next_7_days")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                deadlineWindow === "next_7_days"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Next 7 Days
            </button>
            <button
              type="button"
              onClick={() => onDeadlineWindowChange("next_30_days")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                deadlineWindow === "next_30_days"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Next 30 Days
            </button>
            <button
              type="button"
              onClick={() => onDeadlineWindowChange("all")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                deadlineWindow === "all"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Window
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1"
          >
            {isExpanded ? "Hide Filters ▲" : "Show Filters ▼"}
          </button>
        </div>
      </div>

      {/* Expanded Filter Options */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-800/80 space-y-4 text-xs">
          {/* Company Type Filter (Persisted in localStorage) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Company Type Filter (Survives Reload)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">localStorage sync</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_COMPANY_TYPES.map((type) => {
                const isSelected = selectedCompanyTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleCompanyTypeToggle(type.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                        : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Application Status Filter */}
          <div className="space-y-2">
            <div className="text-slate-300 font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Application Status Filter</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((st) => {
                const isSelected = selectedStatuses.includes(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleStatusToggle(st.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-slate-800 text-slate-200 border-slate-700"
                        : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Filters Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
