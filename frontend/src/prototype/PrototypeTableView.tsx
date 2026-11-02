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
    <div className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-neutral-800 dark:text-neutral-200">
          <thead className="bg-neutral-50 dark:bg-neutral-800/70 border-b border-neutral-200 dark:border-neutral-800 text-[11px] uppercase tracking-[1.5px] text-neutral-700 dark:text-neutral-300 font-bold">
            <tr>
              <th className="py-3.5 px-4">Company & Role</th>
              <th className="py-3.5 px-4">Package (CTC)</th>
              <th className="py-3.5 px-4">Min CGPA</th>
              <th className="py-3.5 px-4">Current Stage</th>
              <th className="py-3.5 px-4">Deadline</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {drives.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 dark:text-neutral-500 italic">
                  No placement drives match your active filters.
                </td>
              </tr>
            ) : (
              drives.map((drive) => {
                const isUrgent =
                  !drive.is_overdue &&
                  drive.days_left <= 2 &&
                  drive.application_status === "not_applied";
                return (
                  <tr
                    key={drive.id}
                    onClick={() => onSelect(drive)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Company & Role */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-[#1c69d4] dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                        <span>{drive.company_name}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                          {drive.company_type}
                        </span>
                      </div>
                      <div className="text-[11px] font-light text-neutral-600 dark:text-neutral-400">
                        {drive.role_title}
                      </div>
                    </td>

                    {/* CTC */}
                    <td className="py-3 px-4 font-mono font-bold text-[#1c69d4] dark:text-blue-400">
                      {drive.ctc_display}
                    </td>

                    {/* CGPA */}
                    <td className="py-3 px-4 font-mono text-neutral-800 dark:text-neutral-200">
                      ≥ {drive.min_cgpa ?? "Open"}
                    </td>

                    {/* Stage */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border ${
                          drive.application_status === "offer"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : drive.application_status === "interview"
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : drive.application_status === "oa"
                            ? "bg-blue-50 dark:bg-blue-950/40 text-[#1c69d4] dark:text-blue-400 border-blue-200 dark:border-blue-900"
                            : drive.application_status === "applied"
                            ? "bg-blue-50 dark:bg-blue-950/40 text-[#1c69d4] dark:text-blue-400 border-blue-200 dark:border-blue-900"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                        }`}
                      >
                        {drive.application_status.toUpperCase().replace("_", " ")}
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="py-3 px-4">
                      <div
                        className={`inline-flex items-center gap-1 font-medium ${
                          isUrgent ? "text-amber-700 dark:text-amber-400 font-bold" : "text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        <Clock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                        <span>{drive.primary_deadline}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-[#1c69d4] dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 font-bold uppercase tracking-[1.5px] transition-colors">
                        View <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
