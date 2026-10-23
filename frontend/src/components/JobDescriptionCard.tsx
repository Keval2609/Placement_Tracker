import React, { useState } from "react";
import {
  FileText,
  Copy,
  Check,
  Award,
  GraduationCap,
  ExternalLink,
  Plus,
  HelpCircle,
} from "lucide-react";
import { DriveDetail } from "../types/drive";

interface JobDescriptionCardProps {
  drive: DriveDetail;
  onOpenAddUpdate?: () => void;
}

export const JobDescriptionCard: React.FC<JobDescriptionCardProps> = ({
  drive,
  onOpenAddUpdate,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const descriptionText = (drive.job_description || drive.eligibility_raw || "").trim();

  const handleCopy = async () => {
    if (!descriptionText) return;
    try {
      await navigator.clipboard.writeText(descriptionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy description text:", err);
    }
  };

  return (
    <div className="bg-white border border-[#e6e6e6] p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e6e6] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1a2129] text-white flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[#1c69d4]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#262626] uppercase tracking-[0.5px]">
              Job Description & Key Requirements
            </h2>
            <p className="text-[11px] font-light text-[#6b6b6b]">
              Full role details, eligibility criteria, and qualifications.
            </p>
          </div>
        </div>

        {descriptionText && (
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.5px] border transition-all cursor-pointer ${
              copied
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-white text-[#262626] border-[#cccccc] hover:bg-[#f7f7f7] hover:border-[#1c69d4]"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#1c69d4]" />
                <span>Copy Description</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Content Body */}
      {descriptionText ? (
        <div className="bg-[#fcfcfc] border border-[#ebebeb] p-5 rounded-none">
          <div className="text-xs sm:text-sm text-[#262626] font-sans leading-relaxed whitespace-pre-wrap break-words select-text">
            {descriptionText}
          </div>
        </div>
      ) : (
        <div className="bg-[#fafafa] border border-dashed border-[#cccccc] p-8 text-center space-y-3">
          <div className="w-10 h-10 bg-white border border-[#cccccc] text-[#8c8c8c] flex items-center justify-center mx-auto">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#262626]">
              No Detailed Job Description Available
            </p>
            <p className="text-[11px] font-light text-[#6b6b6b] max-w-md mx-auto">
              This drive was created without detailed description text. You can add job details or paste the circular anytime.
            </p>
          </div>
          {onOpenAddUpdate && (
            <button
              type="button"
              onClick={onOpenAddUpdate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Description or Circular</span>
            </button>
          )}
        </div>
      )}

      {/* Quick Criteria & Specs Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* CGPA */}
        <div className="p-3 bg-[#fafafa] border border-[#e6e6e6] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#6b6b6b]">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>CGPA Requirement</span>
          </div>
          <div className="text-xs font-bold text-[#262626] font-mono">
            {drive.min_cgpa ? `≥ ${drive.min_cgpa} CGPA` : "No CGPA cutoff"}
          </div>
        </div>

        {/* Branches */}
        <div className="p-3 bg-[#fafafa] border border-[#e6e6e6] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#6b6b6b]">
            <GraduationCap className="w-3.5 h-3.5 text-[#1c69d4]" />
            <span>Eligible Branches</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {drive.eligible_branches && drive.eligible_branches.length > 0 ? (
              drive.eligible_branches.map((b) => (
                <span
                  key={b}
                  className="px-1.5 py-0.5 bg-white border border-[#dcdcdc] text-[10px] font-mono text-[#262626]"
                >
                  {b}
                </span>
              ))
            ) : (
              <span className="text-xs font-light text-[#6b6b6b]">All Branches Eligible</span>
            )}
          </div>
        </div>

        {/* Portal Link */}
        <div className="p-3 bg-[#fafafa] border border-[#e6e6e6] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-[#6b6b6b]">
            <ExternalLink className="w-3.5 h-3.5 text-[#1c69d4]" />
            <span>Application Portal</span>
          </div>
          <div>
            {drive.application_link ? (
              <a
                href={drive.application_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1c69d4] hover:text-[#0653b6] hover:underline break-all"
              >
                <span>Open Application Link</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="text-xs font-light text-[#6b6b6b]">No link provided</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
