import React from "react";
import { DriveCard } from "../types/drive";
import { ChevronRight, Clock } from "lucide-react";

interface DashboardTableViewProps {
  drives: DriveCard[];
  onSelectDrive: (driveId: string) => void;
}

export const DashboardTableView: React.FC<DashboardTableViewProps> = ({
  drives,
  onSelectDrive,
}) => {
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="overflow-hidden border border-[#e6e6e6] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#262626]">
          <thead className="bg-[#f7f7f7] border-b border-[#e6e6e6] text-[11px] uppercase tracking-[1.5px] text-[#262626] font-bold">
            <tr>
              <th className="py-3.5 px-4">Company & Role</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Stage</th>
              <th className="py-3.5 px-4">Deadline</th>
              <th className="py-3.5 px-4">Time Left</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e6e6e6]">
            {drives.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#9a9a9a] italic">
                  No placement drives match your active filters.
                </td>
              </tr>
            ) : (
              drives.map((drive) => {
                const isUrgent = !drive.is_overdue && drive.days_left <= 2;
                return (
                  <tr
                    key={drive.id}
                    onClick={() => onSelectDrive(drive.id)}
                    className="hover:bg-[#fafafa] transition-colors cursor-pointer group"
                  >
                    {/* Company & Role */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262626] group-hover:text-[#1c69d4] transition-colors">
                        {drive.company_name}
                      </div>
                      <div className="text-[11px] font-light text-[#3c3c3c]">
                        {drive.role_title}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 font-mono text-[11px] text-[#6b6b6b] uppercase">
                      {drive.company_type}
                    </td>

                    {/* Stage */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          drive.application_status === "offer"
                            ? "bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]"
                            : drive.application_status === "interview"
                            ? "bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]"
                            : drive.application_status === "oa"
                            ? "bg-[#eff6ff] text-[#1c69d4] border-[#bfdbfe]"
                            : drive.application_status === "applied"
                            ? "bg-[#eff6ff] text-[#1c69d4] border-[#bfdbfe]"
                            : "bg-[#f7f7f7] text-[#6b6b6b] border-[#e6e6e6]"
                        }`}
                      >
                        {drive.application_status.toUpperCase().replace("_", " ")}
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="py-3 px-4 font-mono text-[#6b6b6b] text-[11px]">
                      {formatDate(drive.primary_deadline_iso)}
                    </td>

                    {/* Time Left */}
                    <td className="py-3 px-4">
                      <div
                        className={`inline-flex items-center gap-1 font-medium ${
                          isUrgent ? "text-[#b45309] font-bold" : "text-[#6b6b6b]"
                        }`}
                      >
                        <Clock className="w-3 h-3 text-[#9a9a9a]" />
                        <span>
                          {drive.is_overdue
                            ? "Closed"
                            : drive.days_left === 0
                            ? "Today"
                            : `${drive.days_left}d left`}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-[#1c69d4] group-hover:text-[#0653b6] font-bold uppercase tracking-[1.5px]">
                        View
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
