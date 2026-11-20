import React, { useState, useEffect } from "react";
import {
  X,
  Briefcase,
  IndianRupee,
  Award,
  GraduationCap,
  ExternalLink,
  FileText,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { DriveDetail, UpdateDrivePayload } from "../types/drive";
import { updateDrive } from "../services/api";

interface EditDriveModalProps {
  drive: DriveDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onDriveUpdated: (updated: DriveDetail) => void;
}

export const EditDriveModal: React.FC<EditDriveModalProps> = ({
  drive,
  isOpen,
  onClose,
  onDriveUpdated,
}) => {
  const [roleTitle, setRoleTitle] = useState("");
  const [ctcDisplay, setCtcDisplay] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [eligibleBranchesText, setEligibleBranchesText] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever drive changes or modal opens
  useEffect(() => {
    if (drive && isOpen) {
      setRoleTitle(drive.role_title || "");
      setCtcDisplay(drive.ctc_display || "");
      setMinCgpa(drive.min_cgpa !== null && drive.min_cgpa !== undefined ? String(drive.min_cgpa) : "");
      setEligibleBranchesText(
        drive.eligible_branches && drive.eligible_branches.length > 0
          ? drive.eligible_branches.join(", ")
          : ""
      );
      setApplicationLink(drive.application_link || "");
      setJobDescription(drive.job_description || drive.eligibility_raw || "");
      setError(null);
    }
  }, [drive, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !drive) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleTitle.trim()) {
      setError("Role Title cannot be empty.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const branches = eligibleBranchesText
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      const payload: UpdateDrivePayload = {
        role_title: roleTitle.trim(),
        ctc_display: ctcDisplay.trim() || null,
        min_cgpa: minCgpa ? parseFloat(minCgpa) : null,
        eligible_branches: branches,
        application_link: applicationLink.trim() || null,
        job_description: jobDescription.trim() || null,
        eligibility_raw: jobDescription.trim() || null,
      };

      const updated = await updateDrive(drive.id, payload);
      onDriveUpdated(updated);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update drive details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-drive-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-xl overflow-hidden my-6 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-tpo-navy border border-neutral-800 rounded-md flex items-center justify-center font-bold text-white text-sm shrink-0">
              {drive.company_name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2
                id="edit-drive-modal-title"
                className="text-base font-bold uppercase tracking-[0.5px] text-neutral-900 dark:text-white"
              >
                Edit Drive: {drive.company_name}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Update compensation, eligibility requirements, and portal details.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close edit drive modal"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Role Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-tpo-cobalt dark:text-blue-400" />
                <span>Role Title *</span>
              </label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Software Engineer or Data Analyst"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-tpo-cobalt dark:focus:border-blue-400"
                disabled={isLoading}
              />
            </div>

            {/* Salary / CTC Package */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-tpo-cobalt dark:text-blue-400" />
                <span>Salary / Package CTC</span>
              </label>
              <input
                type="text"
                value={ctcDisplay}
                onChange={(e) => setCtcDisplay(e.target.value)}
                placeholder="e.g. ₹34.5 LPA or 18 LPA"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-tpo-cobalt dark:focus:border-blue-400"
                disabled={isLoading}
              />
            </div>

            {/* Minimum CGPA */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>Minimum CGPA Cutoff</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
                placeholder="e.g. 7.5 (leave empty for none)"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-tpo-cobalt dark:focus:border-blue-400 font-mono"
                disabled={isLoading}
              />
            </div>

            {/* Eligible Branches */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-tpo-cobalt dark:text-blue-400" />
                <span>Eligible Branches (Comma-separated)</span>
              </label>
              <input
                type="text"
                value={eligibleBranchesText}
                onChange={(e) => setEligibleBranchesText(e.target.value)}
                placeholder="e.g. CSE, IT, ECE (leave empty for All Branches)"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-tpo-cobalt dark:focus:border-blue-400"
                disabled={isLoading}
              />
            </div>

            {/* Application Portal Link */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-tpo-cobalt dark:text-blue-400" />
                <span>Application Portal URL</span>
              </label>
              <input
                type="url"
                value={applicationLink}
                onChange={(e) => setApplicationLink(e.target.value)}
                placeholder="https://company.careers/job/12345"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-tpo-cobalt dark:focus:border-blue-400 font-mono"
                disabled={isLoading}
              />
            </div>

            {/* Job Description / Criteria */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-tpo-cobalt dark:text-blue-400" />
                <span>Job Description & Requirements</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste or edit the job description, eligibility rules, and round details here..."
                rows={5}
                className="w-full p-3.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-tpo-cobalt dark:focus:border-blue-400"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !roleTitle.trim()}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-tpo-cobalt hover:bg-tpo-cobalt-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tpo-cobalt"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
