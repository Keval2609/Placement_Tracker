import React from "react";
import { Building2, Calendar, Plus, ExternalLink, Award, GraduationCap } from "lucide-react";
import { DriveDetail } from "../types/drive";

interface DriveDetailHeaderProps {
  drive: DriveDetail;
  onOpenAddUpdate: () => void;
}

const APP_STATUS_BADGES: Record<string, { label: string; style: string }> = {
  not_applied: { label: "Not Applied", style: "bg-white/10 text-white border-white/20" },
  applied: { label: "Applied", style: "bg-[#1c69d4]/30 text-white border-[#1c69d4]" },
  oa: { label: "OA Stage", style: "bg-[#1c69d4]/30 text-white border-[#1c69d4]" },
  interview: { label: "Interviewing", style: "bg-purple-500/30 text-white border-purple-400" },
  offer: { label: "Offer Received 🎉", style: "bg-emerald-500/30 text-emerald-200 border-emerald-400 font-bold" },
  rejected: { label: "Rejected", style: "bg-rose-500/30 text-rose-200 border-rose-400" },
  withdrawn: { label: "Withdrawn", style: "bg-white/10 text-white border-white/20" },
};

export const DriveDetailHeader: React.FC<DriveDetailHeaderProps> = ({
  drive,
  onOpenAddUpdate,
}) => {
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
    <div className="bg-[#1a2129] border border-[#262e38] p-6 sm:p-8 space-y-6 text-white">
      {/* Title & Badges Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Monogram avatar */}
          <div className="w-14 h-14 bg-[#262e38] border border-white/20 flex items-center justify-center font-bold text-xl text-white shrink-0">
            {drive.company_name.slice(0, 2).toUpperCase()}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {drive.company_name}
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-[1px] px-2.5 py-0.5 bg-[#262e38] text-white border border-white/10">
                {drive.company_type}
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-[1px] px-2.5 py-0.5 border ${statusBadge.style}`}>
                {statusBadge.label}
              </span>
            </div>

            <div className="text-sm sm:text-base font-light text-[#bbbbbb] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1c69d4]" />
              <span>{drive.role_title}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {drive.application_link && (
            <a
              href={drive.application_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-transparent hover:bg-white/10 border border-white transition-colors cursor-pointer"
            >
              <span>Application Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={onOpenAddUpdate}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Update</span>
          </button>
        </div>
      </div>

      {/* Drive Metadata Row - BMW Spec Cells */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <div className="p-3.5 bg-[#262e38] border border-white/10 space-y-1">
          <div className="text-[11px] text-[#bbbbbb] font-bold uppercase tracking-[1.5px] flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>CGPA Cutoff</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-white font-mono">
            {drive.min_cgpa ? `≥ ${drive.min_cgpa} CGPA` : "No CGPA cutoff"}
          </div>
        </div>

        <div className="p-3.5 bg-[#262e38] border border-white/10 space-y-1">
          <div className="text-[11px] text-[#bbbbbb] font-bold uppercase tracking-[1.5px] flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-[#1c69d4]" />
            <span>Eligible Branches</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {drive.eligible_branches && drive.eligible_branches.length > 0 ? (
              drive.eligible_branches.map((b) => (
                <span
                  key={b}
                  className="px-2 py-0.5 bg-[#1a2129] border border-white/10 text-[10px] font-mono text-white"
                >
                  {b}
                </span>
              ))
            ) : (
              <span className="text-xs font-light text-[#bbbbbb]">All Branches Eligible</span>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-[#262e38] border border-white/10 space-y-1">
          <div className="text-[11px] text-[#bbbbbb] font-bold uppercase tracking-[1.5px] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Primary Deadline</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-white font-mono">
            {drive.dates.find((d) => d.is_primary_deadline)?.date_iso
              ? formatDate(drive.dates.find((d) => d.is_primary_deadline)!.date_iso)
              : "No deadline announced"}
          </div>
        </div>
      </div>
    </div>
  );
};
