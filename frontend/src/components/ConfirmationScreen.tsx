import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { DrivePostingDraft, ExtractionAPIResponse } from "../types/extraction";
import { DraftCard } from "./DraftCard";

interface ConfirmationScreenProps {
  initialResult: ExtractionAPIResponse;
  onReset: () => void;
  onSaveConfirmedDraft: (confirmedPostings: DrivePostingDraft[]) => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  initialResult,
  onReset,
  onSaveConfirmedDraft,
}) => {
  // Map incoming API response to stateful editable draft format
  const [postings, setPostings] = useState<DrivePostingDraft[]>(() => {
    if (!initialResult.postings || initialResult.postings.length === 0) {
      return [
        {
          id: `draft_${Date.now()}_0`,
          company_name: "",
          role_title: "",
          eligibility_raw: "",
          min_cgpa: null,
          eligible_branches: [],
          application_link: null,
          dates: [],
        },
      ];
    }

    return initialResult.postings.map((p, pIdx) => ({
      id: `draft_${Date.now()}_${pIdx}`,
      company_name: p.company_name || "",
      role_title: p.role_title || "",
      eligibility_raw: p.eligibility_raw || null,
      min_cgpa: p.min_cgpa ?? null,
      eligible_branches: p.eligible_branches || [],
      application_link: p.application_link || null,
      dates: (p.dates || []).map((d, dIdx) => ({
        id: `date_${Date.now()}_${pIdx}_${dIdx}`,
        date_type: d.date_type,
        label: d.label || null,
        date_iso: d.date_iso,
        date_raw: d.date_raw,
        source: "ai_suggested",
        confirmed_by_user: false,
      })),
    }));
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Gating Validation Calculations
  const allDates = postings.flatMap((p) => p.dates);
  const unconfirmedDates = allDates.filter((d) => !d.confirmed_by_user);
  const hasConfirmedDeadline = allDates.some(
    (d) => d.date_type === "application_deadline" && d.confirmed_by_user
  );
  const allPostingsHaveNames = postings.every(
    (p) => p.company_name.trim() !== "" && p.role_title.trim() !== ""
  );

  let disableSaveReason = "";
  if (!allPostingsHaveNames) {
    disableSaveReason = "All postings must have a company name and role title.";
  } else if (unconfirmedDates.length > 0) {
    disableSaveReason = `Please confirm or dismiss all dates (${unconfirmedDates.length} remaining).`;
  } else if (!hasConfirmedDeadline) {
    disableSaveReason = "At least one confirmed 'Application Deadline' is required to save.";
  }

  const isSaveEnabled = disableSaveReason === "";

  const handlePostingUpdate = (index: number, updated: DrivePostingDraft) => {
    setPostings((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const handlePostingRemove = (index: number) => {
    setPostings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmAllDates = () => {
    setPostings((prev) =>
      prev.map((posting) => ({
        ...posting,
        dates: posting.dates.map((d) => ({
          ...d,
          confirmed_by_user: true,
        })),
      }))
    );
  };

  const handleAddEmptyPosting = () => {
    setPostings((prev) => [
      ...prev,
      {
        id: `draft_${Date.now()}_${prev.length}`,
        company_name: "",
        role_title: "",
        eligibility_raw: "",
        min_cgpa: null,
        eligible_branches: [],
        application_link: null,
        dates: [],
      },
    ]);
  };

  const handleSave = () => {
    if (!isSaveEnabled) return;
    setSavedSuccess(true);
    onSaveConfirmedDraft(postings);
  };

  if (savedSuccess) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-800 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
          Draft Confirmed & Validated
        </h3>
        <p className="text-xs font-light text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          All dates and criteria have been human-verified and prepared for tracking.
        </p>

        <div className="pt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="px-6 py-2.5 bg-bmw-primary hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-[0.5px] rounded-md transition-all cursor-pointer shadow-xs"
          >
            Ingest Another Notice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xs">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-bold uppercase tracking-[0.5px] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-bmw-primary dark:text-blue-400" />
          <span>Start Over</span>
        </button>

        <div className="flex items-center gap-2">
          {unconfirmedDates.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmAllDates}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm All ({unconfirmedDates.length}) Dates</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddEmptyPosting}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] px-3.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-bmw-primary dark:text-blue-400" />
            <span>Add Another Posting</span>
          </button>
        </div>
      </div>

      {/* Trust & Verification Banner */}
      <div className="p-4 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-3 text-xs text-bmw-primary dark:text-blue-400">
        <ShieldCheck className="w-5 h-5 text-bmw-primary dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-neutral-900 dark:text-white block uppercase tracking-[0.5px]">Human-in-the-Loop Confirmation Gate</span>
          <span className="text-neutral-700 dark:text-neutral-300 font-light">Each AI-extracted date requires explicit confirmation or dismissal before saving to protect against missed deadlines.</span>
        </div>
      </div>

      {/* Postings Draft List */}
      <div className="space-y-6">
        {postings.map((posting, idx) => (
          <DraftCard
            key={posting.id}
            postingIndex={idx}
            posting={posting}
            onUpdate={(updated) => handlePostingUpdate(idx, updated)}
            onRemove={() => handlePostingRemove(idx)}
          />
        ))}
      </div>

      {/* Bottom Save Action Bar */}
      <div className="sticky bottom-4 z-20 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        {/* Status / Reason Banner */}
        <div className="w-full sm:w-auto">
          {!isSaveEnabled ? (
            <div className="inline-flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-3.5 py-1.5 rounded-md font-bold uppercase tracking-[0.5px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>{disableSaveReason}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-md font-bold uppercase tracking-[0.5px]">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>All dates confirmed. Ready to save.</span>
            </div>
          )}
        </div>

        {/* Disabled / Active Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isSaveEnabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-bmw-primary hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-bmw-primary disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-[0.5px] rounded-md transition-all cursor-pointer shadow-xs"
        >
          <Save className="w-4 h-4" />
          <span>Save Confirmed Drive(s)</span>
        </button>
      </div>
    </div>
  );
};
