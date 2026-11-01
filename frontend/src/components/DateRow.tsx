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
        confirmed_by_user: true,
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
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
          : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Date Type Select Badge */}
          <select
            value={date.date_type}
            onChange={handleTypeChange}
            className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700 focus:border-bmw-primary cursor-pointer"
          >
            {Object.entries(DATE_TYPE_LABELS).map(([typeKey, typeLabel]) => (
              <option key={typeKey} value={typeKey} className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
                {typeLabel}
              </option>
            ))}
          </select>

          {/* Status Badge */}
          {date.confirmed_by_user ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3 h-3" /> Confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
              <Sparkles className="w-3 h-3" /> AI suggested — Review & Confirm
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!date.confirmed_by_user && (
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" /> Confirm
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            title={date.confirmed_by_user ? "Remove Date" : "Dismiss Suggestion"}
            className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Input & Label Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
            Label / Description
          </label>
          <input
            type="text"
            value={date.label || ""}
            onChange={handleLabelChange}
            placeholder="e.g. Resume Submission EOD"
            className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
            Date & Time
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={formatForInput(date.date_iso)}
              onChange={handleDateChange}
              className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary"
            />
          </div>
        </div>
      </div>

      {/* Original Raw Text Caption */}
      {date.date_raw && (
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5 font-mono bg-white dark:bg-neutral-800 p-1.5 rounded-md border border-neutral-200 dark:border-neutral-700">
          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          <span>Original text:</span>
          <span className="italic text-neutral-900 dark:text-neutral-100">"{date.date_raw}"</span>
        </div>
      )}
    </div>
  );
};
