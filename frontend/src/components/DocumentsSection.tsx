import React from "react";
import { FileText, Download, Clock } from "lucide-react";
import { DocumentItem } from "../types/drive";

interface DocumentsSectionProps {
  documents: DocumentItem[];
}

export const DocumentsSection: React.FC<DocumentsSectionProps> = ({ documents }) => {
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Attached Circulars & Documents
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
          {documents.length} {documents.length === 1 ? "file" : "files"}
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-950/40 rounded-lg border border-slate-800/60">
          No circular documents uploaded for this drive yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors shrink-0">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {doc.original_filename}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                  </div>
                </div>
              </div>

              {/* Signed URL Download Button (5-min short expiry) */}
              <a
                href={doc.download_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded transition-colors shrink-0 cursor-pointer"
                title="Download file via 5-minute signed URL"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
