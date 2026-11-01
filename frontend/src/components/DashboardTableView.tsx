import React from "react";
import { DriveCard } from "../types/drive";
import { ChevronRight, Clock } from "lucide-react";
import { cn } from "../lib/utils";

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
    <div className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg shadow-xs">
      <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bmw-primary">
        <table className="w-full text-left text-xs text-neutral-800 dark:text-neutral-200" aria-label="Placement Drives Table">
          <thead className="bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider text-neutral-700 dark:text-neutral-300 font-bold">
            <tr>
              <th scope="col" className="py-3.5 px-4">Company & Role</th>
              <th scope="col" className="py-3.5 px-4">Type</th>
              <th scope="col" className="py-3.5 px-4">Stage</th>
              <th scope="col" className="py-3.5 px-4">Deadline</th>
              <th scope="col" className="py-3.5 px-4">Time Left</th>
              <th scope="col" className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {drives.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-500 dark:text-neutral-400 italic">
                  No placement drives match your active filters.
                </td>
              </tr>
            ) : (
              drives.map((drive) => {
                const isUrgent = !drive.is_overdue && drive.days_left <= 2;
                return (
                  <tr
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
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 focus-visible:bg-blue-50/50 dark:focus-visible:bg-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bmw-primary transition-colors cursor-pointer group"
                  >
                    {/* Company & Role */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900 dark:text-white group-hover:text-bmw-primary transition-colors">
                        {drive.company_name}
                      </div>
                      <div className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
                        {drive.role_title}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 uppercase font-semibold">
                      {drive.company_type}
                    </td>

                    {/* Stage */}
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border rounded-sm",
                          drive.application_status === "offer"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : drive.application_status === "interview"
                            ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : drive.application_status === "oa"
                            ? "bg-blue-50 dark:bg-blue-950/40 text-bmw-primary dark:text-blue-400 border-blue-200 dark:border-blue-900"
                            : drive.application_status === "applied"
                            ? "bg-blue-50 dark:bg-blue-950/40 text-bmw-primary dark:text-blue-400 border-blue-200 dark:border-blue-900"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                        )}
                      >
                        {drive.application_status.toUpperCase().replace("_", " ")}
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="py-3 px-4 font-mono text-neutral-700 dark:text-neutral-300 text-xs">
                      {formatDate(drive.primary_deadline_iso)}
                    </td>

                    {/* Time Left */}
                    <td className="py-3 px-4">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 font-medium",
                          isUrgent ? "text-amber-700 dark:text-amber-400 font-bold" : "text-neutral-600 dark:text-neutral-400"
                        )}
                      >
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
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
                      <span className="inline-flex items-center gap-1 text-xs text-bmw-primary dark:text-blue-400 group-hover:text-bmw-primary-active font-bold uppercase tracking-wider">
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
