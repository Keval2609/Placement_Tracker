import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { IngestInput } from "./IngestInput";
import { ConfirmationScreen } from "./ConfirmationScreen";
import { ExtractionAPIResponse } from "../types/extraction";
import { createDrive } from "../services/api";

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriveCreated?: () => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onDriveCreated,
}) => {
  const [extractionResult, setExtractionResult] = useState<ExtractionAPIResponse | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setExtractionResult(null);
  };

  const handleSuccess = () => {
    setExtractionResult(null);
    onClose();
    if (onDriveCreated) onDriveCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white border border-[#e6e6e6] shadow-2xl p-6 sm:p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-[#f7f7f7] border border-[#e6e6e6] text-[#6b6b6b] hover:text-[#262626] hover:bg-[#ebebeb] transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-[#e6e6e6] pb-4">
          <div className="w-10 h-10 bg-[#1a2129] border border-[#262e38] flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-5 h-5 text-[#1c69d4]" />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[1px] text-[#262626]">
              {extractionResult ? "Review & Confirm Drive" : "Add Placement Drive"}
            </h2>
            <p className="text-xs font-light text-[#6b6b6b]">
              {extractionResult
                ? "Verify extracted criteria, deadlines, and salary details before saving."
                : "AI Parse WhatsApp placement circulars, PDFs, or record off-campus applications."}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div>
          {extractionResult ? (
            <ConfirmationScreen
              initialResult={extractionResult}
              onReset={handleReset}
              onSaveConfirmedDraft={async (postings) => {
                try {
                  await Promise.all(postings.map((p) => createDrive(p)));
                  handleSuccess();
                } catch (error) {
                  console.error("Failed to save drives:", error);
                  alert("Failed to save drives. Please try again.");
                }
              }}
            />
          ) : (
            <IngestInput
              onExtractionSuccess={(data) => setExtractionResult(data)}
              onDirectSaveSuccess={handleSuccess}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
