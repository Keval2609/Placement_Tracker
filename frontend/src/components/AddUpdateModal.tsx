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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-[#e6e6e6] w-full max-w-2xl my-8 shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e6e6e6] flex items-center justify-between bg-[#fafafa]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1c69d4]" />
            <h2 className="text-base font-bold uppercase tracking-[1px] text-[#262626]">
              Add Drive Update
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-[#6b6b6b] hover:text-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!draft ? (
            /* Stage 1: Input Form */
            <form onSubmit={handleProposeDiff} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[1px] text-[#262626]">
                  Paste Follow-up WhatsApp Message
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="e.g. Interview shortlisted candidates: OA results out! Interview on the 12th at 10 AM..."
                  rows={5}
                  className="w-full text-xs p-3 bg-white border border-[#cccccc] text-[#262626] placeholder:text-[#9a9a9a] focus:outline-none focus:border-[#1c69d4] font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-[1px] text-[#262626]">
                  Or Attach Follow-up Circular File (.pdf / .docx)
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.5px] bg-[#f7f7f7] hover:bg-[#ebebeb] text-[#262626] border border-[#cccccc] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#1c69d4]" />
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
                      className="text-xs text-[#dc2626] hover:underline font-bold uppercase tracking-wider"
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
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
              <div className="p-4 bg-[#eff6ff] border border-[#bfdbfe] text-xs space-y-1">
                <div className="font-bold text-[#1c69d4] flex items-center gap-1.5 uppercase tracking-[1px]">
                  <Sparkles className="w-4 h-4" />
                  <span>Proposed Change Summary</span>
                </div>
                <div className="text-[#262626] font-light">
                  {summaryOfChanges || "No changes extracted."}
                </div>
              </div>

              {/* Proposed Field Changes */}
              {Object.keys(fieldChanges).length > 0 && (
                <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-2">
                  <div className="text-xs font-bold uppercase tracking-[1px] text-[#262626]">
                    Proposed Field Modifications
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {Object.entries(fieldChanges).map(([k, v]) => (
                      <div key={k} className="p-2 bg-white border border-[#cccccc]">
                        <span className="text-[#6b6b6b] uppercase font-mono text-[10px] block">
                          {k}
                        </span>
                        <span className="text-[#1c69d4] font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Dates with DateRow Confirmation Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-[1.5px] text-[#262626]">
                    Proposed New Dates ({dates.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualDate}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] hover:text-[#0653b6]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Date Manually</span>
                  </button>
                </div>

                {dates.length === 0 ? (
                  <div className="text-xs text-[#6b6b6b] italic bg-[#fafafa] p-4 text-center border border-[#e6e6e6]">
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
                <div className="p-3 bg-[#fffbeb] border border-[#fde68a] text-[#b45309] text-xs flex items-center gap-2 font-bold uppercase tracking-[0.5px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please confirm or dismiss all AI-suggested dates above before saving.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#e6e6e6]">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="text-xs font-bold uppercase tracking-[0.5px] text-[#6b6b6b] hover:text-[#262626]"
                >
                  ← Back to edit input
                </button>

                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={!canSave}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
