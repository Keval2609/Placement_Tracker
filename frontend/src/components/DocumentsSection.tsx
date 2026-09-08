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
    <div className="bg-white border border-[#e6e6e6] p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1a2129] text-white flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#262626] uppercase tracking-[0.5px]">
            Attached Circulars & Documents
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6] font-mono">
          {documents.length} {documents.length === 1 ? "file" : "files"}
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-xs text-[#6b6b6b] italic bg-[#fafafa] border border-[#e6e6e6]">
          No circular documents uploaded for this drive yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-[#fafafa] border border-[#e6e6e6] hover:border-[#cccccc] transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2.5 bg-white text-[#1c69d4] border border-[#e6e6e6] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-[#262626] truncate group-hover:text-[#1c69d4] transition-colors">
                    {doc.original_filename}
                  </div>
                  <div className="text-[10px] text-[#6b6b6b] flex items-center gap-1 mt-0.5 font-mono">
                    <Clock className="w-3 h-3 text-[#9a9a9a]" />
                    <span>Uploaded {formatDate(doc.uploaded_at)}</span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <a
                href={doc.download_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] bg-white hover:bg-[#eff6ff] border border-[#bfdbfe] transition-colors shrink-0 cursor-pointer"
                title="Download file via secure signed link"
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
