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
    <div className="bg-white border border-[#e6e6e6] p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e6e6e6]">
        <div className="flex items-center gap-2">
          <span className="bg-[#f7f7f7] text-[#262626] border border-[#e6e6e6] text-xs font-bold uppercase tracking-[1px] px-2.5 py-1">
            Posting #{postingIndex + 1}
          </span>
          {unconfirmedCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#b45309] bg-[#fffbeb] border border-[#fde68a] px-2.5 py-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {unconfirmedCount} date(s) need review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#15803d] bg-[#ecfdf5] border border-[#bbf7d0] px-2.5 py-0.5">
              All dates reviewed
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-[#dc2626] hover:underline font-bold uppercase tracking-[0.5px]"
        >
          Remove Posting
        </button>
      </div>

      {/* Primary Job Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-[#262626] mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#1c69d4]" />
            Company Name *
          </label>
          <input
            type="text"
            value={posting.company_name}
            onChange={(e) => handleFieldChange("company_name", e.target.value)}
            placeholder="e.g. Google India"
            className="w-full text-xs px-3 py-2 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-[#262626] mb-1 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#1c69d4]" />
            Role Title *
          </label>
          <input
            type="text"
            value={posting.role_title}
            onChange={(e) => handleFieldChange("role_title", e.target.value)}
            placeholder="e.g. Software Engineer / SDE Intern"
            className="w-full text-xs px-3 py-2 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-[#262626] mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-[#1c69d4]" />
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
            className="w-full text-xs px-3 py-2 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[1px] text-[#262626] mb-1 flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-[#1c69d4]" />
            Application Link
          </label>
          <input
            type="url"
            value={posting.application_link ?? ""}
            onChange={(e) =>
              handleFieldChange("application_link", e.target.value || null)
            }
            placeholder="https://..."
            className="w-full text-xs px-3 py-2 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-[1px] text-[#262626] mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#1c69d4]" />
            Eligibility Summary
          </label>
          <input
            type="text"
            value={posting.eligibility_raw ?? ""}
            onChange={(e) =>
              handleFieldChange("eligibility_raw", e.target.value || null)
            }
            placeholder="e.g. 7.5 CGPA and above, CSE/IT branches only"
            className="w-full text-xs px-3 py-2 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
          />
        </div>
      </div>

      {/* Dates Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-[1.5px] text-[#262626]">
            Detected Dates ({posting.dates.length})
          </h4>
          <button
            type="button"
            onClick={() => setShowAddDateForm(!showAddDateForm)}
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] hover:text-[#0653b6] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Date Manually
          </button>
        </div>

        {/* Add Date Form */}
        {showAddDateForm && (
          <form
            onSubmit={handleAddDateSubmit}
            className="p-4 bg-[#fafafa] border border-[#cccccc] space-y-3"
          >
            <div className="text-xs font-bold uppercase tracking-[1px] text-[#262626]">
              Add New Confirmed Date
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b6b6b] mb-1">Type</label>
                <select
                  value={newDateType}
                  onChange={(e) => setNewDateType(e.target.value as DateType)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b6b6b] mb-1">Label</label>
                <input
                  type="text"
                  value={newDateLabel}
                  onChange={(e) => setNewDateLabel(e.target.value)}
                  placeholder="e.g. Round 1 OA"
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6b6b6b] mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newDateVal}
                  onChange={(e) => setNewDateVal(e.target.value)}
                  required
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-[#cccccc] text-[#262626] focus:outline-none focus:border-[#1c69d4]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddDateForm(false)}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] text-[#6b6b6b] hover:text-[#262626]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold uppercase tracking-[0.5px] bg-[#1c69d4] hover:bg-[#0653b6] text-white transition-colors"
              >
                Add Date
              </button>
            </div>
          </form>
        )}

        {/* Date Rows */}
        {posting.dates.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#6b6b6b] italic border border-dashed border-[#cccccc] bg-[#fafafa]">
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
