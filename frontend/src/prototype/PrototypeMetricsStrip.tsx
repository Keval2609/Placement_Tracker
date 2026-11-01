import React from "react";
import { Briefcase, AlertTriangle, GitPullRequest, Trophy, ArrowUpRight } from "lucide-react";
import { PrototypeDrive } from "./mockData";

interface PrototypeMetricsStripProps {
  drives: PrototypeDrive[];
  onFilterUrgent: () => void;
  onFilterActivePipeline: () => void;
  onFilterOffers: () => void;
}

export const PrototypeMetricsStrip: React.FC<PrototypeMetricsStripProps> = ({
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
      title: "Total Drives Tracked",
      value: totalDrives,
      subtext: "Across Tier-1 & Core Campus",
      icon: Briefcase,
      textColor: "text-white",
      onClick: undefined,
    },
    {
      title: "Urgent Deadlines (< 72h)",
      value: urgentDrives.length,
      subtext: urgentDrives.length > 0 ? `${urgentDrives.map(d => d.company_name).join(", ")}` : "No pending urgency",
      icon: AlertTriangle,
      textColor: "text-amber-400",
      onClick: onFilterUrgent,
      highlight: urgentDrives.length > 0,
    },
    {
      title: "Active In Pipeline",
      value: inPipeline.length,
      subtext: "OA & Technical Interviews",
      icon: GitPullRequest,
      textColor: "text-[#1c69d4] dark:text-blue-400",
      onClick: onFilterActivePipeline,
    },
    {
      title: "Offers & Selections",
      value: offers.length,
      subtext: offers.length > 0 ? `${offers.map(d => d.company_name).join(", ")} 🎉` : "In progress",
      icon: Trophy,
      textColor: "text-[#22c55e] dark:text-emerald-400",
      onClick: onFilterOffers,
    },
  ];

  return (
    <div className="bg-[#1a2129] dark:bg-neutral-900 border border-[#262e38] dark:border-neutral-800 p-4 sm:p-5 rounded-lg text-white shadow-xs">
      {/* BMW Hero Band Header Label */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 dark:border-neutral-800">
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#bbbbbb] dark:text-neutral-400">
          Executive Recruitment Overview
        </span>
        <span className="text-[11px] font-light text-[#bbbbbb] dark:text-neutral-400">
          Current Academic Year 2026
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`group bg-[#262e38] dark:bg-neutral-800/70 border border-white/10 dark:border-neutral-700/60 p-4 rounded-md transition-all duration-200 hover:border-[#1c69d4] dark:hover:border-blue-500 ${
                card.onClick ? "cursor-pointer" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#bbbbbb] dark:text-neutral-400 uppercase tracking-[1.5px] block">
                    {card.title}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white tracking-tight">
                      {card.value}
                    </span>
                    {card.highlight && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#e22718]/20 text-[#e22718] font-bold uppercase tracking-wider border border-[#e22718]/30 animate-pulse">
                        Action Needed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-light text-[#bbbbbb] dark:text-neutral-400 truncate max-w-[190px]">
                    {card.subtext}
                  </p>
                </div>

                <div
                  className={`w-9 h-9 bg-[#1a2129] dark:bg-neutral-900 border border-white/10 dark:border-neutral-700/60 rounded-md flex items-center justify-center ${card.textColor}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {card.onClick && (
                <div className="mt-3 pt-2.5 border-t border-white/10 dark:border-neutral-800 flex items-center justify-between text-[11px] font-bold uppercase tracking-[1px] text-[#bbbbbb] dark:text-neutral-400 group-hover:text-white transition-colors">
                  <span>Filter by category</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#1c69d4] dark:text-blue-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
