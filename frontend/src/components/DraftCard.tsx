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
        id: `user_date_${Date.now()}_${Math.random()}`,
        date_type: newDateType,
        label: newDateLabel.trim() || null,
        date_iso: isoStr,
        date_raw: "User added",
        source: "user_added",
        confirmed_by_user: true, // User-added dates are automatically confirmed
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-2.5 py-1 rounded-md">
            Posting #{postingIndex + 1}
          </span>
          {unconfirmedCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              {unconfirmedCount} date(s) need review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              All dates reviewed
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 hover:underline"
        >
          Remove Posting
        </button>
      </div>

      {/* Primary Job Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            Company Name *
          </label>
          <input
            type="text"
            value={posting.company_name}
            onChange={(e) => handleFieldChange("company_name", e.target.value)}
            placeholder="e.g. Google India"
            className="w-full text-sm px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            Role Title *
          </label>
          <input
            type="text"
            value={posting.role_title}
            onChange={(e) => handleFieldChange("role_title", e.target.value)}
            placeholder="e.g. Software Engineer / SDE Intern"
            className="w-full text-sm px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
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
            className="w-full text-sm px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
            Application Link
          </label>
          <input
            type="url"
            value={posting.application_link ?? ""}
            onChange={(e) =>
              handleFieldChange("application_link", e.target.value || null)
            }
            placeholder="https://..."
            className="w-full text-sm px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            Eligibility Summary
          </label>
          <input
            type="text"
            value={posting.eligibility_raw ?? ""}
            onChange={(e) =>
              handleFieldChange("eligibility_raw", e.target.value || null)
            }
            placeholder="e.g. 7.5 CGPA and above, CSE/IT branches only"
            className="w-full text-sm px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Dates Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Detected Dates ({posting.dates.length})
          </h4>
          <button
            type="button"
            onClick={() => setShowAddDateForm(!showAddDateForm)}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Date Manually
          </button>
        </div>

        {/* Add Date Form */}
        {showAddDateForm && (
          <form
            onSubmit={handleAddDateSubmit}
            className="p-3 bg-slate-950 border border-indigo-500/30 rounded-lg space-y-3"
          >
            <div className="text-xs font-semibold text-indigo-300">
              Add New Confirmed Date
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  value={newDateType}
                  onChange={(e) => setNewDateType(e.target.value as DateType)}
                  className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200"
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
                <label className="block text-xs text-slate-400 mb-1">Label</label>
                <input
                  type="text"
                  value={newDateLabel}
                  onChange={(e) => setNewDateLabel(e.target.value)}
                  placeholder="e.g. Round 1 OA"
                  className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newDateVal}
                  onChange={(e) => setNewDateVal(e.target.value)}
                  required
                  className="w-full text-xs px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDateForm(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
              >
                Add Date
              </button>
            </div>
          </form>
        )}

        {/* Date Rows */}
        {posting.dates.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
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
