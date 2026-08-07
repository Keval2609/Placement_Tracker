import React, { useEffect, useState } from "react";
import { Plus, Loader2, AlertCircle, Sparkles, FolderArchive, Layers } from "lucide-react";
import { DashboardFilterBar } from "./DashboardFilterBar";
import { DriveCardComponent } from "./DriveCardComponent";
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
  const filteredDrives = drives.filter((drive) => {
    // 1. Status Filter
    if (!selectedStatuses.includes(drive.application_status)) {
      return false;
    }

    // 2. Company Type Filter
    if (!selectedCompanyTypes.includes(drive.company_type)) {
      return false;
    }

    // 3. Deadline Window Filter
    if (deadlineWindow === "next_7_days" && drive.days_left > 7) {
      return false;
    }
    if (deadlineWindow === "next_30_days" && drive.days_left > 30) {
      return false;
    }

    return true;
  });

  // Separate Active vs Overdue
  const activeDrives = filteredDrives.filter((d) => !d.is_overdue);
  const overdueDrives = filteredDrives.filter((d) => d.is_overdue);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Placement Drives Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Track active campus placement drives, deadlines, and application status in real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenIngest}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Parse New Notice</span>
        </button>
      </div>

      {/* Multi-Channel Alerts & OEM Notification Setup Banner */}
      <NotificationSetupBanner />

      {/* Filter Bar */}
      <DashboardFilterBar
        selectedStatuses={selectedStatuses}
        onStatusesChange={setSelectedStatuses}
        selectedCompanyTypes={selectedCompanyTypes}
        onCompanyTypesChange={setSelectedCompanyTypes}
        deadlineWindow={deadlineWindow}
        onDeadlineWindowChange={setDeadlineWindow}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Fetching placement drives...</span>
        </div>
      ) : drives.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Placement Drives Recorded Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Paste a WhatsApp placement notice or upload a circular file to extract your first drive.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenIngest}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
          >
            Parse Placement Circular
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Drives Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span>Active Placement Drives ({activeDrives.length})</span>
              <span className="text-slate-500 font-mono">Sorted nearest deadline first</span>
            </div>

            {activeDrives.length === 0 ? (
              <div className="text-xs text-slate-400 italic bg-slate-900/50 p-6 rounded-xl text-center border border-slate-800">
                No active drives match your current filter selection.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
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
            <div className="space-y-3 pt-6 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <FolderArchive className="w-4 h-4 text-red-400" />
                <span>Closed / Past Drives ({overdueDrives.length})</span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
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
  );
};
