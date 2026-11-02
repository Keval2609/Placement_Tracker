import React, { useState, useMemo } from "react";
import {
  PROTOTYPE_DRIVES,
  PrototypeDrive,
} from "./mockData";
import { PrototypeNavbar } from "./PrototypeNavbar";
import { PrototypeMetricsStrip } from "./PrototypeMetricsStrip";
import { PrototypeFilterBar, ViewMode } from "./PrototypeFilterBar";
import { PrototypeDriveCard } from "./PrototypeDriveCard";
import { PrototypeFunnelView } from "./PrototypeFunnelView";
import { PrototypeTableView } from "./PrototypeTableView";
import { PrototypeDriveDetailModal } from "./PrototypeDriveDetailModal";
import { PrototypeIngestModal } from "./PrototypeIngestModal";
import { PrototypeAlertsDrawer } from "./PrototypeAlertsDrawer";

interface PrototypeViewProps {
  onExitPrototype: () => void;
  onOpenLegal?: (tab: "terms" | "privacy") => void;
}

export const PrototypeView: React.FC<PrototypeViewProps> = ({
  onExitPrototype,
  onOpenLegal,
}) => {
  const [drives, setDrives] = useState<PrototypeDrive[]>(PROTOTYPE_DRIVES);
  const [selectedDrive, setSelectedDrive] = useState<PrototypeDrive | null>(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCompanyType, setSelectedCompanyType] = useState<string>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<"all" | "urgent_72h" | "next_7d" | "next_30d">("all");

  // Filter Computation
  const filteredDrives = useMemo(() => {
    return drives.filter((drive) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = drive.company_name.toLowerCase().includes(q);
        const matchRole = drive.role_title.toLowerCase().includes(q);
        const matchBranch = drive.eligible_branches.some((b) => b.toLowerCase().includes(q));
        const matchCtc = drive.ctc_display.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchBranch && !matchCtc) {
          return false;
        }
      }

      // 2. Status
      if (selectedStatus !== "all" && drive.application_status !== selectedStatus) {
        return false;
      }

      // 3. Company Type
      if (selectedCompanyType !== "all" && drive.company_type !== selectedCompanyType) {
        return false;
      }

      // 4. Deadline Filter
      if (deadlineFilter === "urgent_72h") {
        if (drive.is_overdue || drive.days_left > 3) return false;
      } else if (deadlineFilter === "next_7d") {
        if (drive.is_overdue || drive.days_left > 7) return false;
      } else if (deadlineFilter === "next_30d") {
        if (drive.is_overdue || drive.days_left > 30) return false;
      }

      return true;
    });
  }, [drives, searchQuery, selectedStatus, selectedCompanyType, deadlineFilter]);

  const activeDrives = filteredDrives.filter((d) => !d.is_overdue);
  const closedDrives = filteredDrives.filter((d) => d.is_overdue);

  // Status Handlers
  const handleUpdateStatus = (driveId: string, status: PrototypeDrive["application_status"]) => {
    setDrives((prev) =>
      prev.map((d) => (d.id === driveId ? { ...d, application_status: status } : d))
    );
    if (selectedDrive && selectedDrive.id === driveId) {
      setSelectedDrive((prev) => (prev ? { ...prev, application_status: status } : null));
    }
  };

  const handleDriveCreated = (newDrive: PrototypeDrive) => {
    setDrives([newDrive, ...drives]);
    setSelectedDrive(newDrive);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedCompanyType("all");
    setDeadlineFilter("all");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans selection:bg-bmw-primary selection:text-white pb-16 transition-colors duration-150">
      {/* Top Notification Bar */}
      <div className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 text-xs text-neutral-800 dark:text-neutral-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-bmw-primary rounded-full" />
            <span className="font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              DEMO SHOWCASE PREVIEW
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 font-normal hidden sm:inline">
              — Interactive Prototype Showcase (Cards, Funnel Pipeline, Quick Filters, AI Parser & Detail Views)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExitPrototype}
              className="px-3 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700 rounded-md"
            >
              Back to Live Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Corporate Top Navbar */}
      <PrototypeNavbar
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeDrivesCount={drives.filter((d) => !d.is_overdue).length}
        urgentCount={drives.filter((d) => !d.is_overdue && d.days_left <= 3).length}
        onExitPrototype={onExitPrototype}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Executive KPI Metrics - BMW Navy Hero Band */}
        <PrototypeMetricsStrip
          drives={drives}
          onFilterUrgent={() => {
            setDeadlineFilter("urgent_72h");
            setSelectedStatus("all");
          }}
          onFilterActivePipeline={() => {
            setSelectedStatus("oa");
            setDeadlineFilter("all");
          }}
          onFilterOffers={() => {
            setSelectedStatus("offer");
            setDeadlineFilter("all");
          }}
        />

        {/* Filter and View Command Bar */}
        <PrototypeFilterBar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedCompanyType={selectedCompanyType}
          onCompanyTypeChange={setSelectedCompanyType}
          deadlineFilter={deadlineFilter}
          onDeadlineFilterChange={setDeadlineFilter}
          totalCount={drives.length}
          filteredCount={filteredDrives.length}
          onResetFilters={handleResetFilters}
        />

        {/* View Content: Cards vs Funnel vs Table */}
        {viewMode === "funnel" ? (
          <PrototypeFunnelView
            drives={filteredDrives}
            onSelect={(d) => setSelectedDrive(d)}
            onAdvanceStage={handleUpdateStatus}
          />
        ) : viewMode === "table" ? (
          <PrototypeTableView
            drives={filteredDrives}
            onSelect={(d) => setSelectedDrive(d)}
          />
        ) : (
          <div className="space-y-8">
            {/* Active Drives */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-[1.5px]">
                <span>Active Placement Drives ({activeDrives.length})</span>
                <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">Sorted by closest deadline</span>
              </div>

              {activeDrives.length === 0 ? (
                <div className="p-12 text-center bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-light">
                    No active placement drives match the chosen filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-[#1c69d4] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-[0.5px] rounded-md transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeDrives.map((drive) => (
                    <PrototypeDriveCard
                      key={drive.id}
                      drive={drive}
                      onSelect={(d) => setSelectedDrive(d)}
                      onStatusChange={handleUpdateStatus}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Closed / Archived Drives */}
            {closedDrives.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-[1.5px]">
                  <span>Closed & Concluded Drives ({closedDrives.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                  {closedDrives.map((drive) => (
                    <PrototypeDriveCard
                      key={drive.id}
                      drive={drive}
                      onSelect={(d) => setSelectedDrive(d)}
                      onStatusChange={handleUpdateStatus}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Site Footer */}
      <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800 pt-8 pb-10 text-xs text-neutral-500 dark:text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-bmw-surface-dark rounded flex items-center justify-center font-bold text-white text-[10px] border border-neutral-800">
              PT
            </div>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              DriveTrack — Interactive Prototype Showcase
            </span>
          </div>

          <div className="flex items-center gap-3.5 flex-wrap">
            {onOpenLegal && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenLegal("terms")}
                  className="hover:text-bmw-primary transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal("privacy")}
                  className="hover:text-bmw-primary transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span>•</span>
              </>
            )}
            <a
              href="https://github.com/Keval2609/Placement_Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bmw-primary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <PrototypeDriveDetailModal
        drive={selectedDrive}
        onClose={() => setSelectedDrive(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      <PrototypeIngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onDriveCreated={handleDriveCreated}
      />

      <PrototypeAlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
      />
    </div>
  );
};
