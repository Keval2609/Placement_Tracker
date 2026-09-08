import React, { useEffect, useState } from "react";
import {
  LayoutGrid,
  Columns3,
  Table,
  Search,
  Building2,
  CheckSquare,
  Square,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { ApplicationStatus, CompanyType, DeadlineWindow } from "../types/drive";

export type DashboardViewMode = "grid" | "funnel" | "table";

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
  { id: "unknown", label: "Other" },
];

const STORAGE_KEY_COMPANY_TYPES = "pt_filter_company_types";

interface DashboardFilterBarProps {
  selectedStatuses: ApplicationStatus[];
  onStatusesChange: (statuses: ApplicationStatus[]) => void;
  selectedCompanyTypes: CompanyType[];
  onCompanyTypesChange: (types: CompanyType[]) => void;
  deadlineWindow: DeadlineWindow;
  onDeadlineWindowChange: (window: DeadlineWindow) => void;
  viewMode?: DashboardViewMode;
  onViewModeChange?: (mode: DashboardViewMode) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  totalCount?: number;
  filteredCount?: number;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  selectedStatuses,
  onStatusesChange,
  selectedCompanyTypes,
  onCompanyTypesChange,
  deadlineWindow,
  onDeadlineWindowChange,
  viewMode = "grid",
  onViewModeChange,
  searchQuery = "",
  onSearchChange,
  totalCount,
  filteredCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
    if (onSearchChange) onSearchChange("");
    try {
      localStorage.setItem(STORAGE_KEY_COMPANY_TYPES, JSON.stringify(allComp));
    } catch {
      // Ignore localStorage errors
    }
  };

  return (
    <div className="bg-[#f7f7f7] border border-[#e6e6e6] p-4 sm:p-5 space-y-4">
      {/* Top row: Search input & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-[#6b6b6b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search drives by company or role..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-[#e6e6e6] text-xs text-[#262626] placeholder-[#9a9a9a] focus:outline-none focus:border-[#1c69d4] focus:ring-1 focus:ring-[#1c69d4] transition-colors"
          />
          {searchQuery && onSearchChange && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6b6b6b] hover:text-[#262626]"
            >
              ✕
            </button>
          )}
        </div>

        {/* View Switcher (Cards / Funnel / Table) */}
        {onViewModeChange && (
          <div className="flex items-center bg-white p-0.5 border border-[#e6e6e6] shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
                viewMode === "grid"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("funnel")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
                viewMode === "funnel"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
                viewMode === "table"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        )}
      </div>

      {/* Second row: Stage Chips & Deadline Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#e6e6e6]">
        {/* Status Stage Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {ALL_STATUSES.map((st) => {
            const isSelected = selectedStatuses.includes(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleStatusToggle(st.id)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] transition-colors cursor-pointer border ${
                  isSelected
                    ? "bg-[#1c69d4] text-white border-[#1c69d4]"
                    : "bg-white text-[#6b6b6b] border-[#cccccc] hover:border-[#262626] hover:text-[#262626]"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* Deadline Window Buttons */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-white p-0.5 border border-[#e6e6e6] text-xs">
            <button
              type="button"
              onClick={() => onDeadlineWindowChange("next_7_days")}
              className={`px-2.5 py-1 font-bold uppercase tracking-[0.5px] transition-colors ${
                deadlineWindow === "next_7_days"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              Next 7D
            </button>
            <button
              type="button"
              onClick={() => onDeadlineWindowChange("next_30_days")}
              className={`px-2.5 py-1 font-bold uppercase tracking-[0.5px] transition-colors ${
                deadlineWindow === "next_30_days"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              Next 30D
            </button>
            <button
              type="button"
              onClick={() => onDeadlineWindowChange("all")}
              className={`px-2.5 py-1 font-bold uppercase tracking-[0.5px] transition-colors ${
                deadlineWindow === "all"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              All
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] hover:text-[#0653b6] px-2 py-1 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isExpanded ? "Hide Filters ▲" : "Filters ▼"}</span>
          </button>
        </div>
      </div>

      {/* Expanded Company Type Panel */}
      {isExpanded && (
        <div className="pt-3 border-t border-[#e6e6e6] space-y-3 text-xs animate-fade-in">
          <div className="flex items-center justify-between text-[#262626] font-bold">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1c69d4]" />
              <span className="uppercase tracking-[0.5px]">Company Type Classification</span>
            </div>
            <span className="text-[11px] text-[#6b6b6b] font-mono">
              {selectedCompanyTypes.length}/{ALL_COMPANY_TYPES.length} Active
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_COMPANY_TYPES.map((type) => {
              const isSelected = selectedCompanyTypes.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleCompanyTypeToggle(type.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
                    isSelected
                      ? "bg-white text-[#1c69d4] border-[#1c69d4]"
                      : "bg-white text-[#6b6b6b] border-[#cccccc] hover:border-[#6b6b6b]"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#1c69d4]" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-[#9a9a9a]" />
                  )}
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[#e6e6e6] flex items-center justify-between">
            {typeof totalCount === "number" && typeof filteredCount === "number" && (
              <span className="text-[11px] text-[#6b6b6b] font-mono">
                Displaying <strong className="text-[#262626]">{filteredCount}</strong> of {totalCount} drives
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[1px] text-[#6b6b6b] hover:text-[#1c69d4] transition-colors ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
