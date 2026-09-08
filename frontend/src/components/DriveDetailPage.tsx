import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { DriveDetailHeader } from "./DriveDetailHeader";
import { TimelineSection } from "./TimelineSection";
import { DocumentsSection } from "./DocumentsSection";
import { AddUpdateModal } from "./AddUpdateModal";
import { DriveDetail, TimelineEvent, DocumentItem } from "../types/drive";
import {
  fetchDriveDetail,
  fetchDriveTimeline,
  fetchDriveDocuments,
} from "../services/api";

interface DriveDetailPageProps {
  driveId: string;
  onBackToDashboard?: () => void;
}

export const DriveDetailPage: React.FC<DriveDetailPageProps> = ({
  driveId,
  onBackToDashboard,
}) => {
  const [drive, setDrive] = useState<DriveDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddUpdateOpen, setIsAddUpdateOpen] = useState<boolean>(false);

  const loadAllDriveData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [driveData, timelineData, docsData] = await Promise.all([
        fetchDriveDetail(driveId),
        fetchDriveTimeline(driveId),
        fetchDriveDocuments(driveId),
      ]);

      setDrive(driveData);
      setTimeline(timelineData);
      setDocuments(docsData);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load drive details.");
    } finally {
      setIsLoading(false);
    }
  }, [driveId]);

  useEffect(() => {
    loadAllDriveData();
  }, [loadAllDriveData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-[#6b6b6b]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1c69d4]" />
        <span className="text-sm font-light">Loading placement drive detail...</span>
      </div>
    );
  }

  if (error || !drive) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] hover:text-[#0653b6] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="p-8 bg-[#fef2f2] border border-[#fecaca] space-y-2 text-center">
          <AlertCircle className="w-8 h-8 text-[#dc2626] mx-auto" />
          <h2 className="text-base font-bold text-[#262626]">Error Loading Drive</h2>
          <p className="text-xs font-light text-[#6b6b6b]">{error || "Drive record not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#cccccc] hover:bg-[#f7f7f7] text-xs font-bold uppercase tracking-[0.5px] text-[#262626] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#1c69d4]" />
          <span>Back to Dashboard</span>
        </button>

        <span className="text-[11px] font-mono text-[#6b6b6b] bg-[#f7f7f7] px-3 py-1 border border-[#e6e6e6]">
          Drive Reference: {drive.id.slice(0, 8)}...
        </span>
      </div>

      {/* Header View */}
      <DriveDetailHeader
        drive={drive}
        onOpenAddUpdate={() => setIsAddUpdateOpen(true)}
      />

      {/* Timeline View */}
      <TimelineSection timeline={timeline} />

      {/* Attached Documents View */}
      <DocumentsSection documents={documents} />

      {/* Add Update Modal */}
      <AddUpdateModal
        driveId={drive.id}
        isOpen={isAddUpdateOpen}
        onClose={() => setIsAddUpdateOpen(false)}
        onUpdateConfirmed={loadAllDriveData}
      />
    </div>
  );
};
