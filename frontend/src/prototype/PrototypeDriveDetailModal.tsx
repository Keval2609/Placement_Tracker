import React, { useState, useEffect } from "react";
import { PrototypeDrive } from "./mockData";
import {
  X,
  ExternalLink,
  MapPin,
  Clock,
  GraduationCap,
  Briefcase,
  FileText,
  Calendar,
  Plus
} from "lucide-react";

interface PrototypeDriveDetailModalProps {
  drive: PrototypeDrive | null;
  onClose: () => void;
  onUpdateStatus: (driveId: string, status: PrototypeDrive["application_status"]) => void;
}

export const PrototypeDriveDetailModal: React.FC<PrototypeDriveDetailModalProps> = ({
  drive,
  onClose,
  onUpdateStatus,
}) => {
  const [newUpdateTitle, setNewUpdateTitle] = useState("");
  const [newUpdateNotes, setNewUpdateNotes] = useState("");
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [localTimeline, setLocalTimeline] = useState(drive?.timeline ?? []);

  useEffect(() => {
    if (drive) {
      setLocalTimeline(drive.timeline);
    }
  }, [drive]);

  if (!drive) return null;

  const handleAddTimelineEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpdateTitle.trim()) return;

    const newEvent = {
      title: newUpdateTitle,
      date: "Today, Just now",
      badge: "Update",
      notes: newUpdateNotes || "Manual update added by candidate",
      type: "info" as const,
    };

    setLocalTimeline([newEvent, ...localTimeline]);
    setNewUpdateTitle("");
    setNewUpdateNotes("");
    setIsAddingUpdate(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl space-y-6 p-6 sm:p-8 text-neutral-800 dark:text-neutral-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Section */}
        <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 bg-[#1a2129] border border-[#262e38] rounded-lg flex items-center justify-center font-bold text-xl text-white shrink-0">
              {drive.company_name.slice(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight truncate">
                  {drive.company_name}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  {drive.company_type}
                </span>
              </div>
              <p className="text-sm font-light text-neutral-700 dark:text-neutral-300 truncate">
                {drive.role_title}
              </p>
              <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                  {drive.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1c69d4] dark:text-blue-400" />
                  Deadline: {drive.primary_deadline}
                </span>
              </div>
            </div>
          </div>

          {/* CTC & Application Portal Button */}
          <div className="flex sm:flex-col items-end gap-2 shrink-0">
            <div className="px-4 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-[#1c69d4] dark:text-blue-400 font-bold text-lg sm:text-xl">
              {drive.ctc_display}
            </div>
            {drive.application_link && (
              <a
                href={drive.application_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
              >
                <span>Portal Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Quick Status Bar */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-[1px] text-neutral-800 dark:text-neutral-200 block">
            Update Application Stage:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "not_applied", label: "Not Applied" },
              { id: "applied", label: "Applied" },
              { id: "oa", label: "OA Test Scheduled" },
              { id: "interview", label: "Interview Round" },
              { id: "offer", label: "Offer Received 🎉" },
              { id: "rejected", label: "Not Shortlisted" },
            ].map((st) => {
              const isActive = drive.application_status === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onUpdateStatus(drive.id, st.id as PrototypeDrive["application_status"])}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] rounded-md transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1c69d4] text-white shadow-xs"
                      : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-Column Grid: Details & Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Eligibility & JD */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-[1.5px] flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#1c69d4] dark:text-blue-400" />
                Eligibility Criteria
              </h3>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3 text-xs">
                <div className="flex justify-between border-b border-neutral-200 dark:border-neutral-700 pb-2">
                  <span className="text-neutral-500 dark:text-neutral-400">Minimum CGPA</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 font-mono">≥ {drive.min_cgpa ?? "Not Specified"}</span>
                </div>
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-2">
                  <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Eligible Branches</span>
                  <div className="flex flex-wrap gap-1.5">
                    {drive.eligible_branches.map((b) => (
                      <span key={b} className="px-2 py-0.5 bg-white dark:bg-neutral-700/80 border border-neutral-200 dark:border-neutral-600 rounded-sm text-neutral-800 dark:text-neutral-200 text-[11px] font-mono">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Active Backlogs Allowed</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">0 Backlogs</span>
                </div>
              </div>
            </div>

            {/* Role Overview */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-[1.5px] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#1c69d4] dark:text-blue-400" />
                Role & Requirements
              </h3>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2.5 text-xs text-neutral-700 dark:text-neutral-300 font-light leading-relaxed">
                <p>{drive.description}</p>
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100 block">Focus Areas:</span>
                  <ul className="list-disc list-inside space-y-1 text-neutral-600 dark:text-neutral-300">
                    {drive.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Attached Documents */}
            {drive.documents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-[1.5px] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1c69d4] dark:text-blue-400" />
                  Official Circulars & Attachments
                </h3>
                <div className="space-y-2">
                  {drive.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-md bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[#1c69d4] dark:text-blue-400 shrink-0" />
                        <span className="text-neutral-800 dark:text-neutral-200 font-medium truncate">{doc.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 shrink-0">
                        {doc.size}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Recruitment Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-[1.5px] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1c69d4] dark:text-blue-400" />
                Recruitment Timeline & Rounds
              </h3>

              <button
                type="button"
                onClick={() => setIsAddingUpdate(!isAddingUpdate)}
                className="text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Update</span>
              </button>
            </div>

            {/* Inline Add Update Form */}
            {isAddingUpdate && (
              <form onSubmit={handleAddTimelineEvent} className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 space-y-2.5">
                <input
                  type="text"
                  placeholder="Event title (e.g., Shortlist Released, OA Scheduled)"
                  value={newUpdateTitle}
                  onChange={(e) => setNewUpdateTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#1c69d4]"
                />
                <textarea
                  placeholder="Notes or instructions..."
                  value={newUpdateNotes}
                  onChange={(e) => setNewUpdateNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#1c69d4]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUpdate(false)}
                    className="px-2.5 py-1 text-xs font-bold uppercase tracking-[0.5px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-[0.5px] bg-[#1c69d4] hover:bg-blue-700 text-white rounded-md cursor-pointer"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            )}

            {/* Timeline Stream */}
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-200 dark:before:bg-neutral-800 pl-8">
              {localTimeline.map((item, idx) => (
                <div key={idx} className="relative group">
                  {/* Node Dot */}
                  <div className="absolute -left-8 top-1 w-6 h-6 rounded-full bg-white dark:bg-neutral-900 border-2 border-[#1c69d4] dark:border-blue-400 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#1c69d4] dark:bg-blue-400" />
                  </div>

                  <div className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 group-hover:border-neutral-300 dark:group-hover:border-neutral-700 transition-colors space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#1c69d4] dark:text-blue-400 px-1.5 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-light text-neutral-600 dark:text-neutral-400">
                      {item.notes}
                    </p>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono block pt-1">
                      {item.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
