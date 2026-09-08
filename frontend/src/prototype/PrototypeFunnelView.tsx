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
              className="flex-1 bg-[#f7f7f7] border border-[#e6e6e6] p-3.5 space-y-3 min-w-[230px]"
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

              {/* Cards in Column */}
              <div className="space-y-3 min-h-[350px]">
                {columnDrives.length === 0 ? (
                  <div className="h-32 border border-dashed border-[#cccccc] flex items-center justify-center text-[11px] text-[#9a9a9a] italic">
                    No drives in this stage
                  </div>
                ) : (
                  columnDrives.map((drive) => (
                    <div
                      key={drive.id}
                      onClick={() => onSelect(drive)}
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
                        <span className="text-[10px] font-mono font-bold text-[#1c69d4] px-1.5 py-0.5 bg-[#eff6ff] border border-[#bfdbfe]">
                          {drive.ctc_display.split(" ")[0]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#6b6b6b]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-[#9a9a9a]" />
                          {drive.location.split("/")[0]}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 ${
                            drive.days_left <= 2
                              ? "bg-[#fffbeb] text-[#b45309] font-bold border border-[#fde68a]"
                              : "bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6]"
                          }`}
                        >
                          {drive.days_left <= 0 ? "Today" : `${drive.days_left}d left`}
                        </span>
                      </div>

                      {/* Quick Move Button */}
                      {col.id !== "offer" && (
                        <div
                          className="pt-2 border-t border-[#e6e6e6] flex items-center justify-between text-[10px] font-bold uppercase tracking-[1.5px] text-[#1c69d4] hover:text-[#0653b6]"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextMap: Record<string, PrototypeDrive["application_status"]> = {
                              not_applied: "applied",
                              applied: "oa",
                              oa: "interview",
                              interview: "offer",
                            };
                            const next = nextMap[col.id];
                            if (next) onAdvanceStage(drive.id, next);
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
