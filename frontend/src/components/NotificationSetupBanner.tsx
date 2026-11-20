import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  fetchOnboardingTestStatus,
  fetchPushStatus,
  fetchVapidPublicKey,
  savePushSubscription,
  triggerOnboardingTest,
  triggerPushTest,
} from "../services/api";
import { detectOemBrand, OemInfo } from "../utils/oemDetection";
import { Bell, AlertTriangle, ShieldCheck, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationSetupBanner: React.FC = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{
    has_tested: boolean;
    ack_received: boolean;
    show_oem_warning: boolean;
  }>({ has_tested: false, ack_received: false, show_oem_warning: false });

  const [oemInfo, setOemInfo] = useState<OemInfo | null>(null);
  const [bannerExpanded, setBannerExpanded] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const info = detectOemBrand();
    setOemInfo(info);

    if ("Notification" in window && Notification.permission === "granted") {
      setPushEnabled(true);
    }

    if (isLoaded && isSignedIn) {
      loadStatus();
    }
  }, [isLoaded, isSignedIn]);

  const loadStatus = async () => {
    try {
      const pStatus = await fetchPushStatus();
      if (pStatus.is_enabled && "Notification" in window && Notification.permission === "granted") {
        setPushEnabled(true);
      }

      const test = await fetchOnboardingTestStatus();
      setTestStatus(test);
    } catch (err) {
      console.warn("Error loading alert settings status:", err);
    }
  };

  const handleEnablePush = async () => {
    try {
      if (!("Notification" in window)) {
        alert("Web Push is not supported by your browser.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Notification permission was denied.");
        return;
      }

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = await fetchVapidPublicKey();
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
        }

        await savePushSubscription(subscription.toJSON());
        setPushEnabled(true);
        setStatusMessage("Mobile Web Push enabled successfully.");
        await loadStatus();
      }
    } catch (err: unknown) {
      setStatusMessage(`Push setup failed: ${(err as Error).message}`);
    }
  };

  const handleRunOnboardingTest = async () => {
    try {
      setStatusMessage("Sending test push notification to your phone...");
      await triggerPushTest();
      await triggerOnboardingTest();

      setTimeout(async () => {
        const updated = await fetchOnboardingTestStatus();
        setTestStatus(updated);
        if (updated.ack_received) {
          setStatusMessage("Push notification test verified successfully.");
        } else {
          setStatusMessage("Test push alert dispatched. Tap the notification on your phone.");
        }
      }, 3000);
    } catch (err: unknown) {
      setStatusMessage(`Test failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="border border-[#e6e6e6] dark:border-neutral-800 bg-[#fafafa] dark:bg-neutral-900 p-4 sm:p-5 text-[#262626] dark:text-neutral-200 space-y-3">
      {/* Alert Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-white dark:bg-neutral-800 text-[#1c69d4] dark:text-sky-400 border border-[#cccccc] dark:border-neutral-700 rounded-lg">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-[#262626] dark:text-white tracking-tight">
                Mobile Deadline Push Alerts
              </h3>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-xs ${
                    pushEnabled
                      ? "bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#15803d] dark:text-emerald-400 border-[#bbf7d0] dark:border-emerald-800"
                      : "bg-[#fffbeb] dark:bg-amber-950/40 text-[#b45309] dark:text-amber-400 border-[#fde68a] dark:border-amber-800"
                  }`}
                >
                  {pushEnabled ? "Push: Active" : "Push: Off"}
                </span>
              </div>
            </div>
            <p className="text-[11px] font-light text-[#6b6b6b] dark:text-neutral-400">
              VAPID signed background push alerts (48h, 24h, 6h) for primary application deadlines.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBannerExpanded(!bannerExpanded)}
          className="inline-flex items-center gap-1.5 border border-[#cccccc] dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] dark:text-white hover:bg-[#f7f7f7] dark:hover:bg-neutral-700 transition-colors cursor-pointer rounded-md"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#1c69d4] dark:text-sky-400" />
          <span>{bannerExpanded ? "Hide Settings" : "Configure Alerts"}</span>
          {bannerExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {statusMessage && (
        <div className="bg-[#eff6ff] dark:bg-blue-950/40 p-2.5 text-xs text-[#1c69d4] dark:text-blue-400 border border-[#bfdbfe] dark:border-blue-900 rounded-md">
          {statusMessage}
        </div>
      )}

      {/* OEM Background Notification Warning */}
      {testStatus.show_oem_warning && oemInfo && oemInfo.isAndroid && (
        <div className="border border-[#fde68a] dark:border-amber-800 bg-[#fffbeb] dark:bg-amber-950/40 p-3.5 text-[#92400e] dark:text-amber-300 rounded-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#b45309] dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-[#92400e] dark:text-amber-200 text-xs">
                Your phone might be blocking background notifications ({oemInfo.oemName})
              </h4>
              <p className="mt-1 text-[#92400e] dark:text-amber-300/80 font-light leading-relaxed text-[11px]">
                {oemInfo.advice}
              </p>
              {oemInfo.unwhitelistUrl && (
                <div className="mt-2">
                  <a
                    href={oemInfo.unwhitelistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-[#b45309] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#92400e] transition-colors rounded-xs"
                  >
                    Fix on DontKillMyApp.com ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Alert Settings Panel */}
      {bannerExpanded && (
        <div className="mt-3 grid grid-cols-1 gap-3.5 border-t border-[#e6e6e6] dark:border-neutral-800 pt-3.5 sm:grid-cols-2">
          {/* Step 1: Web Push Setup */}
          <div className="border border-[#e6e6e6] dark:border-neutral-800 bg-white dark:bg-neutral-800 p-3.5 space-y-2 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#262626] dark:text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#1c69d4] dark:text-sky-400" />
                Mobile & Desktop Push
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-xs ${
                  pushEnabled
                    ? "bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#15803d] dark:text-emerald-400 border-[#bbf7d0] dark:border-emerald-800"
                    : "bg-[#fffbeb] dark:bg-amber-950/40 text-[#b45309] dark:text-amber-400 border-[#fde68a] dark:border-amber-800"
                }`}
              >
                {pushEnabled ? "Enabled" : "Not Setup"}
              </span>
            </div>
            <p className="text-[11px] font-light text-[#6b6b6b] dark:text-neutral-400">
              VAPID signed background alerts for primary placement deadlines.
            </p>
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushEnabled}
              className="w-full bg-[#1c69d4] dark:bg-sky-600 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white hover:bg-[#0653b6] dark:hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer rounded-md"
            >
              {pushEnabled ? "Push Permission Active" : "Enable Web Push"}
            </button>
          </div>

          {/* Step 2: Self-Test Mobile Push */}
          <div className="border border-[#e6e6e6] dark:border-neutral-800 bg-white dark:bg-neutral-800 p-3.5 space-y-2 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#262626] dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                Delivery Self-Test
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-[#cccccc] dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700 text-[#262626] dark:text-white rounded-xs">
                Verification
              </span>
            </div>
            <p className="text-[11px] font-light text-[#6b6b6b] dark:text-neutral-400">
              Dispatches an immediate alert to verify sound, badge, vibration, and background delivery.
            </p>
            <button
              type="button"
              onClick={handleRunOnboardingTest}
              className="w-full bg-[#1a2129] dark:bg-neutral-100 dark:text-neutral-900 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white hover:bg-[#262e38] dark:hover:bg-white transition-colors cursor-pointer rounded-md"
            >
              Dispatch Mobile Test Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
