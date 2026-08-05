import React from "react";
import { MessageSquare, FileText, File, Clock, History, Sparkles } from "lucide-react";
import { TimelineEvent } from "../types/drive";

interface TimelineSectionProps {
  timeline: TimelineEvent[];
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  whatsapp_text: <MessageSquare className="w-4 h-4 text-emerald-400" />,
  pdf: <FileText className="w-4 h-4 text-red-400" />,
  docx: <File className="w-4 h-4 text-blue-400" />,
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">
            Drive History Timeline
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
          Read-only history ({timeline.length} {timeline.length === 1 ? "entry" : "entries"})
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {timeline.map((event, index) => {
          const isInitial = event.event_type === "initial_capture";
          const icon = SOURCE_ICONS[event.source_type] || <MessageSquare className="w-4 h-4 text-indigo-400" />;

          return (
            <div key={event.id || index} className="relative group">
              {/* Node Icon Circle */}
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${
                  isInitial
                    ? "bg-indigo-950 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/20"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                {isInitial ? <Sparkles className="w-3 h-3 text-indigo-400" /> : icon}
              </div>

              {/* Event Content */}
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {isInitial ? "Initial Capture" : `Update #${index}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {icon}
                      <span className="capitalize">{event.source_type.replace("_", " ")}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{formatDate(event.created_at)}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-medium">
                  {event.summary_of_changes}
                </p>

                {event.raw_text && (
                  <div className="mt-2 text-[11px] font-mono bg-slate-900/60 text-slate-400 p-2.5 rounded border border-slate-800/60 max-h-24 overflow-y-auto whitespace-pre-wrap">
                    "{event.raw_text}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
