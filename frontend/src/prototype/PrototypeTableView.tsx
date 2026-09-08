import React from "react";
import { PrototypeDrive } from "./mockData";
import { ChevronRight, Clock } from "lucide-react";

interface PrototypeTableViewProps {
  drives: PrototypeDrive[];
  onSelect: (drive: PrototypeDrive) => void;
}

export const PrototypeTableView: React.FC<PrototypeTableViewProps> = ({
  drives,
  onSelect,
}) => {
  return (
    <div className="overflow-hidden border border-[#e6e6e6] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#262626]">
          <thead className="bg-[#f7f7f7] border-b border-[#e6e6e6] text-[11px] uppercase tracking-[1.5px] text-[#262626] font-bold">
            <tr>
              <th className="py-3.5 px-4">Company & Role</th>
              <th className="py-3.5 px-4">Package (CTC)</th>
              <th className="py-3.5 px-4">Min CGPA</th>
              <th className="py-3.5 px-4">Current Stage</th>
              <th className="py-3.5 px-4">Deadline</th>
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
                    onClick={() => onSelect(drive)}
                    className="hover:bg-[#fafafa] transition-colors cursor-pointer group"
                  >
                    {/* Company & Role */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#262626] group-hover:text-[#1c69d4] transition-colors flex items-center gap-2">
                        <span>{drive.company_name}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6]">
                          {drive.company_type}
                        </span>
                      </div>
                      <div className="text-[11px] font-light text-[#3c3c3c]">
                        {drive.role_title}
                      </div>
                    </td>

                    {/* CTC */}
                    <td className="py-3 px-4 font-mono font-bold text-[#1c69d4]">
                      {drive.ctc_display}
                    </td>

                    {/* CGPA */}
                    <td className="py-3 px-4 font-mono text-[#262626]">
                      ≥ {drive.min_cgpa ?? "Open"}
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
                    <td className="py-3 px-4">
                      <div
                        className={`inline-flex items-center gap-1 font-medium ${
                          isUrgent ? "text-[#b45309] font-bold" : "text-[#6b6b6b]"
                        }`}
                      >
                        <Clock className="w-3 h-3 text-[#9a9a9a]" />
                        <span>{drive.primary_deadline}</span>
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
