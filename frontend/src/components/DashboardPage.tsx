import React, { useEffect, useState, useMemo } from "react";
import { Loader2, AlertCircle, Sparkles, FolderArchive, Layers } from "lucide-react";
import { DashboardFilterBar, DashboardViewMode } from "./DashboardFilterBar";
import { DriveCardComponent } from "./DriveCardComponent";
import { DashboardFunnelView } from "./DashboardFunnelView";
import { DashboardTableView } from "./DashboardTableView";
import { DashboardMetricsStrip } from "./DashboardMetricsStrip";
import { NotificationSetupBanner } from "./NotificationSetupBanner";
import { ApplicationStatus, CompanyType, DeadlineWindow, DriveCard } from "../types/drive";
import { fetchDashboardDrives } from "../services/api";

interface DashboardPageProps {
  onSelectDrive: (driveId: string) => void;
  onOpenIngest: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectDrive,
  onOpenIngest,
}) => {
  const [drives, setDrives] = useState<DriveCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Cards / Pipeline Funnel / Table
  const [viewMode, setViewMode] = useState<DashboardViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filters State
  const [selectedStatuses, setSelectedStatuses] = useState<ApplicationStatus[]>([
    "not_applied",
    "applied",
    "oa",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
  ]);
  const [selectedCompanyTypes, setSelectedCompanyTypes] = useState<CompanyType[]>([
    "product",
    "startup",
    "service",
    "psu",
    "unknown",
  ]);
  const [deadlineWindow, setDeadlineWindow] = useState<DeadlineWindow>("all");

  const loadDrives = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardDrives();
      setDrives(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load dashboard placement drives.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrives();
  }, []);

  // Filter Logic
  const filteredDrives = useMemo(() => {
    return drives.filter((drive) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = drive.company_name.toLowerCase().includes(q);
        const matchRole = drive.role_title.toLowerCase().includes(q);
        if (!matchName && !matchRole) return false;
      }

      // 2. Status Filter
      if (!selectedStatuses.includes(drive.application_status)) {
        return false;
      }

      // 3. Company Type Filter
      if (!selectedCompanyTypes.includes(drive.company_type)) {
        return false;
      }

      // 4. Deadline Window Filter
      if (deadlineWindow === "next_7_days" && drive.days_left > 7) {
        return false;
      }
      if (deadlineWindow === "next_30_days" && drive.days_left > 30) {
        return false;
      }

      return true;
    });
  }, [drives, searchQuery, selectedStatuses, selectedCompanyTypes, deadlineWindow]);

  // Separate Active vs Overdue
  const activeDrives = filteredDrives.filter((d) => !d.is_overdue);
  const overdueDrives = filteredDrives.filter((d) => d.is_overdue);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* BMW Navy Hero KPI Strip */}
      <DashboardMetricsStrip
        drives={drives}
        onFilterUrgent={() => {
          setDeadlineWindow("next_7_days");
          setSelectedStatuses(["not_applied", "applied", "oa", "interview"]);
        }}
        onFilterActivePipeline={() => {
          setSelectedStatuses(["oa", "interview"]);
        }}
        onFilterOffers={() => {
          setSelectedStatuses(["offer"]);
        }}
      />

      {/* Multi-Channel Alerts & Notification Banner */}
      <NotificationSetupBanner />

      {/* Filter Toolbar */}
      <DashboardFilterBar
        selectedStatuses={selectedStatuses}
        onStatusesChange={setSelectedStatuses}
        selectedCompanyTypes={selectedCompanyTypes}
        onCompanyTypesChange={setSelectedCompanyTypes}
        deadlineWindow={deadlineWindow}
        onDeadlineWindowChange={setDeadlineWindow}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={drives.length}
        filteredCount={filteredDrives.length}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#6b6b6b] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1c69d4]" />
          <span className="text-xs font-light">Fetching placement drives...</span>
        </div>
      ) : drives.length === 0 ? (
        <div className="bg-[#fafafa] border border-[#e6e6e6] p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-[#1a2129] text-white flex items-center justify-center mx-auto border border-[#262e38]">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#262626]">No Placement Drives Recorded Yet</h3>
            <p className="text-xs font-light text-[#6b6b6b] max-w-sm mx-auto">
              Paste a WhatsApp placement notice or upload a circular file to extract and track your first drive.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenIngest}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1c69d4] hover:bg-[#0653b6] text-white text-xs font-bold uppercase tracking-[0.5px] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Parse Placement Circular</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Content Area based on ViewMode */}
          {viewMode === "funnel" ? (
            <DashboardFunnelView
              drives={filteredDrives}
              onSelectDrive={onSelectDrive}
              onStatusUpdated={loadDrives}
            />
          ) : viewMode === "table" ? (
            <DashboardTableView
              drives={filteredDrives}
              onSelectDrive={onSelectDrive}
            />
          ) : (
            <div className="space-y-8">
              {/* Active Drives Section */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#262626] uppercase tracking-[1.5px]">
                  <span>Active Placement Drives ({activeDrives.length})</span>
                  <span className="text-[#6b6b6b] font-mono text-[11px]">Sorted nearest deadline first</span>
                </div>

                {activeDrives.length === 0 ? (
                  <div className="text-xs text-[#6b6b6b] italic bg-[#fafafa] p-8 text-center border border-[#e6e6e6]">
                    No active drives match your current filter selection.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeDrives.map((drive) => (
                      <DriveCardComponent
                        key={drive.id}
                        drive={drive}
                        onSelectDrive={onSelectDrive}
                        onStatusUpdated={loadDrives}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Overdue / Closed Drives Section */}
              {overdueDrives.length > 0 && (
                <div className="space-y-3.5 pt-6 border-t border-[#e6e6e6]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#6b6b6b] uppercase tracking-[1.5px]">
                    <FolderArchive className="w-4 h-4 text-[#dc2626]" />
                    <span>Closed / Past Drives ({overdueDrives.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-80 hover:opacity-100 transition-opacity">
                    {overdueDrives.map((drive) => (
                      <DriveCardComponent
                        key={drive.id}
                        drive={drive}
                        onSelectDrive={onSelectDrive}
                        onStatusUpdated={loadDrives}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
