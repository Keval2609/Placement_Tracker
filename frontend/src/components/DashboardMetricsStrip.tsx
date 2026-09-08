import React from "react";
import { Briefcase, AlertTriangle, GitPullRequest, Trophy, ArrowRight } from "lucide-react";
import { DriveCard } from "../types/drive";

interface DashboardMetricsStripProps {
  drives: DriveCard[];
  onFilterUrgent?: () => void;
  onFilterActivePipeline?: () => void;
  onFilterOffers?: () => void;
}

export const DashboardMetricsStrip: React.FC<DashboardMetricsStripProps> = ({
  drives,
  onFilterUrgent,
  onFilterActivePipeline,
  onFilterOffers,
}) => {
  const totalDrives = drives.length;
  const urgentDrives = drives.filter((d) => !d.is_overdue && d.days_left <= 3);
  const inPipeline = drives.filter((d) => ["oa", "interview"].includes(d.application_status));
  const offers = drives.filter((d) => d.application_status === "offer");

  const cards = [
    {
      title: "Total Opportunities",
      value: totalDrives,
      subtext: "Campus Placement Drives",
      icon: Briefcase,
      accentColor: "text-[#1c69d4]",
      badge: null,
      onClick: undefined,
    },
    {
      title: "Urgent Action (< 72h)",
      value: urgentDrives.length,
      subtext: urgentDrives.length > 0 ? `${urgentDrives.slice(0, 2).map((d) => d.company_name).join(", ")}` : "No pending urgency",
      icon: AlertTriangle,
      accentColor: "text-[#f59e0b]",
      badge: urgentDrives.length > 0 ? "ACTION NEEDED" : null,
      onClick: onFilterUrgent,
    },
    {
      title: "Active In Pipeline",
      value: inPipeline.length,
      subtext: "OA & Technical Interviews",
      icon: GitPullRequest,
      accentColor: "text-[#1c69d4]",
      badge: null,
      onClick: onFilterActivePipeline,
    },
    {
      title: "Offers & Selections",
      value: offers.length,
      subtext: offers.length > 0 ? `${offers.map((d) => d.company_name).join(", ")}` : "In selection process",
      icon: Trophy,
      accentColor: "text-[#22c55e]",
      badge: offers.length > 0 ? "OFFER SECURED" : null,
      onClick: onFilterOffers,
    },
  ];

  return (
    <div className="bg-[#1a2129] border border-[#262e38] p-6 sm:p-7 text-white shadow-sm space-y-4">
      {/* Hero band heading */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#262e38] pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-[1.5px] font-bold text-[#1c69d4] block">
            Executive Overview
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Placement Performance & Pipeline
          </h2>
        </div>
        <p className="text-xs font-light text-[#bbbbbb] max-w-sm text-right hidden sm:block">
          Real-time candidate tracking across active campus recruitment stages and upcoming deadlines.
        </p>
      </div>

      {/* 4-Up Metric Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`bg-[#262e38] border border-[#333d4b] p-4.5 transition-colors ${
                card.onClick ? "hover:border-[#1c69d4] cursor-pointer group" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#bbbbbb]">
                  {card.title}
                </span>
                <Icon className={`w-4 h-4 ${card.accentColor}`} />
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white tracking-tight">
                  {card.value}
                </span>
                {card.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-[1px] px-1.5 py-0.5 bg-[#1c69d4]/20 text-[#1c69d4] border border-[#1c69d4]/30">
                    {card.badge}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs font-light text-[#bbbbbb] truncate">
                {card.subtext}
              </p>

              {card.onClick && (
                <div className="mt-3 pt-2 border-t border-[#333d4b] flex items-center justify-between text-[11px] font-bold tracking-[1px] uppercase text-[#1c69d4] group-hover:text-white transition-colors">
                  <span>Filter Group</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
