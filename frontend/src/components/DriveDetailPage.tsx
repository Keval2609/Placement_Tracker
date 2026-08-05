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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-medium">Loading placement drive detail...</span>
      </div>
    );
  }

  if (error || !drive) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Ingestion</span>
        </button>

        <div className="p-6 bg-slate-900 border border-red-500/30 rounded-xl space-y-2 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Error Loading Drive</h2>
          <p className="text-xs text-slate-400">{error || "Drive record not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-indigo-400" />
          <span>← Back to Ingestion Workflow</span>
        </button>

        <span className="text-[11px] font-mono text-slate-500">
          Drive ID: {drive.id.slice(0, 8)}...
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
