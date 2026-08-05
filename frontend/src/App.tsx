import { useState } from "react";
import { IngestInput } from "./components/IngestInput";
import { ConfirmationScreen } from "./components/ConfirmationScreen";
import { DriveDetailPage } from "./components/DriveDetailPage";
import { DrivePostingDraft, ExtractionAPIResponse } from "./types/extraction";

function App() {
  const [extractionResult, setExtractionResult] =
    useState<ExtractionAPIResponse | null>(null);
  const [activeDriveId, setActiveDriveId] = useState<string | null>(null);
  const [savedPayload, setSavedPayload] = useState<DrivePostingDraft[] | null>(null);

  const handleReset = () => {
    setExtractionResult(null);
    setSavedPayload(null);
  };

  const handleSaveConfirmedDraft = (postings: DrivePostingDraft[]) => {
    console.log("Confirmed Draft Ready for DB persistence:", postings);
    setSavedPayload(postings);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveDriveId(null)}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              PT
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">
                Placement Tracker
              </h1>
              <p className="text-[10px] text-slate-400">
                Drive Details, Timeline & Document Repository
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeDriveId ? (
              <button
                type="button"
                onClick={() => setActiveDriveId(null)}
                className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                + New Ingestion
              </button>
            ) : (
              <div className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                PRD Section 1.3.4 Detail View
              </div>
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
        ) : !extractionResult ? (
          <IngestInput onExtractionSuccess={(data) => setExtractionResult(data)} />
        ) : (
          <ConfirmationScreen
            initialResult={extractionResult}
            onReset={handleReset}
            onSaveConfirmedDraft={handleSaveConfirmedDraft}
          />
        )}

        {/* Debug Payload Viewer */}
        {savedPayload && !activeDriveId && (
          <div className="mt-8 p-4 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="text-xs font-bold text-emerald-400">
              Confirmed Client Payload (POST /drives)
            </div>
            <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded text-slate-300 overflow-x-auto max-h-60 border border-slate-800">
              {JSON.stringify(savedPayload, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
