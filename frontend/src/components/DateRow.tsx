import React from "react";
import { Check, Trash2, Calendar, Sparkles } from "lucide-react";
import { DateType, DetectedDateDraft } from "../types/extraction";

interface DateRowProps {
  date: DetectedDateDraft;
  onUpdate: (updated: DetectedDateDraft) => void;
  onDismiss: () => void;
}

const DATE_TYPE_LABELS: Record<DateType, string> = {
  application_deadline: "Deadline",
  oa: "OA",
  interview: "Interview",
  ppt: "PPT",
  result: "Result",
  joining: "Joining",
  other: "Other",
};

const DATE_TYPE_STYLES: Record<DateType, string> = {
  application_deadline: "bg-red-500/20 text-red-300 border-red-500/30",
  oa: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  interview: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  ppt: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  result: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  joining: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  other: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export const DateRow: React.FC<DateRowProps> = ({
  date,
  onUpdate,
  onDismiss,
}) => {
  // Convert ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
  const formatForInput = (isoStr: string): string => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    try {
      const newIso = new Date(val).toISOString();
      onUpdate({
        ...date,
        date_iso: newIso,
        confirmed_by_user: true, // Editing value keeps it confirmed
      });
    } catch {
      // Ignore invalid parsing
    }
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...date,
      label: e.target.value,
      confirmed_by_user: true,
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({
      ...date,
      date_type: e.target.value as DateType,
      confirmed_by_user: true,
    });
  };

  const handleConfirm = () => {
    onUpdate({
      ...date,
      confirmed_by_user: true,
    });
  };

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        date.confirmed_by_user
          ? "bg-slate-800/60 border-emerald-500/30"
          : "bg-amber-950/20 border-amber-500/30"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Date Type Select Badge */}
          <select
            value={date.date_type}
            onChange={handleTypeChange}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer ${
              DATE_TYPE_STYLES[date.date_type]
            }`}
          >
            {Object.entries(DATE_TYPE_LABELS).map(([typeKey, typeLabel]) => (
              <option key={typeKey} value={typeKey} className="bg-slate-900 text-slate-100">
                {typeLabel}
              </option>
            ))}
          </select>

          {/* Status Badge */}
          {date.confirmed_by_user ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Check className="w-3 h-3" /> Confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3 h-3" /> AI suggested — tap to confirm or edit
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!date.confirmed_by_user && (
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Confirm
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            title={date.confirmed_by_user ? "Remove Date" : "Dismiss Suggestion"}
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Input & Label Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Label / Description
          </label>
          <input
            type="text"
            value={date.label || ""}
            onChange={handleLabelChange}
            placeholder="e.g. Resume Submission EOD"
            className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Date & Time
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={formatForInput(date.date_iso)}
              onChange={handleDateChange}
              className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Original Raw Text Caption */}
      {date.date_raw && (
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 font-mono bg-slate-900/50 px-2 py-1 rounded">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>Original text:</span>
          <span className="italic text-slate-300">"{date.date_raw}"</span>
        </div>
      )}
    </div>
  );
};
