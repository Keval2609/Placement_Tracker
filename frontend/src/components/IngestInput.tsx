import React, { useState } from "react";
import {
  MessageSquareText,
  FileUp,
  Sparkles,
  AlertCircle,
  Loader2,
  Zap,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2,
  BookmarkCheck,
} from "lucide-react";
import { ingestFile, ingestText, createDrive } from "../services/api";
import { ExtractionAPIResponse } from "../types/extraction";
import { ApplicationStatus } from "../types/drive";

interface IngestInputProps {
  onExtractionSuccess: (data: ExtractionAPIResponse) => void;
  onDirectSaveSuccess?: () => void;
  onCancel?: () => void;
}

const SAMPLE_NOTICE = `*CAMPUS RECRUITMENT DRIVE 2026 - GOOGLE INDIA*
Dear Final Year B.Tech Students (CSE / IT / ECE),

Google India is visiting our campus for hiring Software Development Engineers (SDE - 1).

*Key Details:*
• *Role:* Software Development Engineer (Full Time)
• *Package (CTC):* 34.50 LPA (18.00 LPA Base + 12L Stocks + Relocation & Benefits)
• *Eligibility Criteria:*
  - B.Tech CSE / IT / ECE
  - Minimum CGPA: 8.00 and above (No active backlogs)
• *Registration Deadline:* 09th September 2026, strictly by 11:59 PM.
• *OA Date:* 12th September 2026 (HackerEarth link will be emailed to registered students).

*Registration Link:* https://forms.gle/GooglePlacement2026Drive
Late submissions will *NOT* be entertained under any circumstances.

Regards,
Training & Placement Officer (TPO)`;

