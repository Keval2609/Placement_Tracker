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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#e6e6e6] shadow-2xl p-6 sm:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-[#f7f7f7] border border-[#e6e6e6] text-[#6b6b6b] hover:text-[#262626] hover:bg-[#ebebeb] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#6b6b6b] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1c69d4]" />
            <span className="text-sm font-light">Loading drive details...</span>
          </div>
        ) : error || !drive ? (
          <div className="p-8 bg-[#fef2f2] border border-[#fecaca] text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-[#dc2626] mx-auto" />
            <h3 className="text-base font-bold text-[#262626]">Error Loading Drive</h3>
            <p className="text-xs font-light text-[#6b6b6b]">{error || "Drive record not found."}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Header Section */}
            <div className="flex flex-wrap items-start justify-between gap-4 pt-2 border-b border-[#e6e6e6] pb-5">
              <div className="flex items-start gap-4">
                {/* Monogram Avatar */}
                <div className="w-14 h-14 bg-[#1a2129] border border-[#262e38] flex items-center justify-center font-bold text-xl text-white shrink-0">
                  {drive.company_name.slice(0, 2).toUpperCase()}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-bold text-[#262626] tracking-tight">
                      {drive.company_name}
                    </h2>
                    <span className="text-[10px] font-bold uppercase tracking-[1px] px-2 py-0.5 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6]">
                      {drive.company_type}
                    </span>
                  </div>
                  <p className="text-sm font-light text-[#3c3c3c]">
                    {drive.role_title}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[#6b6b6b] flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#9a9a9a]" />
                      {drive.location || "Campus / Remote"}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[#1c69d4]" />
                      Deadline: {formatDate(primaryDeadlineIso)}
                    </span>
                  </div>
                </div>
              </div>

              {/* CTC & External Portal Link */}
              <div className="flex sm:flex-col items-end gap-2 shrink-0">
                <div className="px-4 py-1.5 bg-[#eff6ff] border border-[#bfdbfe] text-[#1c69d4] font-bold text-lg sm:text-xl">
                  {drive.ctc_display || "Not Disclosed"}
                </div>
                {drive.application_link && (
                  <a
                    href={drive.application_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer"
                  >
                    <span>Open Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Status Control Bar */}
            <div className="bg-[#f7f7f7] border border-[#e6e6e6] p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#1c69d4]" />
                <span className="text-xs font-bold uppercase tracking-[1px] text-[#262626]">
                  Candidate Application Stage:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={drive.application_status}
                  onChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 bg-white border border-[#cccccc] text-xs font-bold text-[#262626] focus:outline-none focus:border-[#1c69d4] cursor-pointer disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin text-[#1c69d4]" />}
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
