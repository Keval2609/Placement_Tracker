import React, { useState } from "react";
import { Clock, ChevronRight, Loader2, CalendarCheck, MapPin } from "lucide-react";
import { ApplicationStatus, DriveCard } from "../types/drive";
import { updateApplicationStatus } from "../services/api";
import { cn } from "../lib/utils";

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
    const isPipelineActive = ["applied", "oa", "interview"].includes(currentStatus);
    if (drive.is_overdue) {
      if (isPipelineActive) {
        return {
          label: "In Pipeline (Closed)",
          style: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold",
        };
      }
      const absDays = Math.abs(drive.days_left);
      return {
        label: `Closed (${absDays} ${absDays === 1 ? "day" : "days"} ago)`,
        style: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 font-medium",
      };
    }

    if (drive.days_left === 0) {
      return {
        label: "Closes Today",
        style: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 font-bold motion-safe:animate-pulse",
      };
    }
    if (drive.days_left <= 2) {
      return {
        label: `${drive.days_left}d left`,
        style: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900 font-bold",
      };
    }
    return {
      label: `${drive.days_left} ${drive.days_left === 1 ? "day" : "days"} left`,
      style: "bg-blue-50 dark:bg-blue-950/40 text-bmw-primary dark:text-blue-400 border-blue-200 dark:border-blue-900 font-semibold",
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
        return { label: "Offer Accepted 🎉", style: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold" };
      case "interview":
        return { label: "Interview Round", style: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold" };
      case "oa":
        return { label: "OA Test Scheduled", style: "bg-blue-50 dark:bg-blue-950/40 text-bmw-primary dark:text-blue-400 border-blue-200 dark:border-blue-900 font-semibold" };
      case "applied":
        return { label: "Applied", style: "bg-blue-50 dark:bg-blue-950/40 text-bmw-primary dark:text-blue-400 border-blue-200 dark:border-blue-900 font-semibold" };
      case "rejected":
        return { label: "Not Selected", style: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 font-medium" };
      case "withdrawn":
        return { label: "Withdrawn", style: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 font-medium" };
      default:
        return { label: "Not Applied", style: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 font-medium" };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View placement drive details for ${drive.company_name}, ${drive.role_title}`}
      onClick={() => onSelectDrive(drive.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectDrive(drive.id);
        }
      }}
      className={cn(
        "group relative overflow-hidden bg-white dark:bg-neutral-900 border transition-all duration-200 cursor-pointer space-y-4 p-5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary focus-visible:ring-offset-2",
        drive.is_overdue
          ? "border-neutral-200 dark:border-neutral-800 opacity-90 hover:opacity-100 hover:border-neutral-400 dark:hover:border-neutral-700"
          : "border-neutral-200 dark:border-neutral-800 hover:border-bmw-primary dark:hover:border-bmw-primary shadow-xs hover:shadow-sm"
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          {/* Monogram Avatar */}
          <div className="w-11 h-11 bg-bmw-surface-dark border border-neutral-800 rounded-md flex items-center justify-center font-bold text-white text-sm shrink-0">
            {drive.company_name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-bmw-body-strong dark:text-white group-hover:text-bmw-primary transition-colors tracking-tight truncate">
                {drive.company_name}
              </h3>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                {drive.company_type}
              </span>
            </div>

            <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium truncate">
              {drive.role_title}
            </p>

            <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center gap-1 font-medium truncate">
                <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">{drive.location || "Campus / Remote"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Stack: CTC + Days Left */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 max-w-[42%]">
          <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-bmw-primary dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-bold text-xs rounded-sm tracking-tight truncate">
            {drive.ctc_display || "Not Disclosed"}
          </span>

          <span
            className={cn(
              "text-xs px-2.5 py-0.5 border rounded-sm inline-flex items-center gap-1.5",
              daysChip.style
            )}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">{daysChip.label}</span>
          </span>
        </div>
      </div>

      {/* Recruitment Funnel Stepper */}
      <div className="pt-1">
        <div className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Recruitment Funnel</span>
          <span className={cn("px-2 py-0.5 text-[11px] border rounded-sm", statusBadge.style)}>
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
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    isCompleted
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-bmw-primary"
                      : "bg-neutral-200 dark:bg-neutral-800"
                  )}
                />
                <span
                  className={cn(
                    "text-[11px] block truncate text-center uppercase tracking-wider",
                    isCurrent
                      ? "text-bmw-primary dark:text-blue-400 font-bold"
                      : isCompleted
                      ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                      : "text-neutral-500 dark:text-neutral-400 font-medium"
                  )}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls & Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 text-xs">
        <div className="text-neutral-600 dark:text-neutral-400 font-mono text-[11px] flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5 text-neutral-500" />
          <span>Deadline: {formatDate(drive.primary_deadline_iso)}</span>
        </div>

        {/* Inline Application Status Dropdown */}
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <label htmlFor={`status-select-${drive.id}`} className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
              Stage:
            </label>
            <div className="relative">
              <select
                id={`status-select-${drive.id}`}
                aria-label={`Update recruitment stage for ${drive.company_name}`}
                value={currentStatus}
                onChange={handleStatusChange}
                disabled={isUpdatingStatus}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-bmw-primary focus:border-bmw-primary cursor-pointer disabled:opacity-50 transition-colors"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    {opt.label}
                  </option>
                ))}
              </select>
              {isUpdatingStatus && (
                <Loader2 className="w-3 h-3 animate-spin text-bmw-primary absolute right-2 top-2" />
              )}
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-bmw-primary group-hover:text-bmw-primary-active transition-colors">
            View <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
};
