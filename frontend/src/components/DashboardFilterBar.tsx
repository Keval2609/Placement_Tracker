import React from "react";
import { LayoutGrid, Columns3, Table, X, SlidersHorizontal } from "lucide-react";
import { cn } from "../lib/utils";

export type DashboardViewMode = "grid" | "funnel" | "table";

export type DeadlineFilterType = "all" | "urgent_72h" | "next_7d" | "next_30d";

interface DashboardFilterBarProps {
  viewMode: DashboardViewMode;
  onViewModeChange: (m: DashboardViewMode) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  selectedCompanyType: string;
  onCompanyTypeChange: (t: string) => void;
  deadlineFilter: DeadlineFilterType;
  onDeadlineFilterChange: (d: DeadlineFilterType) => void;
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
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
    <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 space-y-3.5 rounded-lg shadow-xs">
      {/* Top row: Stage Chips & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Stage Chips */}
        <div
          role="tablist"
          aria-label="Filter drives by recruitment stage"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
        >
          {statuses.map((st) => {
            const isActive = selectedStatus === st.id;
            return (
              <button
                key={st.id}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => onStatusChange(st.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer min-h-[34px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
                  isActive
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border border-neutral-900 dark:border-neutral-100 shadow-xs"
                    : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
                )}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher (Grid / Funnel / Table) */}
        <div
          role="group"
          aria-label="Layout view mode"
          className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-0.5 rounded-md shrink-0"
        >
          <button
            type="button"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[32px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
              viewMode === "grid"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
            title="Card Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "funnel"}
            onClick={() => onViewModeChange("funnel")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[32px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
              viewMode === "funnel"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
            title="Pipeline Funnel / Kanban View"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pipeline</span>
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "table"}
            onClick={() => onViewModeChange("table")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[32px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
              viewMode === "table"
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            )}
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
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-bmw-primary" />
            <span>Filters:</span>
          </div>

          {/* Company Type filter */}
          <div
            role="group"
            aria-label="Filter by company type"
            className="inline-flex bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-0.5 rounded-md"
          >
            {companyTypes.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={selectedCompanyType === t.id}
                onClick={() => onCompanyTypeChange(t.id)}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer min-h-[30px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
                  selectedCompanyType === t.id
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Deadline Window Buttons */}
          <div
            role="group"
            aria-label="Filter by deadline timeframe"
            className="inline-flex bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-0.5 rounded-md"
          >
            <button
              type="button"
              aria-pressed={deadlineFilter === "urgent_72h"}
              onClick={() => onDeadlineFilterChange("urgent_72h")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer min-h-[30px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
                deadlineFilter === "urgent_72h"
                  ? "bg-red-600 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              Urgent (&lt;72h)
            </button>
            <button
              type="button"
              aria-pressed={deadlineFilter === "next_7d"}
              onClick={() => onDeadlineFilterChange("next_7d")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer min-h-[30px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
                deadlineFilter === "next_7d"
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              Next 7 Days
            </button>
            <button
              type="button"
              aria-pressed={deadlineFilter === "all"}
              onClick={() => onDeadlineFilterChange("all")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer min-h-[30px] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary",
                deadlineFilter === "all"
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              All
            </button>
          </div>
        </div>

        {/* Results count & Clear */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono font-medium">
            Showing <strong className="text-neutral-900 dark:text-white">{filteredCount}</strong> of {totalCount} drives
          </span>

          {isFiltered && (
            <button
              type="button"
              aria-label="Reset all applied filters"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-bmw-primary dark:text-blue-400 hover:text-bmw-primary-active font-bold uppercase tracking-wider ml-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
