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
      date_raw: "User added",
      source: "user_added",
      confirmed_by_user: true,
    };
    setDates((prev) => [...prev, newDate]);
  };

  // Gate: All remaining dates must be confirmed before save is enabled
  const allDatesConfirmed = dates.every((d) => d.confirmed_by_user);
  const canSave = allDatesConfirmed && !isLoading;

  const handleConfirmMerge = async () => {
    if (!draft || !canSave) return;
    setIsLoading(true);
    setError(null);

    try {
      await confirmDriveUpdate(driveId, draft.update_id, {
        confirmed_new_dates: dates,
        confirmed_field_changes: fieldChanges,
        summary_of_changes: summaryOfChanges,
        raw_text: draft.raw_text || textInput,
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Add Drive Update
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!draft ? (
            /* Stage 1: Input Form */
            <form onSubmit={handleProposeDiff} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Paste Follow-up WhatsApp Message
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g. Interview shortlisted candidates: OA results out! Interview on the 12th at 10 AM..."
                  rows={5}
                  className="w-full text-xs p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Or Attach Follow-up Circular File (.pdf / .docx)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-indigo-400" />
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
                      className="text-xs text-red-400 hover:text-red-300"
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
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
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
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs space-y-1">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Proposed Change Summary</span>
                </div>
                <div className="text-slate-300 font-medium">
                  {summaryOfChanges || "No changes extracted."}
                </div>
              </div>

              {/* Proposed Field Changes */}
              {Object.keys(fieldChanges).length > 0 && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="text-xs font-bold text-slate-300">
                    Proposed Field Modifications
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {Object.entries(fieldChanges).map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 uppercase font-mono text-[10px] block">
                          {k}
                        </span>
                        <span className="text-indigo-300 font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Dates with DateRow Confirmation Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Proposed New Dates ({dates.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualDate}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Date Manually</span>
                  </button>
                </div>

                {dates.length === 0 ? (
                  <div className="text-xs text-slate-400 italic bg-slate-950 p-4 rounded text-center border border-slate-800">
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
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-300 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please confirm or dismiss all AI-suggested dates above before saving.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Back to edit input
                </button>

                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={!canSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
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
