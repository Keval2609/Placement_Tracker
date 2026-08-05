import React, { useState } from "react";
import { Building2, Clock, ChevronRight, Loader2, CalendarCheck } from "lucide-react";
import { ApplicationStatus, DriveCard } from "../types/drive";
import { updateApplicationStatus } from "../services/api";

interface DriveCardComponentProps {
  drive: DriveCard;
  onSelectDrive: (driveId: string) => void;
  onStatusUpdated?: () => void;
}

const COMPANY_TYPE_STYLES: Record<string, { label: string; style: string }> = {
  product: { label: "Product", style: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  startup: { label: "Startup", style: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  service: { label: "Service", style: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  psu: { label: "PSU", style: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  unknown: { label: "Unknown", style: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

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

  const typeBadge = COMPANY_TYPE_STYLES[drive.company_type] || COMPANY_TYPE_STYLES.unknown;

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
        style: "bg-red-500/20 text-red-300 border-red-500/30",
      };
    }
    if (drive.days_left === 0) {
      return {
        label: "Deadline Today!",
        style: "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse font-bold",
      };
    }
    return {
      label: `${drive.days_left} ${drive.days_left === 1 ? "day" : "days"} left`,
      style: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-medium",
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

  return (
    <div
      onClick={() => onSelectDrive(drive.id)}
      className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer shadow-lg hover:shadow-indigo-500/10 space-y-4 group ${
        drive.is_overdue
          ? "bg-slate-950/60 border-slate-800/80 opacity-75 hover:opacity-100 hover:border-slate-700"
          : "bg-slate-900 border-slate-800 hover:border-indigo-500/50"
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              {drive.company_name}
            </h3>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeBadge.style}`}
            >
              {typeBadge.label}
            </span>
          </div>

          <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{drive.role_title}</span>
          </div>
        </div>

        {/* Days Left Chip */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${daysChip.style}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{daysChip.label}</span>
          </span>

          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* Bottom Controls & Status Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
          <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Deadline: {formatDate(drive.primary_deadline_iso)}</span>
        </div>

        {/* Inline Application Status Dropdown */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <label className="text-[11px] font-medium text-slate-400">Status:</label>
          <div className="relative">
            <select
              value={currentStatus}
              onChange={handleStatusChange}
              disabled={isUpdatingStatus}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-slate-900 text-slate-100">
                  {opt.label}
                </option>
              ))}
            </select>
            {isUpdatingStatus && (
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400 absolute right-2 top-2" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
