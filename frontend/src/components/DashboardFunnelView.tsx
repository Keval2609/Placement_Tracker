import React from "react";
import { DriveCard, ApplicationStatus } from "../types/drive";
import { ArrowRight, Clock } from "lucide-react";
import { updateApplicationStatus } from "../services/api";

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
  const handleAdvance = async (e: React.MouseEvent, applicationId: string, nextStatus: ApplicationStatus) => {
    e.stopPropagation();
    try {
      await updateApplicationStatus(applicationId, nextStatus);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      console.error("Failed advancing stage:", err);
    }
  };

  return (
    <div className="overflow-x-auto pb-4 pt-1">
      <div className="flex items-start gap-4 min-w-[1100px]">
        {COLUMNS.map((col) => {
          const columnDrives = drives.filter((d) => d.application_status === col.id);

          return (
            <div
              key={col.id}
              className="flex-1 bg-[#f7f7f7] border border-[#e6e6e6] p-3.5 space-y-3 min-w-[220px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#e6e6e6]">
                <span className="text-xs font-bold text-[#262626] uppercase tracking-[0.5px] truncate">
                  {col.title}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white border border-[#cccccc] text-[#262626]">
                  {columnDrives.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="space-y-3 min-h-[300px]">
                {columnDrives.length === 0 ? (
                  <div className="h-28 border border-dashed border-[#cccccc] flex items-center justify-center text-[11px] text-[#9a9a9a] italic">
                    No drives in this stage
                  </div>
                ) : (
                  columnDrives.map((drive) => (
                    <div
                      key={drive.id}
                      onClick={() => onSelectDrive(drive.id)}
                      className="group p-3.5 bg-white border border-[#e6e6e6] hover:border-[#1c69d4] transition-all duration-200 cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-[#262626] group-hover:text-[#1c69d4] transition-colors">
                            {drive.company_name}
                          </h4>
                          <p className="text-[11px] text-[#3c3c3c] font-light line-clamp-1">
                            {drive.role_title}
                          </p>
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6]">
                          {drive.company_type}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#6b6b6b]">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-[#9a9a9a]" />
                          {drive.is_overdue
                            ? "Closed"
                            : drive.days_left === 0
                            ? "Today"
                            : `${drive.days_left}d left`}
                        </span>
                      </div>

                      {/* Advance Stage button */}
                      {col.id !== "offer" && (
                        <div
                          className="pt-2 border-t border-[#e6e6e6] flex items-center justify-between text-[10px] font-bold uppercase tracking-[1.5px] text-[#1c69d4] hover:text-[#0653b6]"
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
                        >
                          <span>Move Next</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
