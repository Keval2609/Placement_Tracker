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
      // Fallback empty draft if AI output was empty
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
        confirmed_by_user: false, // Flagged unconfirmed by default
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
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-8 text-center space-y-4 shadow-2xl">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-xl font-bold text-slate-100">
          Draft Confirmed & Prepared for Persistence!
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          All dates have been human-confirmed. This payload is validated and ready
          for <code className="text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded">POST /drives</code>.
        </p>

        <div className="pt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Ingest Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Start Over
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddEmptyPosting}
            className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Posting
          </button>
        </div>
      </div>

      {/* Trust & Constraint Banner */}
      <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-start gap-3 text-xs text-indigo-200">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Human-in-the-loop Confirmation Gate:</span> Each
          AI-suggested date requires explicit confirmation, edit, or dismissal before
          saving. Bulk-confirm is disabled by design.
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
      <div className="sticky bottom-4 z-10 bg-slate-950/90 backdrop-blur border border-slate-800 p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status / Reason Banner */}
        <div className="w-full sm:w-auto">
          {!isSaveEnabled ? (
            <div className="inline-flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{disableSaveReason}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>All dates human-confirmed! Ready to save.</span>
            </div>
          )}
        </div>

        {/* Disabled / Active Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isSaveEnabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-lg"
        >
          <Save className="w-4 h-4" /> Save Confirmed Drive(s)
        </button>
      </div>
    </div>
  );
};
