import { useState } from "react";
import { IngestInput } from "./components/IngestInput";
import { ConfirmationScreen } from "./components/ConfirmationScreen";
import { DriveDetailPage } from "./components/DriveDetailPage";
import { DashboardPage } from "./components/DashboardPage";
import { ExtractionAPIResponse } from "./types/extraction";

function App() {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => {
              setActiveDriveId(null);
              setIsIngesting(false);
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              PT
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">
                Placement Tracker
              </h1>
              <p className="text-[10px] text-slate-400">
                Placement Drives, Timeline & Application Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeDriveId || isIngesting ? (
              <button
                type="button"
                onClick={() => {
                  setActiveDriveId(null);
                  setIsIngesting(false);
                }}
                className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenIngest}
                className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition-colors"
              >
                + New Notice
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-8">
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
