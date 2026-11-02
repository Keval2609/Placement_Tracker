import React from "react";
import {
  MapPin,
  Clock,
  ChevronRight,
  GraduationCap,
  FileText
} from "lucide-react";
import { PrototypeDrive } from "./mockData";

interface PrototypeDriveCardProps {
  drive: PrototypeDrive;
  onSelect: (drive: PrototypeDrive) => void;
  onStatusChange: (driveId: string, status: PrototypeDrive["application_status"]) => void;
}

export const PrototypeDriveCard: React.FC<PrototypeDriveCardProps> = ({
  drive,
  onSelect,
  onStatusChange,
}) => {
  const getUrgencyChip = () => {
    const isPipelineActive = ["applied", "oa", "interview"].includes(drive.application_status);
    if (drive.is_overdue) {
      if (isPipelineActive) {
        return {
          label: "In Pipeline (Closed)",
          style: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold",
        };
      }
      return {
        label: "Closed / Ended",
        style: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
      };
    }

    if (drive.application_status !== "not_applied") {
      const daysText =
        drive.days_left === 0
          ? "Closes Today"
          : `${drive.days_left}d left`;
      return {
        label: `Applied (${daysText})`,
        style: "bg-blue-50 dark:bg-blue-950/40 text-[#1c69d4] dark:text-blue-300 border-blue-200 dark:border-blue-900/60 font-semibold",
      };
    }

    if (drive.days_left === 0) {
      return {
        label: "Closes Today",
        style: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 font-bold animate-pulse",
      };
    }
    if (drive.days_left <= 2) {
      return {
        label: `${drive.days_left}d left`,
        style: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 font-bold",
      };
    }
    return {
      label: `${drive.days_left} days left`,
      style: "bg-blue-50 dark:bg-blue-950/40 text-[#1c69d4] dark:text-blue-400 border-blue-200 dark:border-blue-900 font-medium",
    };
  };

  const urgency = getUrgencyChip();

  const getStatusBadge = () => {
    switch (drive.application_status) {
      case "offer":
        return { label: "Offer Accepted 🎉", style: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold" };
      case "interview":
        return { label: "Interview Round", style: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold" };
      case "oa":
        return { label: "OA Test Scheduled", style: "bg-blue-50 dark:bg-blue-950/40 text-[#1c69d4] dark:text-blue-400 border-blue-200 dark:border-blue-900 font-semibold" };
      case "applied":
        return { label: "Applied", style: "bg-blue-50 dark:bg-blue-950/40 text-[#1c69d4] dark:text-blue-400 border-blue-200 dark:border-blue-900 font-semibold" };
      case "rejected":
        return { label: "Not Selected", style: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 font-medium" };
      default:
        return { label: "Not Applied", style: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 font-medium" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      onClick={() => onSelect(drive)}
      className="group relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-[#1c69d4] dark:hover:border-blue-500 p-5 rounded-md transition-all duration-200 cursor-pointer space-y-4 shadow-xs hover:shadow-sm"
    >
      {/* Top row: Company Avatar + Name/Role + CTC Pill (Defensive flex layout) */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* BMW Dark Navy Monogram Avatar */}
          <div className="w-11 h-11 bg-[#1a2129] border border-[#262e38] rounded-md flex items-center justify-center font-bold text-white text-sm shrink-0">
            {drive.company_name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-[#1c69d4] dark:group-hover:text-blue-400 transition-colors tracking-tight truncate">
                {drive.company_name}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                {drive.company_type}
              </span>
            </div>

            <p className="text-xs text-neutral-700 dark:text-neutral-300 font-light truncate">
              {drive.role_title}
            </p>

            <div className="flex items-center gap-3 text-[11px] text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                <span className="truncate">{drive.location}</span>
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 shrink-0">
                <GraduationCap className="w-3 h-3 text-[#1c69d4] dark:text-blue-400" />
                CGPA ≥ {drive.min_cgpa ?? "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* CTC Tag - Defensive bounded width to avoid overflowing */}
        <div className="text-right shrink-0 max-w-[42%]">
          <div className="inline-block px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-[#1c69d4] dark:text-blue-400 font-bold text-xs sm:text-sm tracking-tight rounded-md whitespace-nowrap">
            {drive.ctc_display}
          </div>
          {drive.base_salary && (
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono truncate" title={drive.base_salary}>
              {drive.base_salary}
            </p>
          )}
        </div>
      </div>

      {/* Recruitment Stage Stepper Tracker */}
      <div className="pt-2">
        <div className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-[1.5px] mb-2 flex items-center justify-between">
          <span>Hiring Funnel Progress</span>
          <span className={`px-2 py-0.5 text-[10px] border rounded-sm ${statusBadge.style}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Progress step bars */}
        <div className="grid grid-cols-4 gap-1 items-center">
          {["Applied", "OA Test", "Interview", "Offer"].map((step, idx) => {
            const currentIdx =
              drive.application_status === "offer"
                ? 3
                : drive.application_status === "interview"
                ? 2
                : drive.application_status === "oa"
                ? 1
                : drive.application_status === "applied"
                ? 0
                : -1;

            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;

            return (
              <div key={step} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isCompleted
                      ? "bg-emerald-500 dark:bg-emerald-400"
                      : isCurrent
                      ? "bg-[#1c69d4] dark:bg-blue-500"
                      : "bg-neutral-200 dark:bg-neutral-800"
                  }`}
                />
                <span
                  className={`text-[9px] block truncate text-center uppercase tracking-wider ${
                    isCurrent
                      ? "text-[#1c69d4] dark:text-blue-400 font-bold"
                      : isCompleted
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-neutral-400 dark:text-neutral-500 font-light"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Eligible Branches & Deadline info */}
      <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Branches tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {drive.eligible_branches.map((b) => (
            <span
              key={b}
              className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
            >
              {b}
            </span>
          ))}
          {drive.documents.length > 0 && (
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 inline-flex items-center gap-1 ml-1">
              <FileText className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              {drive.documents.length} files
            </span>
          )}
        </div>

        {/* Quick status selector & Deadline urgency */}
        <div className="flex items-center gap-2.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <select
            value={drive.application_status}
            onChange={(e) => onStatusChange(drive.id, e.target.value as PrototypeDrive["application_status"])}
            className="text-xs font-semibold px-2 py-1 rounded-sm bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-[#1c69d4] dark:focus:border-blue-400 cursor-pointer"
          >
            <option value="not_applied">Not Applied</option>
            <option value="applied">Applied</option>
            <option value="oa">OA Stage</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer 🎉</option>
            <option value="rejected">Rejected</option>
          </select>

          <span className={`px-2 py-0.5 text-xs border rounded-sm inline-flex items-center gap-1.5 ${urgency.style}`}>
            <Clock className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">{urgency.label}</span>
          </span>

          <span className="inline-flex items-center gap-0.5 text-xs font-bold uppercase tracking-[1.5px] text-[#1c69d4] dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            View <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
};
