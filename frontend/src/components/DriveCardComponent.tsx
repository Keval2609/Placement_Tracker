import React, { useState } from "react";
import { Clock, ChevronRight, Loader2, CalendarCheck } from "lucide-react";
import { ApplicationStatus, DriveCard } from "../types/drive";
import { updateApplicationStatus } from "../services/api";

interface DriveCardComponentProps {
  drive: DriveCard;
  onSelectDrive: (driveId: string) => void;
  onStatusUpdated?: () => void;
}

const STATUS_OPTIONS: { id: ApplicationStatus; label: string }[] = [
  { id: "not_applied", label: "Not Applied" },
  { id: "applied", label: "Applied" },
  { id: "oa", label: "OA Stage" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer 🎉" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

export const DriveCardComponent: React.FC<DriveCardComponentProps> = ({
  drive,
  onSelectDrive,
  onStatusUpdated,
}) => {
  const [currentStatus, setCurrentStatus] = useState<ApplicationStatus>(drive.application_status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newStatus = e.target.value as ApplicationStatus;
    setIsUpdatingStatus(true);

    try {
      await updateApplicationStatus(drive.application_id, newStatus);
      setCurrentStatus(newStatus);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: unknown) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDaysLeft = () => {
    if (drive.is_overdue) {
      const absDays = Math.abs(drive.days_left);
      return {
        label: `Closed (${absDays} ${absDays === 1 ? "day" : "days"} ago)`,
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
      label: `${drive.days_left} ${drive.days_left === 1 ? "day" : "days"} left`,
      style: "bg-[#eff6ff] text-[#1c69d4] border-[#bfdbfe] font-medium",
    };
  };

  const daysChip = formatDaysLeft();

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
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
      case "withdrawn":
        return { label: "Withdrawn", style: "bg-[#f7f7f7] text-[#6b6b6b] border-[#e6e6e6]" };
      default:
        return { label: "Not Applied", style: "bg-[#f7f7f7] text-[#6b6b6b] border-[#e6e6e6]" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      onClick={() => onSelectDrive(drive.id)}
      className={`group relative overflow-hidden bg-white border transition-all duration-200 cursor-pointer space-y-4 p-5 ${
        drive.is_overdue
          ? "border-[#e6e6e6] opacity-80 hover:opacity-100 hover:border-[#cccccc]"
          : "border-[#e6e6e6] hover:border-[#1c69d4]"
      }`}
    >
      {/* Top Header Row */}
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
          </div>
        </div>

        {/* Days Left Chip */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs px-2.5 py-1 border inline-flex items-center gap-1.5 ${daysChip.style}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{daysChip.label}</span>
          </span>
        </div>
      </div>

      {/* Recruitment Funnel Stepper */}
      <div className="pt-2">
        <div className="text-[10px] font-bold text-[#6b6b6b] uppercase tracking-[1.5px] mb-2 flex items-center justify-between">
          <span>Recruitment Funnel</span>
          <span className={`px-2 py-0.5 text-[10px] border ${statusBadge.style}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 items-center">
          {["Applied", "OA Test", "Interview", "Offer"].map((step, idx) => {
            const currentIdx =
              currentStatus === "offer"
                ? 3
                : currentStatus === "interview"
                ? 2
                : currentStatus === "oa"
                ? 1
                : currentStatus === "applied"
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

      {/* Bottom Controls & Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#e6e6e6] text-xs">
        <div className="text-[#6b6b6b] font-mono text-[11px] flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5 text-[#9a9a9a]" />
          <span>Deadline: {formatDate(drive.primary_deadline_iso)}</span>
        </div>

        {/* Inline Application Status Dropdown */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b6b]">Stage:</label>
            <div className="relative">
              <select
                value={currentStatus}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
                className="text-xs font-semibold px-2.5 py-1 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4] cursor-pointer disabled:opacity-50 transition-colors"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-white text-[#262626]">
                    {opt.label}
                  </option>
                ))}
              </select>
              {isUpdatingStatus && (
                <Loader2 className="w-3 h-3 animate-spin text-[#1c69d4] absolute right-2 top-2" />
              )}
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[1.5px] text-[#1c69d4] group-hover:text-[#0653b6] transition-colors">
            View <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
};
