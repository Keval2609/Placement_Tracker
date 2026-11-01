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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 space-y-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1a2129] rounded-md text-white flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-bmw-primary dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white uppercase tracking-[0.5px]">
              Job Description & Key Requirements
            </h2>
            <p className="text-[11px] font-light text-neutral-500 dark:text-neutral-400">
              Full role details, eligibility criteria, and qualifications.
            </p>
          </div>
        </div>

        {descriptionText && (
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.5px] rounded-md border transition-all cursor-pointer ${
              copied
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
                <span>Copy Description</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Content Body */}
      {descriptionText ? (
        <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 p-5 rounded-md">
          <div className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 font-sans leading-relaxed whitespace-pre-wrap break-words select-text">
            {descriptionText}
          </div>
        </div>
      ) : (
        <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-dashed border-neutral-300 dark:border-neutral-700 p-8 rounded-lg text-center space-y-3">
          <div className="w-10 h-10 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              No Detailed Job Description Available
            </p>
            <p className="text-[11px] font-light text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
              This drive was created without detailed description text. You can add job details or paste the circular anytime.
            </p>
          </div>
          {onOpenAddUpdate && (
            <button
              type="button"
              onClick={onOpenAddUpdate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-bmw-primary hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
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
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-md space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-neutral-500 dark:text-neutral-400">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>CGPA Requirement</span>
          </div>
          <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 font-mono">
            {drive.min_cgpa ? `≥ ${drive.min_cgpa} CGPA` : "No CGPA cutoff"}
          </div>
        </div>

        {/* Branches */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-md space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-neutral-500 dark:text-neutral-400">
            <GraduationCap className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
            <span>Eligible Branches</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {drive.eligible_branches && drive.eligible_branches.length > 0 ? (
              drive.eligible_branches.map((b) => (
                <span
                  key={b}
                  className="px-1.5 py-0.5 rounded-sm bg-white dark:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-600 text-[10px] font-mono text-neutral-800 dark:text-neutral-200"
                >
                  {b}
                </span>
              ))
            ) : (
              <span className="text-xs font-light text-neutral-500 dark:text-neutral-400">All Branches Eligible</span>
            )}
          </div>
        </div>

        {/* Portal Link */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-md space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[1px] text-neutral-500 dark:text-neutral-400">
            <ExternalLink className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
            <span>Application Portal</span>
          </div>
          <div>
            {drive.application_link ? (
              <a
                href={drive.application_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-bmw-primary dark:text-blue-400 hover:underline break-all"
              >
                <span>Open Application Link</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="text-xs font-light text-neutral-500 dark:text-neutral-400">No link provided</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
