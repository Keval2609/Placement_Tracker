import React from "react";
import { Building2, Calendar, Plus, ExternalLink, Award } from "lucide-react";
import { DriveDetail } from "../types/drive";

interface DriveDetailHeaderProps {
  drive: DriveDetail;
  onOpenAddUpdate: () => void;
}

const COMPANY_TYPE_BADGES: Record<string, { label: string; style: string }> = {
  product: { label: "Product", style: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  startup: { label: "Startup", style: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  service: { label: "Service", style: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  psu: { label: "PSU", style: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  unknown: { label: "Unknown", style: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
};

const APP_STATUS_BADGES: Record<string, { label: string; style: string }> = {
  not_applied: { label: "Not Applied", style: "bg-slate-800 text-slate-300 border-slate-700" },
  applied: { label: "Applied", style: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  oa: { label: "OA Stage", style: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  interview: { label: "Interviewing", style: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  offer: { label: "Offer Received 🎉", style: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold" },
  rejected: { label: "Rejected", style: "bg-red-500/20 text-red-300 border-red-500/30" },
  withdrawn: { label: "Withdrawn", style: "bg-slate-700 text-slate-400 border-slate-600" },
};

export const DriveDetailHeader: React.FC<DriveDetailHeaderProps> = ({
  drive,
  onOpenAddUpdate,
}) => {
  const companyBadge = COMPANY_TYPE_BADGES[drive.company_type] || COMPANY_TYPE_BADGES.unknown;
  const statusBadge = APP_STATUS_BADGES[drive.application_status] || APP_STATUS_BADGES.not_applied;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
      {/* Title & Badges Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {drive.company_name}
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${companyBadge.style}`}
            >
              {companyBadge.label}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.style}`}
            >
              {statusBadge.label}
            </span>
          </div>

          <div className="text-lg font-medium text-slate-300 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>{drive.role_title}</span>
          </div>
        </div>

        {/* Add Update Action Button */}
        <button
          type="button"
          onClick={onOpenAddUpdate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Update</span>
        </button>
      </div>

      {/* Drive Metadata Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
        <div className="space-y-1">
          <div className="text-xs text-slate-400 font-medium">CGPA Cutoff</div>
          <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>{drive.min_cgpa ? `${drive.min_cgpa} CGPA & above` : "No CGPA cutoff"}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-slate-400 font-medium">Eligible Branches</div>
          <div className="text-sm font-semibold text-slate-200">
            {drive.eligible_branches.length > 0
              ? drive.eligible_branches.join(", ")
              : "All Branches Eligible"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-slate-400 font-medium">Application Link</div>
          {drive.application_link ? (
            <a
              href={drive.application_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium truncate"
            >
              <span>Apply Online</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div className="text-sm text-slate-400">Not provided</div>
          )}
        </div>
      </div>

      {/* Confirmed Dates Section */}
      <div className="space-y-2.5 pt-4 border-t border-slate-800/80">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Confirmed Dates on Record</span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {drive.dates.map((d) => (
            <div
              key={d.id}
              className={`p-3 rounded-lg border text-xs flex flex-col gap-1 min-w-[200px] ${
                d.is_primary_deadline
                  ? "bg-red-950/30 border-red-500/40 text-red-200"
                  : "bg-slate-950/60 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">
                  {d.date_type.replace("_", " ")}
                </span>
                {d.is_primary_deadline && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 border border-red-500/40">
                    Primary Deadline
                  </span>
                )}
              </div>
              <div className="font-medium text-slate-100">{d.label || "Event Date"}</div>
              <div className="font-mono text-slate-300">{formatDate(d.date_iso)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
