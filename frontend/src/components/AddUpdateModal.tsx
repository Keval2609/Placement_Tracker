import React, { useState } from "react";
import { X, Sparkles, AlertCircle, Check, Plus, Upload, Loader2 } from "lucide-react";
import { DateRow } from "./DateRow";
import { DetectedDateDraft } from "../types/extraction";
import { DriveUpdateDraft } from "../types/drive";
import {
  proposeDriveUpdateText,
  proposeDriveUpdateFile,
  confirmDriveUpdate,
} from "../services/api";

interface AddUpdateModalProps {
  driveId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateConfirmed: () => void;
}

export const AddUpdateModal: React.FC<AddUpdateModalProps> = ({
  driveId,
  isOpen,
  onClose,
  onUpdateConfirmed,
}) => {
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<DriveUpdateDraft | null>(null);
  const [dates, setDates] = useState<DetectedDateDraft[]>([]);
  const [fieldChanges, setFieldChanges] = useState<Record<string, unknown>>({});
  const [summaryOfChanges, setSummaryOfChanges] = useState<string>("");

  if (!isOpen) return null;

  const handleProposeDiff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let result: DriveUpdateDraft;
      if (selectedFile) {
        result = await proposeDriveUpdateFile(driveId, selectedFile, textInput);
      } else if (textInput.trim()) {
        result = await proposeDriveUpdateText(driveId, textInput);
      } else {
        throw new Error("Please paste text or upload a document file.");
      }

      setDraft(result);
      setDates(result.update_result.new_dates || []);
      setFieldChanges(result.update_result.field_changes || {});
      setSummaryOfChanges(result.update_result.summary_of_changes || "");
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to extract update diff.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDate = (index: number, updated: DetectedDateDraft) => {
    setDates((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const handleDismissDate = (index: number) => {
    setDates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddManualDate = () => {
    const newDate: DetectedDateDraft = {
      id: `manual_${Date.now()}`,
      date_type: "other",
      label: "New Event",
      date_iso: new Date().toISOString(),
      date_raw: "Manual entry",
      source: "user_added",
      confirmed_by_user: true,
    };
    setDates((prev) => [...prev, newDate]);
  };

  const handleConfirmMerge = async () => {
    if (!draft) return;
    setError(null);
    setIsLoading(true);

    try {
      await confirmDriveUpdate(driveId, draft.update_id, {
        confirmed_new_dates: dates,
        confirmed_field_changes: fieldChanges,
        summary_of_changes: summaryOfChanges,
        raw_text: draft.raw_text || undefined,
        source_type: draft.source_type,
      });

      onUpdateConfirmed();
      handleClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to merge update.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDraft(null);
    setTextInput("");
    setSelectedFile(null);
    setError(null);
    setDates([]);
    setFieldChanges({});
    setSummaryOfChanges("");
    onClose();
  };

  const allDatesConfirmed = dates.every((d) => d.confirmed_by_user !== false);
  const canSave = allDatesConfirmed && !isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl w-full max-w-2xl my-8 shadow-2xl overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-bmw-primary dark:text-blue-400" />
            <h2 className="text-base font-bold uppercase tracking-[1px] text-neutral-900 dark:text-white">
              Add Drive Update
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!draft ? (
            /* Stage 1: Input Form */
            <form onSubmit={handleProposeDiff} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200">
                  Paste Follow-up WhatsApp Message
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g. Interview shortlisted candidates: OA results out! Interview on the 12th at 10 AM..."
                  rows={5}
                  className="w-full text-xs p-3 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-bmw-primary dark:focus:border-blue-400 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200">
                  Or Attach Follow-up Circular File (.pdf / .docx)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.5px] bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-md cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-bmw-primary dark:text-blue-400" />
                    <span>{selectedFile ? selectedFile.name : "Choose File"}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline font-bold uppercase tracking-wider"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading || (!textInput.trim() && !selectedFile)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-bmw-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Diff...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract Proposed Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Stage 2: Diff Confirmation Gate */
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                <div className="font-bold text-bmw-primary dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-[1px]">
                  <Sparkles className="w-4 h-4" />
                  <span>Proposed Change Summary</span>
                </div>
                <div className="text-neutral-800 dark:text-neutral-200 font-light">
                  {summaryOfChanges || "No changes extracted."}
                </div>
              </div>

              {/* Proposed Field Changes */}
              {Object.keys(fieldChanges).length > 0 && (
                <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-[1px] text-neutral-900 dark:text-white">
                    Proposed Field Modifications
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {Object.entries(fieldChanges).map(([k, v]) => (
                      <div key={k} className="p-2 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                        <span className="text-neutral-500 dark:text-neutral-400 uppercase font-mono text-[10px] block">
                          {k}
                        </span>
                        <span className="text-bmw-primary dark:text-blue-400 font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Dates with DateRow Confirmation Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-[1.5px] text-neutral-900 dark:text-white">
                    Proposed New Dates ({dates.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualDate}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-bmw-primary dark:text-blue-400 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Date Manually</span>
                  </button>
                </div>

                {dates.length === 0 ? (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 italic bg-neutral-50 dark:bg-neutral-800/40 p-4 text-center border border-neutral-200 dark:border-neutral-800 rounded-lg">
                    No new dates extracted from this update.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dates.map((date, idx) => (
                      <DateRow
                        key={date.id || idx}
                        date={date}
                        onUpdate={(updated) => handleUpdateDate(idx, updated)}
                        onDismiss={() => handleDismissDate(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Save Gate Status Explanation */}
              {!allDatesConfirmed && (
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2 font-bold uppercase tracking-[0.5px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please confirm or dismiss all AI-suggested dates above before saving.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="text-xs font-bold uppercase tracking-[0.5px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  ← Back to edit input
                </button>

                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={!canSave}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-bmw-primary hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Confirm & Merge Update</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
