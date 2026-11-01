import React from "react";
import { MessageSquare, FileText, File, History, Sparkles } from "lucide-react";
import { TimelineEvent } from "../types/drive";

interface TimelineSectionProps {
  timeline: TimelineEvent[];
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  whatsapp_text: <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />,
  pdf: <FileText className="w-3.5 h-3.5 text-red-500" />,
  docx: <File className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />,
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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 space-y-4 shadow-xs transition-colors">
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1a2129] rounded-md text-white flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white uppercase tracking-[0.5px]">
            Drive Updates & Event Timeline
          </h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-mono">
          {timeline.length} {timeline.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-neutral-200 dark:before:bg-neutral-800">
        {timeline.map((event, index) => {
          const isInitial = event.event_type === "initial_capture";
          const icon = SOURCE_ICONS[event.source_type] || <MessageSquare className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />;

          return (
            <div key={event.id || index} className="relative group">
              {/* Node Icon */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border flex items-center justify-center ${
                  isInitial
                    ? "bg-bmw-primary border-bmw-primary text-white"
                    : "bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200"
                }`}
              >
                {isInitial ? <Sparkles className="w-2.5 h-2.5" /> : icon}
              </div>

              {/* Event Content Box */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-md p-4 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {isInitial ? "Drive Registration & Initial Notice" : `Round / Criteria Update #${index}`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 uppercase font-bold tracking-wider">
                      {icon}
                      <span>{event.source_type.replace("_", " ")}</span>
                    </span>
                  </div>

                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                    {formatDate(event.created_at)}
                  </span>
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-light leading-relaxed">
                  {isInitial && (!event.summary_of_changes || event.summary_of_changes.toLowerCase() === "initial capture")
                    ? "Drive registered and circular details recorded in portal."
                    : event.summary_of_changes}
                </p>

                {event.raw_text && (
                  <details className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <summary className="cursor-pointer text-bmw-primary dark:text-blue-400 hover:underline select-none font-bold uppercase tracking-[1px] text-[10px]">
                      View Raw Circular Snippet ›
                    </summary>
                    <pre className="mt-2 p-3 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-800 dark:text-neutral-200 font-mono whitespace-pre-wrap overflow-x-auto">
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
