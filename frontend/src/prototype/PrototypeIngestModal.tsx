import React, { useState } from "react";
import {
  X,
  Sparkles,
  FileUp,
  MessageSquareText,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Zap
} from "lucide-react";
import { PrototypeDrive } from "./mockData";

interface PrototypeIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriveCreated: (drive: PrototypeDrive) => void;
}

const SAMPLE_WHATSAPP_NOTICE = `*CAMPUS RECRUITMENT DRIVE 2026: GOOGLE INDIA*
Dear Final Year Students,
Google India has announced the campus hiring for Software Development Engineer (SDE-1).

*Roles & Responsibilities:*
- Design and implement distributed software systems.
- Optimize high-scale web infrastructure.

*Eligibility Criteria:*
- Eligible Branches: CSE, IT, ECE
- Minimum CGPA required: >= 8.0
- No active backlogs allowed.

*Package (CTC):* INR 34.50 LPA (18L Base + Stocks + Relocation)
*Location:* Bangalore / Hyderabad

*Last Date to Register:* 09 Sep 2026, 11:59 PM (Strict Deadline)
Register on the university portal: https://forms.gle/GooglePlacement2026Drive`;

export const PrototypeIngestModal: React.FC<PrototypeIngestModalProps> = ({
  isOpen,
  onClose,
  onDriveCreated,
}) => {
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<{
    company_name: string;
    role_title: string;
    ctc_display: string;
    deadline: string;
    min_cgpa: number;
    branches: string[];
    link: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleLoadSample = () => {
    setInputText(SAMPLE_WHATSAPP_NOTICE);
  };

  const handleExtract = () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setExtractedPreview(null);

    // Simulate AI extraction response
    setTimeout(() => {
      setIsAnalyzing(false);
      setExtractedPreview({
        company_name: "Google India",
        role_title: "Software Development Engineer (SDE - 1)",
        ctc_display: "₹34.50 LPA",
        deadline: "09 Sep 2026, 11:59 PM",
        min_cgpa: 8.0,
        branches: ["CSE", "IT", "ECE"],
        link: "https://forms.gle/GooglePlacement2026Drive",
      });
    }, 1000);
  };

  const handleSaveToTracker = () => {
    if (!extractedPreview) return;

    const newDrive: PrototypeDrive = {
      id: `drive-custom-${Date.now()}`,
      company_name: extractedPreview.company_name,
      role_title: extractedPreview.role_title,
      company_type: "product",
      ctc_display: extractedPreview.ctc_display,
      base_salary: "₹18 LPA Base + Stocks",
      location: "Bangalore / Hyderabad",
      days_left: 1,
      primary_deadline: extractedPreview.deadline,
      deadline_timestamp: "2026-09-09T23:59:59Z",
      is_overdue: false,
      application_status: "not_applied",
      min_cgpa: extractedPreview.min_cgpa,
      eligible_branches: extractedPreview.branches,
      application_link: extractedPreview.link,
      rounds: [
        { name: "Registration", status: "current" },
        { name: "Online Coding Test", status: "upcoming" },
        { name: "Technical Interviews", status: "upcoming" },
      ],
      description: "Extracted from placement notice via AI Parser Studio.",
      requirements: ["Strong DSA fundamentals", "Clean academic record"],
      documents: [],
      timeline: [
        {
          title: "Circular Extracted & Verified",
          date: "Today",
          badge: "New",
          notes: "Notice parsed using AI extractor",
          type: "info",
        },
      ],
    };

    onDriveCreated(newDrive);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-6 sm:p-8 space-y-5 text-neutral-800 dark:text-neutral-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1a2129] rounded-md flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5 text-[#1c69d4] dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[1px] text-neutral-900 dark:text-white">
              AI Placement Notice Parser
            </h2>
            <p className="text-xs font-light text-neutral-600 dark:text-neutral-400">
              Extract company, role, package, eligibility, and deadline from raw text or circular files.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] rounded-sm transition-all ${
                activeTab === "text"
                  ? "bg-[#1c69d4] text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] rounded-sm transition-all ${
                activeTab === "file"
                  ? "bg-[#1c69d4] text-white shadow-xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Upload Circular</span>
            </button>
          </div>

          {activeTab === "text" && (
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Load WhatsApp Sample</span>
            </button>
          )}
        </div>

        {/* Input area */}
        {activeTab === "text" ? (
          <div className="space-y-3">
            <textarea
              rows={6}
              placeholder="Paste raw WhatsApp placement announcement or email text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#1c69d4] font-sans leading-relaxed"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExtract}
                disabled={!inputText.trim() || isAnalyzing}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors cursor-pointer shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting Entities...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Notice</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-8 text-center space-y-3 hover:border-[#1c69d4] dark:hover:border-blue-400 transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-800/40">
            <FileUp className="w-8 h-8 text-[#1c69d4] dark:text-blue-400 mx-auto" />
            <div>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Drag and drop your placement PDF or DOCX file
              </p>
              <p className="text-[11px] font-light text-neutral-500 dark:text-neutral-400 mt-0.5">
                Supports official TPO brochures, eligibility lists, and job circulars up to 10MB
              </p>
            </div>
          </div>
        )}

        {/* Extracted Preview Review */}
        {extractedPreview && (
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] dark:text-blue-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Parsed Information
              </span>
              <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                Confidence: High (98%)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-white dark:bg-neutral-850 rounded-md border border-blue-200 dark:border-blue-900">
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">Company & Role</span>
                <span className="font-bold text-neutral-900 dark:text-white block mt-0.5">
                  {extractedPreview.company_name}
                </span>
                <span className="text-[11px] font-light text-neutral-600 dark:text-neutral-300 truncate block">
                  {extractedPreview.role_title}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-neutral-850 rounded-md border border-blue-200 dark:border-blue-900">
                <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">Package & Deadline</span>
                <span className="font-bold text-[#1c69d4] dark:text-blue-400 font-mono block mt-0.5">
                  {extractedPreview.ctc_display}
                </span>
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 block">
                  {extractedPreview.deadline}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Branches:</span>
                {extractedPreview.branches.map((b) => (
                  <span key={b} className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-900 text-neutral-800 dark:text-neutral-200">
                    {b}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSaveToTracker}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
              >
                <span>Add to Tracker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
