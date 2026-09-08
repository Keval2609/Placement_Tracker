import React from "react";
import { MessageSquare, FileText, File, History, Sparkles } from "lucide-react";
import { TimelineEvent } from "../types/drive";

interface TimelineSectionProps {
  timeline: TimelineEvent[];
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  whatsapp_text: <MessageSquare className="w-3.5 h-3.5 text-[#22c55e]" />,
  pdf: <FileText className="w-3.5 h-3.5 text-[#dc2626]" />,
  docx: <File className="w-3.5 h-3.5 text-[#1c69d4]" />,
};

export const TimelineSection: React.FC<TimelineSectionProps> = ({ timeline }) => {
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
    <div className="bg-white border border-[#e6e6e6] p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-[#e6e6e6] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1a2129] text-white flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-[#262626] uppercase tracking-[0.5px]">
            Drive Updates & Event Timeline
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6] font-mono">
          {timeline.length} {timeline.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-[#e6e6e6]">
        {timeline.map((event, index) => {
          const isInitial = event.event_type === "initial_capture";
          const icon = SOURCE_ICONS[event.source_type] || <MessageSquare className="w-3.5 h-3.5 text-[#1c69d4]" />;

          return (
            <div key={event.id || index} className="relative group">
              {/* Node Icon */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 border flex items-center justify-center ${
                  isInitial
                    ? "bg-[#1c69d4] border-[#1c69d4] text-white"
                    : "bg-white border-[#cccccc] text-[#262626]"
                }`}
              >
                {isInitial ? <Sparkles className="w-2.5 h-2.5" /> : icon}
              </div>

              {/* Event Content Box */}
              <div className="bg-[#fafafa] border border-[#e6e6e6] p-4 space-y-2 hover:border-[#cccccc] transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#262626]">
                      {isInitial ? "Initial Notice Ingestion" : `Round / Criteria Update #${index}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-white border border-[#e6e6e6] text-[#6b6b6b] uppercase font-bold tracking-wider">
                      {icon}
                      <span>{event.source_type.replace("_", " ")}</span>
                    </span>
                  </div>

                  <span className="text-[10px] text-[#6b6b6b] font-mono">
                    {formatDate(event.created_at)}
                  </span>
                </div>

                <p className="text-xs text-[#3c3c3c] font-light leading-relaxed">
                  {event.summary_of_changes}
                </p>

                {event.raw_text && (
                  <details className="mt-2 text-[11px] text-[#6b6b6b]">
                    <summary className="cursor-pointer text-[#1c69d4] hover:text-[#0653b6] select-none font-bold uppercase tracking-[1px] text-[10px]">
                      View Raw Circular Snippet ›
                    </summary>
                    <pre className="mt-2 p-3 bg-white border border-[#e6e6e6] text-[10px] text-[#262626] font-mono whitespace-pre-wrap overflow-x-auto">
                      {event.raw_text}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
