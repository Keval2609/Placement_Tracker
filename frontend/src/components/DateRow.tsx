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
      className={`p-3 border transition-all ${
        date.confirmed_by_user
          ? "bg-[#ecfdf5]/40 border-[#bbf7d0]"
          : "bg-[#fffbeb]/40 border-[#fde68a]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {/* Date Type Select Badge */}
          <select
            value={date.date_type}
            onChange={handleTypeChange}
            className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 border bg-white text-[#262626] border-[#cccccc] focus:border-[#1c69d4] cursor-pointer"
          >
            {Object.entries(DATE_TYPE_LABELS).map(([typeKey, typeLabel]) => (
              <option key={typeKey} value={typeKey} className="bg-white text-[#262626]">
                {typeLabel}
              </option>
            ))}
          </select>

          {/* Status Badge */}
          {date.confirmed_by_user ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-[#ecfdf5] text-[#15803d] border border-[#bbf7d0]">
              <Check className="w-3 h-3" /> Confirmed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
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
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#15803d] hover:bg-[#166534] transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Confirm
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            title={date.confirmed_by_user ? "Remove Date" : "Dismiss Suggestion"}
            className="p-1 text-[#9a9a9a] hover:text-[#dc2626] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Input & Label Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6b6b6b] mb-1">
            Label / Description
          </label>
          <input
            type="text"
            value={date.label || ""}
            onChange={handleLabelChange}
            placeholder="e.g. Resume Submission EOD"
            className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#6b6b6b] mb-1">
            Date & Time
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={formatForInput(date.date_iso)}
              onChange={handleDateChange}
              className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
            />
          </div>
        </div>
      </div>

      {/* Original Raw Text Caption */}
      {date.date_raw && (
        <div className="mt-2 text-xs text-[#6b6b6b] flex items-center gap-1.5 font-mono bg-white p-1.5 border border-[#e6e6e6]">
          <Calendar className="w-3.5 h-3.5 text-[#9a9a9a]" />
          <span>Original text:</span>
          <span className="italic text-[#262626]">"{date.date_raw}"</span>
        </div>
      )}
    </div>
  );
};
