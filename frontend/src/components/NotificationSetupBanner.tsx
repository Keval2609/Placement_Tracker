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
    // Check OEM brand
    const info = detectOemBrand();
    setOemInfo(info);

    // Check push permission state
    if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }

    // Load Telegram link & onboarding test status
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

      // Register push via service worker
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

        await savePushSubscription(subscription.toJSON());
        setPushEnabled(true);
        setStatusMessage('Web Push notifications enabled successfully!');
      }
    } catch (err: unknown) {
      console.error('Push setup failed:', err);
      setStatusMessage(`Push setup failed: ${(err as Error).message}`);
    }
  };

  const handleLinkTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramChatId.trim()) return;

    setTelegramLoading(true);
    try {
      await linkTelegramChat(telegramChatId.trim());
      setIsTelegramLinked(true);
      setStatusMessage(`Telegram chat_id ${telegramChatId} linked as fallback!`);
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

      // Poll status 3 seconds later
      setTimeout(async () => {
        const updated = await fetchOnboardingTestStatus();
        setTestStatus(updated);
        if (updated.ack_received) {
          setStatusMessage('✅ Push test verified successfully!');
        } else {
          setStatusMessage('⚠️ Test push sent. If unacknowledged, Telegram fallback will trigger.');
        }
      }, 3000);
    } catch (err: unknown) {
      setStatusMessage(`Test failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-slate-700/60 bg-slate-900/80 p-4 text-slate-100 shadow-md backdrop-blur-sm">
      {/* Alert Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">
              Multi-Channel Alerts & Fallback Escalation
            </h3>
            <p className="text-xs text-slate-400">
              Web Push (48h/24h/6h) + Telegram Bot fallback if push goes unacked for 10 min.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setBannerExpanded(!bannerExpanded)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            {bannerExpanded ? 'Hide Settings' : 'Configure Alerts & Telegram'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-3 rounded-md bg-indigo-950/60 p-2.5 text-xs text-indigo-300 border border-indigo-800/50">
          {statusMessage}
        </div>
      )}

      {/* OEM Background Notification Warning Banner */}
      {testStatus.show_oem_warning && oemInfo && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/40 p-4 text-amber-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-amber-400 text-lg">⚠️</div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-100 text-sm">
                Didn't get that? Your phone may be blocking background notifications
              </h4>
              <p className="mt-1 text-xs text-amber-300/90 leading-relaxed">
                Detected device: <strong className="text-amber-200">{oemInfo.oemName}</strong> ({oemInfo.brand}).
                {' '}{oemInfo.advice}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={oemInfo.unwhitelistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-amber-500"
                >
                  Fix Battery Settings on DontKillMyApp.com
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Alert Settings Panel */}
      {bannerExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 md:grid-cols-2">
          {/* Step 1: Web Push Setup */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                1. Web Push Notification
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  pushEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {pushEnabled ? '● Enabled' : '○ Not Setup'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              VAPID signed background alerts for primary deadlines.
            </p>
            <button
              onClick={handleEnablePush}
              disabled={pushEnabled}
              className="mt-3 w-full rounded-md bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {pushEnabled ? 'Push Permission Granted' : 'Enable Web Push Notifications'}
            </button>
          </div>

          {/* Step 2: Telegram Account Linking */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                2. Telegram Fallback Setup
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isTelegramLinked
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isTelegramLinked ? '● Linked' : '○ Not Linked'}
              </span>
            </div>
            <form onSubmit={handleLinkTelegram} className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Telegram Chat ID"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={telegramLoading}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {isTelegramLinked ? 'Update' : 'Link'}
              </button>
            </form>
          </div>

          {/* Step 3: Self-Test Onboarding Push */}
          <div className="col-span-1 md:col-span-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-300">
                3. Onboarding Delivery Self-Test
              </span>
              <p className="text-xs text-slate-400">
                Test push delivery & OEM battery optimization detection on your phone.
              </p>
            </div>
            <button
              onClick={handleRunOnboardingTest}
              className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Run Delivery Self-Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
