import React, { useEffect, useState } from "react";
import { X, FileText } from "lucide-react";
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingest-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-8 space-y-5 rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close add placement drive modal"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors cursor-pointer z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tpo-cobalt"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-registry-border dark:border-registry-dark-border pb-4">
          <div className="w-10 h-10 bg-tpo-navy border border-neutral-800 rounded-lg flex items-center justify-center text-white shrink-0">
            <FileText className="w-5 h-5 text-tpo-accent" />
          </div>
          <div>
            <h2 id="ingest-modal-title" className="text-lg font-serif font-bold text-neutral-900 dark:text-white">
              {extractionResult ? "Review & Confirm Circular" : "TPO Circular & Application Dispatch"}
            </h2>
            <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
              {extractionResult
                ? "Verify extracted criteria, deadlines, and salary details before saving to registry."
                : "Parse WhatsApp placement circulars, official PDFs, or record direct off-campus applications."}
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
                const results = await Promise.allSettled(
                  postings.map((p) => createDrive(p))
                );
                const failed = results.filter((r) => r.status === "rejected");
                const succeeded = results.filter((r) => r.status === "fulfilled");

                if (failed.length === 0) {
                  handleSuccess();
                  return;
                }

                if (succeeded.length > 0) {
                  alert(
                    `${succeeded.length} drive(s) saved successfully, but ${failed.length} failed. ` +
                      `The failed drives can be retried.`
                  );
                } else {
                  alert("Failed to save drives. Please try again.");
                }
                console.error("Drive save failures:", failed);
                throw new Error(`${failed.length} drive(s) failed to save`);
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
