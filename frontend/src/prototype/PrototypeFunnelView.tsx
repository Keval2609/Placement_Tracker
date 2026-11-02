import React from "react";
import { PrototypeDrive } from "./mockData";
import { MapPin, ArrowRight } from "lucide-react";

interface PrototypeFunnelViewProps {
  drives: PrototypeDrive[];
  onSelect: (drive: PrototypeDrive) => void;
  onAdvanceStage: (driveId: string, nextStatus: PrototypeDrive["application_status"]) => void;
}

const COLUMNS: {
  id: PrototypeDrive["application_status"];
  title: string;
}[] = [
  { id: "not_applied", title: "Eligible & Not Applied" },
  { id: "applied", title: "Applications Submitted" },
  { id: "oa", title: "Online Assessment (OA)" },
  { id: "interview", title: "Interviews In Progress" },
  { id: "offer", title: "Offers Secured" },
];

export const PrototypeFunnelView: React.FC<PrototypeFunnelViewProps> = ({
  drives,
  onSelect,
  onAdvanceStage,
}) => {
  return (
    <div className="overflow-x-auto pb-4 pt-1">
      <div className="flex items-start gap-4 min-w-[1200px]">
        {COLUMNS.map((col) => {
          const columnDrives = drives.filter((d) => d.application_status === col.id);

          return (
            <div
              key={col.id}
              className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 rounded-lg space-y-3 min-w-[230px] transition-colors"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-[0.5px] truncate">
                  {col.title}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200">
                  {columnDrives.length}
                </span>
              </div>

              {/* Cards in Column */}
              <div className="space-y-3 min-h-[350px]">
                {columnDrives.length === 0 ? (
                  <div className="h-32 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[11px] text-neutral-400 dark:text-neutral-500 italic">
                    No drives in this stage
                  </div>
                ) : (
                  columnDrives.map((drive) => (
                    <div
                      key={drive.id}
                      onClick={() => onSelect(drive)}
                      className="group p-3.5 rounded-md bg-white dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700/80 hover:border-[#1c69d4] dark:hover:border-blue-400 transition-all duration-200 cursor-pointer space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-[#1c69d4] dark:group-hover:text-blue-400 transition-colors truncate">
                            {drive.company_name}
                          </h4>
                          <p className="text-[11px] text-neutral-600 dark:text-neutral-300 font-light truncate">
                            {drive.role_title}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#1c69d4] dark:text-blue-400 px-1.5 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 shrink-0">
                          {drive.ctc_display.split(" ")[0]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
                        <span className="flex items-center gap-1 truncate max-w-[110px]">
                          <MapPin className="w-2.5 h-2.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                          <span className="truncate">{drive.location.split("/")[0]}</span>
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded-sm ${
                            col.id === "not_applied" && drive.days_left <= 2
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-900"
                              : "bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600"
                          }`}
                        >
                          {drive.days_left <= 0 ? "Today" : `${drive.days_left}d left`}
                        </span>
                      </div>

                      {/* Quick Move Button */}
                      {col.id !== "offer" && (
                        <div
                          className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-[10px] font-bold uppercase tracking-[1.5px] text-[#1c69d4] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextMap: Record<string, PrototypeDrive["application_status"]> = {
                              not_applied: "applied",
                              applied: "oa",
                              oa: "interview",
                              interview: "offer",
                            };
                            const next = nextMap[drive.application_status];
                            if (next) onAdvanceStage(drive.id, next);
                          }}
                        >
                          <span>Move to Next Stage</span>
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
