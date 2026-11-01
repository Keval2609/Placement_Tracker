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
    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-lg space-y-3.5 transition-colors">
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
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] whitespace-nowrap rounded-md transition-all cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border border-neutral-900 dark:border-white shadow-xs"
                    : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 dark:hover:border-neutral-500"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher (Grid / Funnel / Table) */}
        <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-0.5 rounded-md shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] rounded-sm transition-all ${
              viewMode === "grid"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("funnel")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] rounded-sm transition-all ${
              viewMode === "funnel"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
            title="Pipeline Funnel / Kanban View"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pipeline</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] rounded-sm transition-all ${
              viewMode === "table"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            }`}
            title="Dense Table View"
          >
            <Table className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Second row: Company Type + Deadline Filter + Reset */}
      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-[1px] mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#1c69d4] dark:text-blue-400" />
            <span>Filters:</span>
          </div>

          {/* Company Type filter */}
          <div className="inline-flex bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-0.5 rounded-md">
            {companyTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onCompanyTypeChange(t.id)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] rounded-sm transition-colors ${
                  selectedCompanyType === t.id
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Deadline Window Buttons */}
          <div className="inline-flex bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => onDeadlineFilterChange("urgent_72h")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] rounded-sm transition-colors ${
                deadlineFilter === "urgent_72h"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Urgent (&lt;72h)
            </button>
            <button
              type="button"
              onClick={() => onDeadlineFilterChange("next_7d")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] rounded-sm transition-colors ${
                deadlineFilter === "next_7d"
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Next 7 Days
            </button>
            <button
              type="button"
              onClick={() => onDeadlineFilterChange("all")}
              className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.5px] rounded-sm transition-colors ${
                deadlineFilter === "all"
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Results count & Clear */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
            Showing <strong className="text-neutral-900 dark:text-neutral-100">{filteredCount}</strong> of {totalCount} drives
          </span>

          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-[#1c69d4] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold uppercase tracking-[1px] ml-1 transition-colors cursor-pointer"
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
