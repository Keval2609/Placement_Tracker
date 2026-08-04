import React, { useState } from "react";
import { MessageSquareText, FileUp, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { ingestFile, ingestText } from "../services/api";
import { ExtractionAPIResponse } from "../types/extraction";

interface IngestInputProps {
  onExtractionSuccess: (data: ExtractionAPIResponse) => void;
}

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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            AI Placement Ingestion
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Paste unstructured WhatsApp messages or upload placement circulars (.pdf / .docx)
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("text");
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "text"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            Paste Text
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("file");
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "file"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            Upload File
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Paste Text */}
      {activeTab === "text" && (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw placement message from WhatsApp here... (e.g. Google SDE Intern 2026, Min CGPA 8.0, Apply by 10th Aug...)"
              rows={6}
              disabled={loading}
              className="w-full text-xs sm:text-sm p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono resize-y"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !rawText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting Placement Data...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Extract Draft with AI
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Upload File */}
      {activeTab === "file" && (
        <form onSubmit={handleFileSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950 rounded-xl p-8 text-center transition-all cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) =>
                setSelectedFile(e.target.files ? e.target.files[0] : null)
              }
              id="file-upload"
              className="hidden"
              disabled={loading}
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <FileUp className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-200">
                {selectedFile
                  ? selectedFile.name
                  : "Click to select or drop placement PDF / DOCX"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Supports .pdf and .docx up to 10MB
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing Document & Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Process Document
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
