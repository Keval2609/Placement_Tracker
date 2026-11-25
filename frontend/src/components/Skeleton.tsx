import React from "react";
import { cn } from "../lib/utils";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div
    aria-hidden="true"
    className={cn(
      "animate-pulse rounded-md bg-neutral-200/80 dark:bg-neutral-800/80",
      className
    )}
  />
);

export const DriveCardSkeletonGrid: React.FC<{ count?: number }> = ({
  count = 6,
}) => (
  <div className="space-y-3.5" aria-busy="true" aria-label="Loading placement drives">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3.5 w-36" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 space-y-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Skeleton className="w-10 h-10 rounded-md shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DashboardTableSkeleton: React.FC<{ rows?: number }> = ({
  rows = 6,
}) => (
  <div
    aria-busy="true"
    aria-label="Loading placement drives table"
    className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg shadow-xs"
  >
    <div className="bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3.5 grid grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, idx) => (
        <Skeleton key={idx} className="h-3.5 w-20" />
      ))}
    </div>
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="px-4 py-3.5 grid grid-cols-7 gap-4 items-center"
        >
          <div className="space-y-1.5 col-span-1">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-16 rounded-sm" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-5 w-16 rounded-sm" />
          <div className="flex justify-end">
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DashboardFunnelSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Loading pipeline funnel"
    className="flex gap-4 overflow-x-auto pb-2"
  >
    {Array.from({ length: 5 }).map((_, colIdx) => (
      <div
        key={colIdx}
        className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 space-y-3 rounded-lg min-w-[220px]"
      >
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-5 w-7 rounded-sm" />
        </div>
        {Array.from({ length: 2 }).map((_, cardIdx) => (
          <div
            key={cardIdx}
            className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md p-3 space-y-2.5"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-14 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

export const DriveDetailModalSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading drive details">
    <div className="flex flex-wrap items-start justify-between gap-4 pt-2 border-b border-neutral-200 dark:border-neutral-800 pb-5">
      <div className="flex items-start gap-4 flex-1">
        <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-44" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <Skeleton className="h-9 w-36 rounded-md" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-1.5"
        >
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>

    <div className="space-y-2.5">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>

    <div className="space-y-2.5">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Loading page"
    className="min-h-screen bg-white dark:bg-neutral-950 p-6 sm:p-10"
  >
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  </div>
);
