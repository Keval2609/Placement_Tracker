import React, { useState } from "react";
import {
  Building2,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  Plus,
  AlertCircle,
  FileText,
} from "lucide-react";
import { DateType, DetectedDateDraft, DrivePostingDraft } from "../types/extraction";
import { DateRow } from "./DateRow";

interface DraftCardProps {
  postingIndex: number;
  posting: DrivePostingDraft;
  onUpdate: (updated: DrivePostingDraft) => void;
  onRemove: () => void;
}

export const DraftCard: React.FC<DraftCardProps> = ({
  postingIndex,
  posting,
  onUpdate,
  onRemove,
}) => {
  const [showAddDateForm, setShowAddDateForm] = useState(false);
  const [newDateType, setNewDateType] = useState<DateType>("application_deadline");
  const [newDateLabel, setNewDateLabel] = useState("");
  const [newDateVal, setNewDateVal] = useState("");

  const unconfirmedCount = posting.dates.filter((d) => !d.confirmed_by_user).length;

  const handleFieldChange = <K extends keyof DrivePostingDraft>(
    field: K,
    value: DrivePostingDraft[K]
  ) => {
    onUpdate({
      ...posting,
      [field]: value,
    });
  };

  const handleDateUpdate = (index: number, updatedDate: DetectedDateDraft) => {
    const newDates = [...posting.dates];
    newDates[index] = updatedDate;
    onUpdate({ ...posting, dates: newDates });
  };

  const handleDateDismiss = (index: number) => {
    const newDates = posting.dates.filter((_, i) => i !== index);
    onUpdate({ ...posting, dates: newDates });
  };

  const handleAddDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDateVal) return;

    try {
      const isoStr = new Date(newDateVal).toISOString();
      const newDateObj: DetectedDateDraft = {
        id: `manual_${Date.now()}`,
        date_type: newDateType,
        label: newDateLabel.trim() || undefined,
        date_raw: "Manually entered",
        date_iso: isoStr,
        source: "user_added",
        confirmed_by_user: true,
      };

      onUpdate({
        ...posting,
        dates: [...posting.dates, newDateObj],
      });

      // Reset form
      setNewDateLabel("");
      setNewDateVal("");
      setShowAddDateForm(false);
    } catch {
      // Ignore invalid parsing
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5 space-y-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 text-xs font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-sm">
            Posting #{postingIndex + 1}
          </span>
          {unconfirmedCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2.5 py-0.5 rounded-sm">
              <AlertCircle className="w-3.5 h-3.5" />
              {unconfirmedCount} date(s) need review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-sm">
              All dates reviewed
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold uppercase tracking-[0.5px]"
        >
          Remove Posting
        </button>
      </div>

      {/* Primary Job Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
            Company Name *
          </label>
          <input
            type="text"
            value={posting.company_name}
            onChange={(e) => handleFieldChange("company_name", e.target.value)}
            placeholder="e.g. Google India"
            className="w-full text-xs px-3 py-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary dark:focus:border-blue-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
            Role Title *
          </label>
          <input
            type="text"
            value={posting.role_title}
            onChange={(e) => handleFieldChange("role_title", e.target.value)}
            placeholder="e.g. Software Engineer / SDE Intern"
            className="w-full text-xs px-3 py-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary dark:focus:border-blue-400"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
            Min CGPA Cutoff
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={posting.min_cgpa ?? ""}
            onChange={(e) =>
              handleFieldChange(
                "min_cgpa",
                e.target.value ? parseFloat(e.target.value) : null
              )
            }
            placeholder="e.g. 7.5"
            className="w-full text-xs px-3 py-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary dark:focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
            Application Link
          </label>
          <input
            type="url"
            value={posting.application_link ?? ""}
            onChange={(e) =>
              handleFieldChange("application_link", e.target.value || null)
            }
            placeholder="https://..."
            className="w-full text-xs px-3 py-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary dark:focus:border-blue-400"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-bmw-primary dark:text-blue-400" />
            Eligibility Summary
          </label>
          <input
            type="text"
            value={posting.eligibility_raw ?? ""}
            onChange={(e) =>
              handleFieldChange("eligibility_raw", e.target.value || null)
            }
            placeholder="e.g. 7.5 CGPA and above, CSE/IT branches only"
            className="w-full text-xs px-3 py-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary dark:focus:border-blue-400"
          />
        </div>
      </div>

      {/* Dates Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-[1.5px] text-neutral-900 dark:text-white">
            Detected Dates ({posting.dates.length})
          </h4>
          <button
            type="button"
            onClick={() => setShowAddDateForm(!showAddDateForm)}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-bmw-primary dark:text-blue-400 hover:underline transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Date Manually
          </button>
        </div>

        {/* Add Date Form */}
        {showAddDateForm && (
          <form
            onSubmit={handleAddDateSubmit}
            className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 space-y-3"
          >
            <div className="text-xs font-bold uppercase tracking-[1px] text-neutral-900 dark:text-white">
              Add New Confirmed Date
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">Type</label>
                <select
                  value={newDateType}
                  onChange={(e) => setNewDateType(e.target.value as DateType)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary"
                >
                  <option value="application_deadline">Application Deadline</option>
                  <option value="oa">Online Assessment (OA)</option>
                  <option value="interview">Interview</option>
                  <option value="ppt">PPT</option>
                  <option value="result">Result</option>
                  <option value="joining">Joining</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">Label</label>
                <input
                  type="text"
                  value={newDateLabel}
                  onChange={(e) => setNewDateLabel(e.target.value)}
                  placeholder="e.g. Round 1 OA"
                  className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newDateVal}
                  onChange={(e) => setNewDateVal(e.target.value)}
                  required
                  className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:border-bmw-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddDateForm(false)}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold uppercase tracking-[0.5px] bg-bmw-primary hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Add Date
              </button>
            </div>
          </form>
        )}

        {/* Date Rows */}
        {posting.dates.length === 0 ? (
          <div className="p-4 text-center text-xs text-neutral-500 dark:text-neutral-400 italic border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-850">
            No dates detected. Use "+ Add Date Manually" above to set a deadline.
          </div>
        ) : (
          <div className="space-y-2">
            {posting.dates.map((dateObj, idx) => (
              <DateRow
                key={dateObj.id}
                date={dateObj}
                onUpdate={(updated) => handleDateUpdate(idx, updated)}
                onDismiss={() => handleDateDismiss(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
