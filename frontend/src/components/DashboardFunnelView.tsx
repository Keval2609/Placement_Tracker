import React, { useState } from "react";
import { DriveCard, ApplicationStatus } from "../types/drive";
import { ArrowRight, Clock } from "lucide-react";
import { updateApplicationStatus } from "../services/api";
import { cn } from "../lib/utils";

interface DashboardFunnelViewProps {
  drives: DriveCard[];
  onSelectDrive: (driveId: string) => void;
  onStatusUpdated?: () => void;
}

const COLUMNS: {
  id: ApplicationStatus;
  title: string;
}[] = [
  { id: "not_applied", title: "Eligible / Not Applied" },
  { id: "applied", title: "Applied" },
  { id: "oa", title: "OA Scheduled" },
  { id: "interview", title: "Interview Round" },
  { id: "offer", title: "Offer Secured 🎉" },
];

export const DashboardFunnelView: React.FC<DashboardFunnelViewProps> = ({
  drives,
  onSelectDrive,
  onStatusUpdated,
}) => {
  const [mobileActiveStage, setMobileActiveStage] = useState<ApplicationStatus>("applied");

  const handleAdvance = async (e: React.MouseEvent, applicationId: string, nextStatus: ApplicationStatus) => {
    e.stopPropagation();
    try {
      await updateApplicationStatus(applicationId, nextStatus);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error("Failed advancing stage:", err);
    }
  };

  const renderColumnContent = (col: typeof COLUMNS[number]) => {
    const columnDrives = drives.filter((d) => d.application_status === col.id);

    return (
      <div
        key={col.id}
        className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 space-y-3 rounded-lg min-w-[220px]"
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider truncate">
            {col.title}
          </span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
            {columnDrives.length}
          </span>
        </div>

        {/* Cards list */}
        <div className="space-y-3 min-h-[260px]">
          {columnDrives.length === 0 ? (
            <div className="h-28 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-md flex items-center justify-center text-xs text-neutral-500 dark:text-neutral-400 italic">
              No drives in this stage
            </div>
          ) : (
            columnDrives.map((drive) => (
              <div
                key={drive.id}
                role="button"
                tabIndex={0}
                aria-label={`View drive details for ${drive.company_name}, ${drive.role_title}`}
                onClick={() => onSelectDrive(drive.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDrive(drive.id);
                  }
                }}
                className="group p-3.5 bg-white dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 hover:border-bmw-primary dark:hover:border-bmw-primary rounded-md transition-all duration-200 cursor-pointer space-y-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-bmw-primary transition-colors">
                      {drive.company_name}
                    </h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium line-clamp-1">
                      {drive.role_title}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600 shrink-0">
                    {drive.company_type}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="flex items-center gap-1 font-mono font-medium">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    {drive.is_overdue
                      ? "Closed"
                      : drive.days_left === 0
                      ? "Today"
                      : `${drive.days_left}d left`}
                  </span>
                  {drive.ctc_display && (
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 text-[11px]">
                      {drive.ctc_display}
                    </span>
                  )}
                </div>

                {/* Advance Stage button */}
                {col.id !== "offer" && (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Advance ${drive.company_name} to next recruitment stage`}
                    className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-bmw-primary dark:text-blue-400 hover:text-bmw-primary-active focus-visible:outline-none focus-visible:underline"
                    onClick={(e) => {
                      const nextMap: Record<string, ApplicationStatus> = {
                        not_applied: "applied",
                        applied: "oa",
                        oa: "interview",
                        interview: "offer",
                      };
                      const next = nextMap[col.id];
                      if (next) handleAdvance(e, drive.application_id, next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        const nextMap: Record<string, ApplicationStatus> = {
                          not_applied: "applied",
                          applied: "oa",
                          oa: "interview",
                          interview: "offer",
                        };
                        const next = nextMap[col.id];
                        if (next) updateApplicationStatus(drive.application_id, next).then(onStatusUpdated);
                      }
                    }}
                  >
                    <span>Move Next Stage</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const activeMobileColObj = COLUMNS.find((c) => c.id === mobileActiveStage) || COLUMNS[0];

  return (
    <div className="space-y-3">
      {/* Mobile Stage Selector Tabs (< md) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {COLUMNS.map((col) => {
          const count = drives.filter((d) => d.application_status === col.id).length;
          const isActive = mobileActiveStage === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobileActiveStage(col.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-md border transition-all cursor-pointer flex items-center gap-1.5 min-h-[34px]",
                isActive
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-neutral-900 dark:border-neutral-100 shadow-xs"
                  : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
              )}
            >
              <span>{col.title}</span>
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.2 rounded-xs",
                isActive ? "bg-neutral-800 dark:bg-neutral-300 text-white dark:text-neutral-900" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile view single column */}
      <div className="md:hidden">
        {renderColumnContent(activeMobileColObj)}
      </div>

      {/* Desktop view: Full horizontal multi-column board */}
      <div className="hidden md:block overflow-x-auto pb-4 pt-1">
        <div className="flex items-start gap-4 min-w-[1050px]">
          {COLUMNS.map((col) => renderColumnContent(col))}
        </div>
      </div>
    </div>
  );
};
