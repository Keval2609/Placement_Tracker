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

  // Determine Save button disabled state and reason
  let disableSaveReason: string | null = null;

  if (postings.length === 0) {
    disableSaveReason = "At least one posting is required to save.";
  } else if (!allPostingsHaveNames) {
    disableSaveReason = "Fill in Company Name and Role Title for all postings.";
  } else if (!hasConfirmedDeadline) {
    disableSaveReason =
      "Confirm at least one Application Deadline date to enable save.";
  } else if (unconfirmedDates.length > 0) {
    disableSaveReason = `Review and confirm or dismiss remaining AI-suggested dates (${unconfirmedDates.length} unconfirmed).`;
  }

  const isSaveEnabled = disableSaveReason === null;

  const handlePostingUpdate = (index: number, updated: DrivePostingDraft) => {
    const next = [...postings];
    next[index] = updated;
    setPostings(next);
  };

  const handlePostingRemove = (index: number) => {
    setPostings(postings.filter((_, i) => i !== index));
  };

  const handleAddEmptyPosting = () => {
    setPostings([
      ...postings,
      {
        id: `draft_${Date.now()}_${postings.length}`,
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
      <div className="bg-white border border-[#bbf7d0] p-8 text-center space-y-4 max-w-xl mx-auto">
        <div className="w-16 h-16 bg-[#ecfdf5] border border-[#bbf7d0] text-[#15803d] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#262626] tracking-tight">
          Draft Confirmed & Validated
        </h3>
        <p className="text-xs font-light text-[#6b6b6b] max-w-md mx-auto leading-relaxed">
          All dates and criteria have been human-verified and prepared for tracking.
        </p>

        <div className="pt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="px-6 py-2.5 bg-[#1c69d4] hover:bg-[#0653b6] text-white text-xs font-bold uppercase tracking-[0.5px] transition-all"
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-[#e6e6e6]">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#f7f7f7] border border-[#e6e6e6] text-xs font-bold uppercase tracking-[0.5px] text-[#262626] hover:bg-[#ebebeb] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#1c69d4]" />
          <span>Start Over</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddEmptyPosting}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] px-4 py-2 bg-white hover:bg-[#f7f7f7] text-[#262626] border border-[#cccccc] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#1c69d4]" />
            <span>Add Another Posting</span>
          </button>
        </div>
      </div>

      {/* Trust & Verification Banner */}
      <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] flex items-start gap-3 text-xs text-[#1c69d4]">
        <ShieldCheck className="w-5 h-5 text-[#1c69d4] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#262626] block uppercase tracking-[0.5px]">Human-in-the-Loop Confirmation Gate</span>
          <span className="text-[#3c3c3c] font-light">Each AI-extracted date requires explicit confirmation or dismissal before saving to protect against missed deadlines.</span>
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
      <div className="sticky bottom-4 z-20 bg-white border border-[#e6e6e6] p-4.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        {/* Status / Reason Banner */}
        <div className="w-full sm:w-auto">
          {!isSaveEnabled ? (
            <div className="inline-flex items-center gap-2 text-xs text-[#b45309] bg-[#fffbeb] border border-[#fde68a] px-3.5 py-1.5 font-bold uppercase tracking-[0.5px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#b45309]" />
              <span>{disableSaveReason}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs text-[#15803d] bg-[#ecfdf5] border border-[#bbf7d0] px-3.5 py-1.5 font-bold uppercase tracking-[0.5px]">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803d]" />
              <span>All dates confirmed. Ready to save.</span>
            </div>
          )}
        </div>

        {/* Disabled / Active Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isSaveEnabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1c69d4] hover:bg-[#0653b6] disabled:opacity-40 disabled:hover:bg-[#1c69d4] disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-[0.5px] transition-all cursor-pointer shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>Save Confirmed Drive(s)</span>
        </button>
      </div>
    </div>
  );
};
