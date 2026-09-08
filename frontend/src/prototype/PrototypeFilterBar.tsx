import React from "react";
import { LayoutGrid, Columns3, Table, X, SlidersHorizontal } from "lucide-react";

export type ViewMode = "grid" | "funnel" | "table";

interface PrototypeFilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  selectedCompanyType: string;
  onCompanyTypeChange: (t: string) => void;
  deadlineFilter: "all" | "urgent_72h" | "next_7d" | "next_30d";
  onDeadlineFilterChange: (d: "all" | "urgent_72h" | "next_7d" | "next_30d") => void;
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export const PrototypeFilterBar: React.FC<PrototypeFilterBarProps> = ({
  viewMode,
  onViewModeChange,
  selectedStatus,
  onStatusChange,
  selectedCompanyType,
  onCompanyTypeChange,
  deadlineFilter,
  onDeadlineFilterChange,
  totalCount,
  filteredCount,
  onResetFilters,
}) => {
  const isFiltered =
    selectedStatus !== "all" ||
    selectedCompanyType !== "all" ||
    deadlineFilter !== "all";

  const statuses = [
    { id: "all", label: "All Stages" },
    { id: "not_applied", label: "Not Applied" },
    { id: "applied", label: "Applied" },
    { id: "oa", label: "OA Stage" },
    { id: "interview", label: "Interview" },
    { id: "offer", label: "Offer 🎉" },
  ];

  const companyTypes = [
    { id: "all", label: "All Types" },
    { id: "product", label: "Product" },
    { id: "service", label: "Service" },
    { id: "startup", label: "Startup" },
  ];

  return (
    <div className="bg-[#f7f7f7] border border-[#e6e6e6] p-4 space-y-3.5">
      {/* Top row: Stage Chips & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Stage Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {statuses.map((st) => {
            const isActive = selectedStatus === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onStatusChange(st.id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#262626] text-white border border-[#262626]"
                    : "bg-white text-[#262626] border border-[#cccccc] hover:border-[#262626]"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher (Grid / Funnel / Table) */}
        <div className="flex items-center bg-white border border-[#cccccc] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] transition-all ${
              viewMode === "grid"
                ? "bg-[#262626] text-white"
                : "text-[#6b6b6b] hover:text-[#262626]"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("funnel")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] transition-all ${
              viewMode === "funnel"
                ? "bg-[#262626] text-white"
                : "text-[#6b6b6b] hover:text-[#262626]"
            }`}
            title="Pipeline Funnel / Kanban View"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] transition-all ${
              viewMode === "table"
                ? "bg-[#262626] text-white"
                : "text-[#6b6b6b] hover:text-[#262626]"
            }`}
            title="Dense Table View"
          >
            <Table className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Second row: Company Type + Deadline Filter + Reset */}
      <div className="pt-2 border-t border-[#e6e6e6] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#6b6b6b] font-bold uppercase tracking-[1px] mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1c69d4]" />
            <span>Filters:</span>
          </div>

          {/* Company Type filter */}
          <div className="inline-flex bg-white border border-[#cccccc] p-0.5">
            {companyTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onCompanyTypeChange(t.id)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] transition-colors ${
                  selectedCompanyType === t.id
                    ? "bg-[#262626] text-white"
                    : "text-[#6b6b6b] hover:text-[#262626]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Deadline Window Buttons */}
          <div className="inline-flex bg-white border border-[#cccccc] p-0.5">
            <button
              type="button"
              onClick={() => onDeadlineFilterChange("urgent_72h")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] transition-colors ${
                deadlineFilter === "urgent_72h"
                  ? "bg-[#e22718] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              Urgent (&lt;72h)
            </button>
            <button
              type="button"
              onClick={() => onDeadlineFilterChange("next_7d")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] transition-colors ${
                deadlineFilter === "next_7d"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              Next 7 Days
            </button>
            <button
              type="button"
              onClick={() => onDeadlineFilterChange("all")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] transition-colors ${
                deadlineFilter === "all"
                  ? "bg-[#262626] text-white"
                  : "text-[#6b6b6b] hover:text-[#262626]"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Results count & Clear */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] text-[#6b6b6b] font-mono">
            Showing <strong className="text-[#262626]">{filteredCount}</strong> of {totalCount} drives
          </span>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-[#1c69d4] hover:text-[#0653b6] font-bold uppercase tracking-[1px] ml-1 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
