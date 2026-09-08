import { useState } from "react";
import { IngestInput } from "./components/IngestInput";
import { ConfirmationScreen } from "./components/ConfirmationScreen";
import { DriveDetailPage } from "./components/DriveDetailPage";
import { DashboardPage } from "./components/DashboardPage";
import { ExtractionAPIResponse } from "./types/extraction";
import { PrototypeView } from "./prototype/PrototypeView";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";

function App() {
  const [showPrototype, setShowPrototype] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get("demo") === "true" ||
        params.get("mock") === "true" ||
        params.get("prototype") === "true" ||
        window.location.hash === "#demo" ||
        window.location.hash === "#mock"
      );
    }
    return false;
  });
  const [activeDriveId, setActiveDriveId] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [extractionResult, setExtractionResult] =
    useState<ExtractionAPIResponse | null>(null);

  const handleResetIngest = () => {
    setExtractionResult(null);
    setIsIngesting(false);
  };

  const handleOpenIngest = () => {
    setActiveDriveId(null);
    setExtractionResult(null);
    setIsIngesting(true);
  };

  if (showPrototype) {
    return (
      <PrototypeView
        onExitPrototype={() => {
          setShowPrototype(false);
          if (
            window.location.search.includes("demo") ||
            window.location.search.includes("mock") ||
            window.location.hash.includes("demo") ||
            window.location.hash.includes("mock")
          ) {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#262626] font-sans pb-16 selection:bg-[#1c69d4] selection:text-white">
      {/* BMW M-Stripe Top Signature Divider: 4px M-stripe (Light Blue -> Dark Blue -> Red) */}
      <div className="h-1 w-full flex">
        <div className="w-1/3 bg-[#0066b1]" />
        <div className="w-1/3 bg-[#1c69d4]" />
        <div className="w-1/3 bg-[#e22718]" />
      </div>

      {/* Corporate Top Navigation */}
      <header className="sticky top-0 z-30 w-full border-b border-[#e6e6e6] bg-white/95 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3.5 cursor-pointer group"
            onClick={() => {
              setActiveDriveId(null);
              setIsIngesting(false);
            }}
          >
            {/* BMW-Style Monogram Badge */}
            <div className="w-9 h-9 bg-[#1a2129] flex items-center justify-center font-bold text-white text-xs tracking-wider border border-[#262e38]">
              PT
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-[#1a1a1a]">
                  Placement <span className="text-[#1c69d4]">Tracker</span>
                </h1>
                <span className="text-[11px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 bg-[#f7f7f7] text-[#6b6b6b] border border-[#e6e6e6]">
                  Portal
                </span>
              </div>
              <p className="text-[11px] font-light text-[#6b6b6b] hidden sm:block">
                Campus Recruitment Drives, Pipeline & Candidate Tracking
              </p>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Toggle Mock Showcase */}
            <button
              type="button"
              onClick={() => setShowPrototype(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-[#ffffff] hover:bg-[#f7f7f7] border border-[#cccccc] transition-colors cursor-pointer"
              title="Explore Demo Mock Showcase (Google, Microsoft, Uber, etc.)"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1c69d4]" />
              <span className="hidden sm:inline">Mock Showcase</span>
            </button>

            {activeDriveId || isIngesting ? (
              <button
                type="button"
                onClick={() => {
                  setActiveDriveId(null);
                  setIsIngesting(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-[#262626] bg-[#f7f7f7] hover:bg-[#ebebeb] border border-[#e6e6e6] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenIngest}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.5px] text-white bg-[#1c69d4] hover:bg-[#0653b6] transition-colors cursor-pointer shadow-sm active:bg-[#0653b6]"
              >
                <Plus className="w-4 h-4" />
                <span>Parse Notice</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeDriveId ? (
          <DriveDetailPage
            driveId={activeDriveId}
            onBackToDashboard={() => setActiveDriveId(null)}
          />
        ) : isIngesting ? (
          !extractionResult ? (
            <IngestInput onExtractionSuccess={(data) => setExtractionResult(data)} />
          ) : (
            <ConfirmationScreen
              initialResult={extractionResult}
              onReset={handleResetIngest}
              onSaveConfirmedDraft={() => {
                setIsIngesting(false);
                setExtractionResult(null);
              }}
            />
          )
        ) : (
          <DashboardPage
            onSelectDrive={(id) => setActiveDriveId(id)}
            onOpenIngest={handleOpenIngest}
          />
        )}
      </main>
    </div>
  );
}

export default App;
