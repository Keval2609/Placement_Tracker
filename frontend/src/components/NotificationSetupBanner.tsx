import React, { useEffect, useState } from 'react';
import {
  fetchOnboardingTestStatus,
  fetchTelegramStatus,
  fetchVapidPublicKey,
  linkTelegramChat,
  savePushSubscription,
  triggerOnboardingTest,
} from '../services/api';
import { detectOemBrand, OemInfo } from '../utils/oemDetection';
import { Bell, Send, AlertTriangle, ShieldCheck, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const NotificationSetupBanner: React.FC = () => {
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [isTelegramLinked, setIsTelegramLinked] = useState<boolean>(false);
  const [telegramLoading, setTelegramLoading] = useState<boolean>(false);
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

    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }

    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const tg = await fetchTelegramStatus();
      setIsTelegramLinked(tg.is_linked);
      if (tg.chat_id) setTelegramChatId(tg.chat_id);

      const test = await fetchOnboardingTestStatus();
      setTestStatus(test);
    } catch (err) {
      console.warn('Error loading alert settings status:', err);
    }
  };

  const handleEnablePush = async () => {
    try {
      if (!('Notification' in window)) {
        alert('Web Push is not supported by your browser.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission was denied.');
        return;
      }

      if ('serviceWorker' in navigator) {
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

        await savePushSubscription(subscription);
        setPushEnabled(true);
        setStatusMessage('Web Push enabled successfully.');
      }
    } catch (err: unknown) {
      setStatusMessage(`Push setup failed: ${(err as Error).message}`);
    }
  };

  const handleLinkTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramChatId.trim()) return;

    setTelegramLoading(true);
    try {
      const linkedId = await linkTelegramChat(telegramChatId.trim());
      setIsTelegramLinked(Boolean(linkedId));
      setStatusMessage('Telegram chat successfully linked.');
    } catch (err: unknown) {
      setStatusMessage(`Telegram link failed: ${(err as Error).message}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleRunOnboardingTest = async () => {
    try {
      setStatusMessage('Sending test push notification...');
      await triggerOnboardingTest();

      setTimeout(async () => {
        const updated = await fetchOnboardingTestStatus();
        setTestStatus(updated);
        if (updated.ack_received) {
          setStatusMessage('Push test verified successfully.');
        } else {
          setStatusMessage('Test push sent. If unacknowledged, Telegram fallback will trigger.');
        }
      }, 3000);
    } catch (err: unknown) {
      setStatusMessage(`Test failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="border border-[#e6e6e6] bg-[#fafafa] p-4 sm:p-5 text-[#262626] space-y-3">
      {/* Alert Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-white text-[#1c69d4] border border-[#cccccc]">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-[#262626] tracking-tight">
                Multi-Channel Alerts & Fallback
              </h3>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                    pushEnabled
                      ? 'bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]'
                      : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                  }`}
                >
                  {pushEnabled ? 'Push: Active' : 'Push: Off'}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                    isTelegramLinked
                      ? 'bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]'
                      : 'bg-white text-[#6b6b6b] border-[#cccccc]'
                  }`}
                >
                  {isTelegramLinked ? 'Telegram: Linked' : 'Telegram: Off'}
                </span>
              </div>
            </div>
            <p className="text-[11px] font-light text-[#6b6b6b]">
              Web Push alerts (48h/24h/6h) + Telegram fallback if unacknowledged for 10 min.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBannerExpanded(!bannerExpanded)}
          className="inline-flex items-center gap-1.5 border border-[#cccccc] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] hover:bg-[#f7f7f7] transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#1c69d4]" />
          <span>{bannerExpanded ? 'Hide Settings' : 'Configure Channels'}</span>
          {bannerExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {statusMessage && (
        <div className="bg-[#eff6ff] p-2.5 text-xs text-[#1c69d4] border border-[#bfdbfe]">
          {statusMessage}
        </div>
      )}

      {/* OEM Background Notification Warning */}
      {testStatus.show_oem_warning && oemInfo && (
        <div className="border border-[#fde68a] bg-[#fffbeb] p-3.5 text-[#92400e]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-[#92400e] text-xs">
                Your phone might be blocking background notifications ({oemInfo.oemName})
              </h4>
              <p className="mt-1 text-[#92400e] font-light leading-relaxed text-[11px]">
                {oemInfo.advice}
              </p>
              <div className="mt-2">
                <a
                  href={oemInfo.unwhitelistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-[#b45309] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#92400e] transition-colors"
                >
                  Fix on DontKillMyApp.com ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Alert Settings Panel */}
      {bannerExpanded && (
        <div className="mt-3 grid grid-cols-1 gap-3.5 border-t border-[#e6e6e6] pt-3.5 md:grid-cols-2">
          {/* Step 1: Web Push Setup */}
          <div className="border border-[#e6e6e6] bg-white p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#262626] flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-[#1c69d4]" />
                Browser Web Push
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                  pushEnabled
                    ? 'bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]'
                    : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]'
                }`}
              >
                {pushEnabled ? 'Enabled' : 'Not Setup'}
              </span>
            </div>
            <p className="text-[11px] font-light text-[#6b6b6b]">
              VAPID signed background alerts for primary deadlines.
            </p>
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={pushEnabled}
              className="w-full bg-[#1c69d4] py-2 text-xs font-bold uppercase tracking-[0.5px] text-white hover:bg-[#0653b6] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {pushEnabled ? 'Push Permission Active' : 'Enable Web Push'}
            </button>
          </div>

          {/* Step 2: Telegram Account Linking */}
          <div className="border border-[#e6e6e6] bg-white p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#262626] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#1c69d4]" />
                Telegram Bot Fallback
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                  isTelegramLinked
                    ? 'bg-[#ecfdf5] text-[#15803d] border-[#bbf7d0]'
                    : 'bg-white text-[#6b6b6b] border-[#cccccc]'
                }`}
              >
                {isTelegramLinked ? 'Linked' : 'Not Linked'}
              </span>
            </div>
            <form onSubmit={handleLinkTelegram} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Telegram Chat ID"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="flex-1 border border-[#cccccc] bg-white px-3 py-1.5 text-xs text-[#262626] placeholder-[#9a9a9a] focus:border-[#1c69d4] focus:outline-none"
              />
              <button
                type="submit"
                disabled={telegramLoading}
                className="bg-[#1a2129] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.5px] text-white hover:bg-[#262e38] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isTelegramLinked ? 'Update' : 'Link'}
              </button>
            </form>
          </div>

          {/* Step 3: Self-Test Onboarding Push */}
          <div className="col-span-1 md:col-span-2 border border-[#e6e6e6] bg-white p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#262626] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                Onboarding Delivery Self-Test
              </span>
              <p className="text-[11px] font-light text-[#6b6b6b]">
                Simulates deadline escalation and checks background battery lock.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunOnboardingTest}
              className="bg-[#1c69d4] px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white hover:bg-[#0653b6] transition-colors cursor-pointer"
            >
              Run Delivery Self-Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