export const IngestInput: React.FC<IngestInputProps> = ({
  onExtractionSuccess,
  onDirectSaveSuccess,
  onCancel,
}) => {
  // Top-level entry type: "campus" (AI parser) vs "off_campus" (Manual direct entry)
  const [entryType, setEntryType] = useState<"campus" | "off_campus">("campus");

  // Campus Drive Ingest States
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const [rawText, setRawText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Off-Campus Direct Entry States
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("applied");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [minCgpa, setMinCgpa] = useState("");
  const [applicationLink, setApplicationLink] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campus Handlers
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await ingestText(rawText);
      onExtractionSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract placement notice details.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await ingestFile(selectedFile);
      onExtractionSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse document file.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Off-Campus Handler
  const handleOffCampusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !roleTitle.trim() || !jobDescription.trim()) {
      setErrorMsg("Company Name, Role Title, and Job Description are required.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const chosenDate = deadlineDate.trim()
        ? new Date(deadlineDate).toISOString()
        : new Date().toISOString();

      await createDrive({
        company_name: companyName.trim(),
        role_title: roleTitle.trim(),
        job_description: jobDescription.trim(),
        eligibility_raw: jobDescription.trim(),
        min_cgpa: minCgpa ? parseFloat(minCgpa) : null,
        eligible_branches: [],
        application_link: applicationLink.trim() || null,
        application_status: applicationStatus,
        dates: [
          {
            id: `manual-deadline-${Date.now()}`,
            date_type: "application_deadline",
            label: "Application Deadline",
            date_iso: chosenDate,
            date_raw: "Manual Off-Campus Entry",
            source: "user_added",
            confirmed_by_user: true,
            is_primary_deadline: true,
          },
        ],
      });

      if (onDirectSaveSuccess) {
        onDirectSaveSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save off-campus application.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 sm:p-8 space-y-6 max-w-3xl mx-auto shadow-xs transition-colors">
      {/* Top Segmented Mode Selector */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-neutral-500 dark:text-neutral-400">
          Select Application Entry Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEntryType("campus");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 text-xs font-bold uppercase tracking-[0.5px] rounded-md transition-all cursor-pointer ${
              entryType === "campus"
                ? "bg-white dark:bg-neutral-900 text-bmw-primary dark:text-blue-400 shadow-xs border border-neutral-200 dark:border-neutral-700"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
            }`}
          >
            <Sparkles className="w-4 h-4 text-bmw-primary dark:text-blue-400" />
            <span>Campus Drive (AI Parser)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEntryType("off_campus");
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 text-xs font-bold uppercase tracking-[0.5px] rounded-md transition-all cursor-pointer ${
              entryType === "off_campus"
                ? "bg-white dark:bg-neutral-900 text-bmw-primary dark:text-blue-400 shadow-xs border border-neutral-200 dark:border-neutral-700"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
            }`}
          >
            <Briefcase className="w-4 h-4 text-bmw-primary dark:text-blue-400" />
            <span>Off-Campus Job (Manual Entry)</span>
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#1a2129] rounded-md flex items-center justify-center text-white shrink-0">
            {entryType === "campus" ? (
              <Sparkles className="w-5 h-5 text-bmw-primary dark:text-blue-400" />
            ) : (
              <Briefcase className="w-5 h-5 text-bmw-primary dark:text-blue-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
              {entryType === "campus"
                ? "Campus Placement Notice Parser"
                : "Manual Off-Campus Application"}
            </h2>
            <p className="text-xs font-light text-neutral-500 dark:text-neutral-400 mt-0.5">
              {entryType === "campus"
                ? "Paste WhatsApp announcement or upload PDF / DOCX circular to extract deadlines & criteria."
                : "Directly log an off-campus job application with role description and pipeline status (no AI parsing)."}
            </p>
          </div>
        </div>

        {/* Tab Selection for Campus Drive */}
        {entryType === "campus" && (
          <div className="flex items-center border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("text");
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] rounded-sm transition-all cursor-pointer ${
                activeTab === "text"
                  ? "bg-bmw-primary text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("file");
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] rounded-sm transition-all cursor-pointer ${
                activeTab === "file"
                  ? "bg-bmw-primary text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Campus Mode - Tab 1: Text Ingest Form */}
      {entryType === "campus" && activeTab === "text" && (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200">
              Raw WhatsApp Notice / Email Text
            </label>
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_NOTICE)}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-bmw-primary dark:text-blue-400 hover:underline transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Load WhatsApp Sample</span>
            </button>
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste announcement text here... (e.g., Company name, role, 11:59 PM deadline, CGPA criteria, Google form link)"
            className="w-full p-4 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-bmw-primary dark:focus:border-blue-400 leading-relaxed font-sans"
            disabled={loading}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[11px] font-light text-neutral-500 dark:text-neutral-400">
              Dates, eligibility, and links are extracted with verification confidence gates.
            </span>

            <button
              type="submit"
              disabled={loading || !rawText.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-bmw-primary hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Entities...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract Placement Details</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Campus Mode - Tab 2: File Ingest Form */}
      {entryType === "campus" && activeTab === "file" && (
        <form onSubmit={handleFileSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-bmw-primary dark:hover:border-blue-400 rounded-lg p-8 sm:p-10 text-center space-y-3 transition-colors bg-neutral-50 dark:bg-neutral-800/40">
            <div className="w-12 h-12 rounded-md bg-white dark:bg-neutral-800 text-bmw-primary dark:text-blue-400 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                Upload Placement Brochure or Circular
              </p>
              <p className="text-[11px] font-light text-neutral-500 dark:text-neutral-400">
                Supports .PDF or .DOCX official circulars up to 10MB
              </p>
            </div>

            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="block w-full text-xs text-neutral-600 dark:text-neutral-400 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-md file:text-xs file:font-bold file:uppercase file:tracking-[0.5px] file:bg-bmw-primary file:text-white hover:file:bg-blue-700 file:cursor-pointer max-w-xs mx-auto pt-2"
              disabled={loading}
            />

            {selectedFile && (
              <div className="pt-2 text-xs font-mono text-bmw-primary dark:text-blue-400">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-bmw-primary hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing File...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Parse Circular Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Off-Campus Mode: Direct Manual Entry Form */}
      {entryType === "off_campus" && (
        <form onSubmit={handleOffCampusSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
                <span>Company Name *</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Stripe, Amazon, Microsoft"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-bmw-primary"
                disabled={loading}
              />
            </div>

            {/* Role Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
                <span>Job Role / Title *</span>
              </label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Software Engineer, Backend Intern"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-bmw-primary"
                disabled={loading}
              />
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200">
                Job Description & Requirements *
              </label>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {jobDescription.length} characters
              </span>
            </div>
            <textarea
              rows={5}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste or write the job description, required skills, responsibilities, compensation details, etc..."
              className="w-full p-3.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-bmw-primary leading-relaxed font-sans"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Current Application Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
                <span>Current Status *</span>
              </label>
              <select
                value={applicationStatus}
                onChange={(e) => setApplicationStatus(e.target.value as ApplicationStatus)}
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary cursor-pointer"
                disabled={loading}
              >
                <option value="applied">Applied (In Pipeline)</option>
                <option value="oa">Online Assessment (OA)</option>
                <option value="interview">Interview Stage</option>
                <option value="offer">Job Offer Received</option>
                <option value="rejected">Rejected</option>
                <option value="not_applied">Saved / Not Applied Yet</option>
              </select>
            </div>

            {/* Application Deadline / Applied Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
                <span>Deadline / Applied Date</span>
              </label>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary"
                disabled={loading}
              />
            </div>

            {/* Min CGPA (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200">
                Min CGPA Cutoff (Optional)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
                placeholder="e.g. 7.5"
                className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-bmw-primary"
                disabled={loading}
              />
            </div>
          </div>

          {/* Application Portal Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
              <span>Application Portal URL (Optional)</span>
            </label>
            <input
              type="url"
              value={applicationLink}
              onChange={(e) => setApplicationLink(e.target.value)}
              placeholder="https://company.careers/job/12345"
              className="w-full px-3.5 py-2.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-bmw-primary"
              disabled={loading}
            />
          </div>

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md transition-colors cursor-pointer"
                disabled={loading}
              >
                Cancel
              </button>
            ) : (
              <span className="text-[11px] font-light text-neutral-500 dark:text-neutral-400">
                Off-campus entries are added directly to your active dashboard.
              </span>
            )}

            <button
              type="submit"
              disabled={loading || !companyName.trim() || !roleTitle.trim() || !jobDescription.trim()}
              className="inline-flex items-center gap-2 px-7 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-bmw-primary hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer shadow-xs ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Job Entry...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Off-Campus Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
