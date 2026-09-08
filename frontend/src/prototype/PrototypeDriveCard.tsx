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
    if (drive.is_overdue) {
      return {
        label: "Closed / Ended",
        style: "bg-[#f7f7f7] text-[#6b6b6b] border-[#e6e6e6]",
      };
    }
    if (drive.days_left === 0) {
      return {
        label: "Closes Today",
        style: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca] font-bold animate-pulse",
      };
    }
    if (drive.days_left <= 2) {
      return {
        label: `${drive.days_left}d left`,
        style: "bg-[#fffbeb] text-[#b45309] border-[#fde68a] font-bold",
      };
    }
    return {
      label: `${drive.days_left} days left`,
      style: "bg-[#eff6ff] text-[#1c69d4] border-[#bfdbfe] font-medium",
    };
  };

  const urgency = getUrgencyChip();

  const getStatusBadge = () => {
    switch (drive.application_status) {
      case "offer":
        return { label: "Offer Accepted 🎉", style: "bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]" };
      case "interview":
        return { label: "Interview Round", style: "bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]" };
      case "oa":
        return { label: "OA Test Scheduled", style: "bg-[#eff6ff] text-[#1c69d4] border-[#bfdbfe]" };
      case "applied":
        return { label: "Applied", style: "bg-[#eff6ff] text-[#1c69d4] border-[#bfdbfe]" };
      case "rejected":
        return { label: "Not Selected", style: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]" };
      default:
        return { label: "Not Applied", style: "bg-[#f7f7f7] text-[#6b6b6b] border-[#e6e6e6]" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      onClick={() => onSelect(drive)}
      className="group relative overflow-hidden bg-white border border-[#e6e6e6] hover:border-[#1c69d4] p-5 transition-all duration-200 cursor-pointer space-y-4"
    >
      {/* Top row: Company Avatar + Name/Role + CTC Pill */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          {/* BMW Dark Navy Monogram Avatar */}
          <div className="w-11 h-11 bg-[#1a2129] border border-[#262e38] flex items-center justify-center font-bold text-white text-sm shrink-0">
            {drive.company_name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#262626] group-hover:text-[#1c69d4] transition-colors tracking-tight">
                {drive.company_name}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-[1px] px-2 py-0.5 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6]">
                {drive.company_type}
              </span>
            </div>

            <p className="text-xs text-[#3c3c3c] font-light line-clamp-1">
              {drive.role_title}
            </p>

            <div className="flex items-center gap-3 text-[11px] text-[#6b6b6b]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#9a9a9a]" />
                {drive.location}
              </span>
              <span className="text-[#cccccc]">•</span>
              <span className="flex items-center gap-1 text-[#6b6b6b]">
                <GraduationCap className="w-3 h-3 text-[#1c69d4]" />
                CGPA ≥ {drive.min_cgpa ?? "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* CTC Tag */}
        <div className="text-right shrink-0">
          <div className="inline-block px-3 py-1 bg-[#eff6ff] border border-[#bfdbfe] text-[#1c69d4] font-bold text-sm tracking-tight">
            {drive.ctc_display}
          </div>
          {drive.base_salary && (
            <p className="text-[10px] text-[#6b6b6b] mt-1 font-mono">
              {drive.base_salary}
            </p>
          )}
        </div>
      </div>

      {/* Recruitment Stage Stepper Tracker */}
      <div className="pt-2">
        <div className="text-[10px] font-bold text-[#6b6b6b] uppercase tracking-[1.5px] mb-2 flex items-center justify-between">
          <span>Hiring Funnel Progress</span>
          <span className={`px-2 py-0.5 text-[10px] border ${statusBadge.style}`}>
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
                  className={`h-1.5 transition-all ${
                    isCompleted
                      ? "bg-[#22c55e]"
                      : isCurrent
                      ? "bg-[#1c69d4]"
                      : "bg-[#e6e6e6]"
                  }`}
                />
                <span
                  className={`text-[9px] block truncate text-center uppercase tracking-wider ${
                    isCurrent
                      ? "text-[#1c69d4] font-bold"
                      : isCompleted
                      ? "text-[#22c55e] font-medium"
                      : "text-[#9a9a9a] font-light"
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
      <div className="pt-3 border-t border-[#e6e6e6] flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Branches tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {drive.eligible_branches.map((b) => (
            <span
              key={b}
              className="text-[10px] font-mono px-2 py-0.5 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6]"
            >
              {b}
            </span>
          ))}
          {drive.documents.length > 0 && (
            <span className="text-[10px] text-[#6b6b6b] inline-flex items-center gap-1 ml-1">
              <FileText className="w-3 h-3 text-[#9a9a9a]" />
              {drive.documents.length} files
            </span>
          )}
        </div>

        {/* Quick status selector & Deadline urgency */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <select
            value={drive.application_status}
            onChange={(e) => onStatusChange(drive.id, e.target.value as PrototypeDrive["application_status"])}
            className="text-xs font-semibold px-2 py-1 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4] cursor-pointer"
          >
            <option value="not_applied">Not Applied</option>
            <option value="applied">Applied</option>
            <option value="oa">OA Stage</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer 🎉</option>
            <option value="rejected">Rejected</option>
          </select>

          <span className={`px-2.5 py-1 text-xs border inline-flex items-center gap-1.5 ${urgency.style}`}>
            <Clock className="w-3 h-3" />
            <span>{urgency.label}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[1.5px] text-[#1c69d4] group-hover:text-[#0653b6] transition-colors">
            View <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
};
