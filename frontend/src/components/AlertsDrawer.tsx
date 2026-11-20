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
import { cn } from "../lib/utils";
import {
  X,
  Bell,
  AlertTriangle,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Loader2,
  Share,
  PlusSquare,
  Sparkles,
} from "lucide-react";

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

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({ isOpen, onClose }) => {
  const { isLoaded, isSignedIn } = useAuth();
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [deviceCount, setDeviceCount] = useState<number>(0);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [testStatus, setTestStatus] = useState<{
    has_tested: boolean;
    ack_received: boolean;
    show_oem_warning: boolean;
  }>({ has_tested: false, ack_received: false, show_oem_warning: false });

  const [oemInfo, setOemInfo] = useState<OemInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Mobile environment detection
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const info = detectOemBrand();
    setOemInfo(info);

    // iOS and standalone PWA detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(Boolean(isRunningStandalone));

    if ("Notification" in window && Notification.permission === "granted") {
      setPushEnabled(true);
    }

    if (isLoaded && isSignedIn && isOpen) {
      loadStatus();
    }
  }, [isLoaded, isSignedIn, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const loadStatus = async () => {
    try {
      const pStatus = await fetchPushStatus();
      setDeviceCount(pStatus.device_count);
      if (pStatus.is_enabled && "Notification" in window && Notification.permission === "granted") {
        setPushEnabled(true);
      }

      const test = await fetchOnboardingTestStatus();
      setTestStatus(test);
    } catch (err) {
      console.warn("Error loading alert status:", err);
    }
  };

  const handleEnablePush = async () => {
    setPushLoading(true);
    setStatusMessage(null);
    setTestFeedback(null);
    try {
      if (!("Notification" in window)) {
        setStatusMessage("Web Push is not supported by your current browser.");
        return;
      }

      if (!("serviceWorker" in navigator)) {
        setStatusMessage("Service Workers are not available in this browser.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatusMessage("Notification permission was denied. Please allow notifications in site settings.");
        return;
      }

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
      setStatusMessage("Web Push notifications enabled successfully on this device!");
      await loadStatus();
    } catch (err: unknown) {
      setStatusMessage(`Push setup failed: ${(err as Error).message}`);
    } finally {
      setPushLoading(false);
    }
  };

  const handleTriggerTestAlert = async () => {
    setTestLoading(true);
    setTestFeedback(null);
    setStatusMessage(null);
    try {
      const res = await triggerPushTest();
      setTestFeedback({
        success: res.success,
        message: res.message || "Test alert dispatched to your device.",
      });
      await triggerOnboardingTest();
      await loadStatus();
    } catch (err: unknown) {
      setTestFeedback({
        success: false,
        message: (err as Error).message || "Failed triggering test alert.",
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-drawer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close notification settings"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tpo-cobalt"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-tpo-navy flex items-center justify-center text-white border border-neutral-800 rounded-lg">
            <Bell className="w-5 h-5 text-tpo-cobalt" />
          </div>
          <div>
            <h2 id="alerts-drawer-title" className="text-lg font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
              Placement Push Alerts
            </h2>
            <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
              Guaranteed mobile & browser alerts 48h, 24h, and 6h before primary deadlines.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-tpo-cobalt dark:text-blue-400 text-xs font-medium rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Channel: Browser & Mobile Web Push */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-tpo-cobalt" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                Mobile & Desktop Push Alerts
              </span>
            </div>
            {pushEnabled ? (
              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider rounded-sm">
                Active ({deviceCount} {deviceCount === 1 ? "device" : "devices"})
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider rounded-sm">
                Inactive
              </span>
            )}
          </div>
          <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
            Delivers instant lock-screen notifications for application deadlines, online assessments, and interview schedules.
          </p>

          {!pushEnabled ? (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="w-full py-2.5 px-4 bg-tpo-cobalt hover:bg-tpo-cobalt-hover text-white text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tpo-cobalt flex items-center justify-center gap-2"
            >
              {pushLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enabling Push Notifications...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Enable Push Notifications on this Device</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-between pt-1 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                This device is registered for deadline push alerts.
              </span>
            </div>
          )}
        </div>

        {/* iOS PWA Add-To-Home-Screen Guide (Required by Apple for Web Push) */}
        {isIOS && !isStandalone && (
          <div className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg space-y-2 text-xs text-sky-900 dark:text-sky-300">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>iPhone / iPad Setup Required</span>
            </div>
            <p className="leading-relaxed">
              Apple requires web apps to be installed to the Home Screen to receive background push notifications:
            </p>
            <ol className="list-decimal pl-4 space-y-1 font-medium">
              <li className="flex items-center gap-1.5">
                <span>1. Tap the Share button in Safari</span>
                <Share className="w-3.5 h-3.5 text-sky-600 inline" />
              </li>
              <li className="flex items-center gap-1.5">
                <span>2. Select &quot;Add to Home Screen&quot;</span>
                <PlusSquare className="w-3.5 h-3.5 text-sky-600 inline" />
              </li>
              <li>3. Open Placement Tracker from your Home Screen to enable alerts.</li>
            </ol>
          </div>
        )}

        {/* OEM Battery Optimization Warning for Android */}
        {oemInfo && oemInfo.isAndroid && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Android Background Protection ({oemInfo.oemName})</span>
            </div>
            <p className="text-xs text-amber-900 dark:text-amber-300/80 font-normal leading-relaxed">
              {oemInfo.advice}
            </p>
            {oemInfo.unwhitelistUrl && (
              <div className="pt-1">
                <a
                  href={oemInfo.unwhitelistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-amber-800 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
                >
                  Battery Whitelist Instructions ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* Direct Mobile Test Feedback */}
        {testFeedback && (
          <div
            className={cn(
              "p-3 rounded-md text-xs border leading-relaxed",
              testFeedback.success
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
            )}
          >
            {testFeedback.message}
          </div>
        )}

        {/* Delivery Health Verification */}
        {testStatus.has_tested && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="font-semibold">Recent delivery test verified successfully.</span>
            <span className="text-[11px] uppercase font-bold font-mono">Verified</span>
          </div>
        )}

        {/* Actions / Test Button */}
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>VAPID encrypted push</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerTestAlert}
            disabled={testLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tpo-cobalt disabled:opacity-50"
          >
            {testLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>Send Test Push Notification</span>
          </button>
        </div>
      </div>
    </div>
  );
};
