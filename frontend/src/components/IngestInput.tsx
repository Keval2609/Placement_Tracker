import React, { useState } from "react";
import { MessageSquareText, FileUp, Sparkles, AlertCircle, Loader2, Zap } from "lucide-react";
import { ingestFile, ingestText } from "../services/api";
import { ExtractionAPIResponse } from "../types/extraction";

interface IngestInputProps {
  onExtractionSuccess: (data: ExtractionAPIResponse) => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<"text" | "file">("text");
  const [rawText, setRawText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await ingestText(rawText);
      onExtractionSuccess(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extract text. Please try again.";
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
      const data = await ingestFile(selectedFile);
      onExtractionSuccess(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file. Please try again.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#e6e6e6] p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-[#e6e6e6]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#1a2129] flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-5 h-5 text-[#1c69d4]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#262626] tracking-tight">
              AI Placement Notice Parser
            </h2>
            <p className="text-xs font-light text-[#6b6b6b] mt-0.5">
              Paste WhatsApp announcement or upload PDF / DOCX circular to extract deadlines & criteria.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center border border-[#cccccc] bg-[#f7f7f7]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-all ${
              activeTab === "text"
                ? "bg-[#1c69d4] text-white"
                : "text-[#6b6b6b] hover:text-[#262626]"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-all ${
              activeTab === "file"
                ? "bg-[#1c69d4] text-white"
                : "text-[#6b6b6b] hover:text-[#262626]"
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Text Ingest Form */}
      {activeTab === "text" && (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-[1px] text-[#262626]">
              Raw WhatsApp Notice / Email Text
            </label>
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_NOTICE)}
              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] hover:text-[#0653b6] transition-colors cursor-pointer"
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
            className="w-full p-4 bg-white border border-[#cccccc] text-xs text-[#262626] placeholder-[#9a9a9a] focus:outline-none focus:border-[#1c69d4] leading-relaxed font-sans"
            disabled={loading}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-[11px] font-light text-[#6b6b6b]">
              Dates, eligibility, and links are extracted with verification confidence gates.
            </span>

            <button
              type="submit"
              disabled={loading || !rawText.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
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

      {/* Tab 2: File Ingest Form */}
      {activeTab === "file" && (
        <form onSubmit={handleFileSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-[#cccccc] hover:border-[#1c69d4] p-8 sm:p-10 text-center space-y-3 transition-colors bg-[#fafafa]">
            <div className="w-12 h-12 bg-white text-[#1c69d4] border border-[#cccccc] flex items-center justify-center mx-auto">
              <FileUp className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-[#262626]">
                Upload Placement Brochure or Circular
              </p>
              <p className="text-[11px] font-light text-[#6b6b6b]">
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
              className="block w-full text-xs text-[#6b6b6b] file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-[0.5px] file:bg-[#1c69d4] file:text-white hover:file:bg-[#0653b6] file:cursor-pointer max-w-xs mx-auto pt-2"
              disabled={loading}
            />

            {selectedFile && (
              <div className="pt-2 text-xs font-mono text-[#1c69d4]">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
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
    </div>
  );
};
