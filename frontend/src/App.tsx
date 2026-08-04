import { useState } from "react";
import { IngestInput } from "./components/IngestInput";
import { ConfirmationScreen } from "./components/ConfirmationScreen";
import { DrivePostingDraft, ExtractionAPIResponse } from "./types/extraction";

function App() {
  const [extractionResult, setExtractionResult] =
    useState<ExtractionAPIResponse | null>(null);
  const [confirmedPayload, setConfirmedPayload] = useState<
    DrivePostingDraft[] | null
  >(null);

  const handleReset = () => {
    setExtractionResult(null);
    setConfirmedPayload(null);
  };

  const handleSaveConfirmedDraft = (postings: DrivePostingDraft[]) => {
    console.log("Confirmed Draft Ready for DB persistence:", postings);
    setConfirmedPayload(postings);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              PT
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">
                Placement Tracker
              </h1>
              <p className="text-[10px] text-slate-400">
                Draft Confirmation & Date Resolution
              </p>
            </div>
          </div>

          <div className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
            v2 Confirmation Flow
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-8">
        {!extractionResult ? (
          <IngestInput onExtractionSuccess={(data) => setExtractionResult(data)} />
        ) : (
          <ConfirmationScreen
            initialResult={extractionResult}
            onReset={handleReset}
            onSaveConfirmedDraft={handleSaveConfirmedDraft}
          />
        )}

        {/* Debug Payload Viewer */}
        {confirmedPayload && (
          <div className="mt-8 p-4 bg-slate-900 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="text-xs font-bold text-emerald-400">
              Validated Client Payload (Ready for POST /drives)
            </div>
            <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded text-slate-300 overflow-x-auto max-h-60 border border-slate-800">
              {JSON.stringify(confirmedPayload, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
