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
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-[#e6e6e6] shadow-2xl space-y-6 p-6 sm:p-8"
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

        {/* Top Header Section */}
        <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
          <div className="flex items-start gap-4">
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
              <div className="flex items-center gap-3 text-xs text-[#6b6b6b]">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#9a9a9a]" />
                  {drive.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1c69d4]" />
                  Deadline: {drive.primary_deadline}
                </span>
              </div>
            </div>
          </div>

          {/* CTC & Application Portal Button */}
          <div className="flex sm:flex-col items-end gap-2 shrink-0">
            <div className="px-4 py-1.5 bg-[#eff6ff] border border-[#bfdbfe] text-[#1c69d4] font-bold text-lg sm:text-xl">
              {drive.ctc_display}
            </div>
            {drive.application_link && (
              <a
                href={drive.application_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer"
              >
                <span>Portal Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Quick Status Bar */}
        <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-[1px] text-[#262626] block">
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
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1c69d4] text-white"
                      : "bg-white text-[#262626] border border-[#cccccc] hover:border-[#262626]"
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
              <h3 className="text-xs font-bold text-[#262626] uppercase tracking-[1.5px] flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#1c69d4]" />
                Eligibility Criteria
              </h3>
              <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-3 text-xs">
                <div className="flex justify-between border-b border-[#e6e6e6] pb-2">
                  <span className="text-[#6b6b6b]">Minimum CGPA</span>
                  <span className="font-bold text-[#262626] font-mono">≥ {drive.min_cgpa ?? "Not Specified"}</span>
                </div>
                <div className="border-b border-[#e6e6e6] pb-2">
                  <span className="text-[#6b6b6b] block mb-1">Eligible Branches</span>
                  <div className="flex flex-wrap gap-1.5">
                    {drive.eligible_branches.map((b) => (
                      <span key={b} className="px-2 py-0.5 bg-white border border-[#e6e6e6] text-[#262626] text-[11px] font-mono">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b6b6b]">Active Backlogs Allowed</span>
                  <span className="font-bold text-[#22c55e] font-mono">0 Backlogs</span>
                </div>
              </div>
            </div>

            {/* Role Overview */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#262626] uppercase tracking-[1.5px] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#1c69d4]" />
                Role & Requirements
              </h3>
              <div className="p-4 bg-[#fafafa] border border-[#e6e6e6] space-y-2.5 text-xs text-[#3c3c3c] font-light leading-relaxed">
                <p>{drive.description}</p>
                <div className="pt-2 border-t border-[#e6e6e6] space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#262626] block">Focus Areas:</span>
                  <ul className="list-disc list-inside space-y-1 text-[#3c3c3c]">
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
                <h3 className="text-xs font-bold text-[#262626] uppercase tracking-[1.5px] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1c69d4]" />
                  Official Circulars & Attachments
                </h3>
                <div className="space-y-2">
                  {drive.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-[#fafafa] border border-[#e6e6e6] hover:border-[#cccccc] transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-[#1c69d4] shrink-0" />
                        <span className="text-[#262626] font-medium truncate">{doc.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#6b6b6b] shrink-0">
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
              <h3 className="text-xs font-bold text-[#262626] uppercase tracking-[1.5px] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1c69d4]" />
                Recruitment Timeline & Rounds
              </h3>

              <button
                type="button"
                onClick={() => setIsAddingUpdate(!isAddingUpdate)}
                className="text-xs font-bold uppercase tracking-[0.5px] text-[#1c69d4] hover:text-[#0653b6] inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Update</span>
              </button>
            </div>

            {/* Inline Add Update Form */}
            {isAddingUpdate && (
              <form onSubmit={handleAddTimelineEvent} className="p-3.5 bg-[#fafafa] border border-[#cccccc] space-y-2.5">
                <input
                  type="text"
                  placeholder="Event title (e.g., Shortlist Released, OA Scheduled)"
                  value={newUpdateTitle}
                  onChange={(e) => setNewUpdateTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#cccccc] text-xs text-[#262626] placeholder-[#9a9a9a] focus:outline-none focus:border-[#1c69d4]"
                />
                <textarea
                  placeholder="Notes or instructions..."
                  value={newUpdateNotes}
                  onChange={(e) => setNewUpdateNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 bg-white border border-[#cccccc] text-xs text-[#262626] placeholder-[#9a9a9a] focus:outline-none focus:border-[#1c69d4]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUpdate(false)}
                    className="px-2.5 py-1 text-xs font-bold uppercase tracking-[0.5px] text-[#6b6b6b] hover:text-[#262626]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold uppercase tracking-[0.5px] bg-[#1c69d4] hover:bg-[#0653b6] text-white"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            )}

            {/* Timeline Stream */}
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[#e6e6e6] pl-8">
              {localTimeline.map((item, idx) => (
                <div key={idx} className="relative group">
                  {/* Node Dot */}
                  <div className="absolute -left-8 top-1 w-6 h-6 bg-white border-2 border-[#1c69d4] flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#1c69d4]" />
                  </div>

                  <div className="p-3 bg-[#fafafa] border border-[#e6e6e6] group-hover:border-[#cccccc] transition-colors space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#262626]">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-mono text-[#1c69d4] px-1.5 py-0.2 bg-[#eff6ff] border border-[#bfdbfe]">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-light text-[#6b6b6b]">
                      {item.notes}
                    </p>
                    <span className="text-[10px] text-[#9a9a9a] font-mono block pt-1">
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
