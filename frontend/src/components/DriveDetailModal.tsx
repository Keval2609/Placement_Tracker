import React, { useCallback, useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  MapPin,
  Clock,
  Briefcase,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { DriveDetail, TimelineEvent, ApplicationStatus } from "../types/drive";
import {
  fetchDriveDetail,
  fetchDriveTimeline,
  updateApplicationStatus,
} from "../services/api";
import { JobDescriptionCard } from "./JobDescriptionCard";
import { TimelineSection } from "./TimelineSection";
import { AddUpdateModal } from "./AddUpdateModal";

interface DriveDetailModalProps {
  driveId: string | null;
  applicationId?: string;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

const STATUS_OPTIONS: { id: ApplicationStatus; label: string }[] = [
  { id: "not_applied", label: "Not Applied" },
  { id: "applied", label: "Applied" },
  { id: "oa", label: "OA Test Stage" },
  { id: "interview", label: "Interview Round" },
  { id: "offer", label: "Offer Accepted 🎉" },
  { id: "rejected", label: "Not Selected" },
  { id: "withdrawn", label: "Withdrawn" },
];

export const DriveDetailModal: React.FC<DriveDetailModalProps> = ({
  driveId,
  applicationId,
  onClose,
  onStatusUpdated,
}) => {
  const [drive, setDrive] = useState<DriveDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [isAddUpdateOpen, setIsAddUpdateOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!driveId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [driveData, timelineData] = await Promise.all([
        fetchDriveDetail(driveId),
        fetchDriveTimeline(driveId),
      ]);
      setDrive(driveData);
      setTimeline(timelineData);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed loading placement drive details.");
    } finally {
      setIsLoading(false);
    }
  }, [driveId]);

  useEffect(() => {
    if (driveId) {
      loadData();
    }
  }, [driveId, loadData]);

  // Handle Escape Key to dismiss modal
  useEffect(() => {
    if (!driveId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [driveId, onClose]);

  if (!driveId) return null;

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!drive) return;
    const newStatus = e.target.value as ApplicationStatus;
    setIsUpdatingStatus(true);
    try {
      const targetAppId = applicationId || drive.application_id || drive.id;
      await updateApplicationStatus(targetAppId, newStatus);
      setDrive({ ...drive, application_status: newStatus });
      if (onStatusUpdated) onStatusUpdated();
      await loadData();
    } catch (err: unknown) {
      console.error("Failed updating application status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const primaryDeadlineIso =
    drive?.dates?.find((d) => d.is_primary_deadline)?.date_iso ||
    drive?.primary_deadline_iso;

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "TBD";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-8 space-y-6 rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close placement drive details"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-600 dark:text-neutral-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-bmw-primary" />
            <span className="text-sm font-medium">Loading drive details...</span>
          </div>
        ) : error || !drive ? (
          <div className="p-8 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Error Loading Drive</h3>
            <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">{error || "Drive record not found."}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Header Section */}
            <div className="flex flex-wrap items-start justify-between gap-4 pt-2 border-b border-neutral-200 dark:border-neutral-800 pb-5">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {/* Monogram Avatar */}
                <div className="w-14 h-14 bg-bmw-surface-dark border border-neutral-800 rounded-lg flex items-center justify-center font-bold text-xl text-white shrink-0">
                  {drive.company_name.slice(0, 2).toUpperCase()}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 id="drive-detail-title" className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                      {drive.company_name}
                    </h2>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {drive.company_type}
                    </span>
                  </div>
                  <p className="text-sm font-normal text-neutral-700 dark:text-neutral-300 truncate">
                    {drive.role_title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      {drive.location || "Campus / Remote"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono font-medium">
                      <Clock className="w-3.5 h-3.5 text-bmw-primary" />
                      Deadline: {formatDate(primaryDeadlineIso)}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTC & External Portal Link */}
              <div className="flex sm:flex-col items-end gap-2 shrink-0">
                <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-bmw-primary dark:text-blue-400 font-bold text-lg sm:text-xl rounded-md">
                  {drive.ctc_display || "Not Disclosed"}
                </div>
                {drive.application_link && (
                  <a
                    href={drive.application_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-bmw-primary hover:bg-bmw-primary-active rounded-md transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary"
                  >
                    <span>Open Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Status Control Bar */}
            <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 p-3.5 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-bmw-primary" />
                <label htmlFor="modal-status-select" className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                  Candidate Application Stage:
                </label>
              </div>
              <div className="flex items-center gap-2">
                <select
                  id="modal-status-select"
                  aria-label="Update candidate stage in details"
                  value={drive.application_status}
                  onChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-bmw-primary focus:border-bmw-primary cursor-pointer disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {opt.label}
                    </option>
                  ))}
                </select>
                {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin text-bmw-primary" />}
              </div>
            </div>

            {/* Job Details & Description Card */}
            <JobDescriptionCard
              drive={drive}
              onOpenAddUpdate={() => setIsAddUpdateOpen(true)}
            />

            {/* Timeline Section */}
            <TimelineSection timeline={timeline} />

            {/* Add Update Modal */}
            <AddUpdateModal
              driveId={drive.id}
              isOpen={isAddUpdateOpen}
              onClose={() => setIsAddUpdateOpen(false)}
              onUpdateConfirmed={loadData}
            />
          </div>
        )}
      </div>
    </div>
  );
};
