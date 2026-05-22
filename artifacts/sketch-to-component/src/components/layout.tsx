import { Link, useLocation } from "wouter";
import { Settings, History as HistoryIcon, Sparkles, ChevronDown, Layers, Activity, Key, Save } from "lucide-react";
import { useGetSketchStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DEFAULT_MODEL = "gemini-2.0-flash";
const MODEL_MIGRATION_KEY = "gemini_model_migrated_2_0";

export function GeminiSparkleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} animate-pulse`}
      style={{ animationDuration: '3s' }}
    >
      <path
        d="M12 3C12 7.97056 7.97056 12 3 12C7.97056 12 12 16.0294 12 21C12 16.0294 16.0294 12 21 12C16.0294 12 12 7.97056 12 3Z"
        fill="url(#gemini-sparkle-grad-layout)"
      />
      <defs>
        <linearGradient id="gemini-sparkle-grad-layout" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.33" stopColor="#9B72CB"/>
          <stop offset="0.66" stopColor="#D96570"/>
          <stop offset="1" stopColor="#1B9AAA"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetSketchStats();
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiKeyValue(window.localStorage.getItem("gemini_api_key") || "");
      const storedModel = window.localStorage.getItem("gemini_model");
      const migrated = window.localStorage.getItem(MODEL_MIGRATION_KEY);
      const model = storedModel === "gemini-2.5-flash" && !migrated
        ? DEFAULT_MODEL
        : storedModel || DEFAULT_MODEL;

      window.localStorage.setItem("gemini_model", model);
      window.localStorage.setItem(MODEL_MIGRATION_KEY, "true");
      setSelectedModel(model);
    }
  }, []);

  const selectModel = (model: string) => {
    setSelectedModel(model);
    setModelDropdownOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gemini_model", model);
    }
  };

  const saveApiKey = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gemini_api_key", apiKeyValue.trim());
      setApiKeyModalOpen(false);
      // Optional: force reload or toast
    }
  };

  const clearApiKey = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("gemini_api_key");
      setApiKeyValue("");
      setApiKeyModalOpen(false);
    }
  };

  // Determine if workbench (sketch detail) is active
  const isSketchDetail = location.startsWith("/sketch/");
  const sketchId = isSketchDetail ? location.split("/")[2] : null;

  // Handle global Run button click
  const handleGlobalRun = () => {
    // If on homepage
    if (location === "/") {
      const genBtn = document.getElementById("generate-btn");
      if (genBtn) genBtn.click();
    } else if (isSketchDetail) {
      const runBtn = document.getElementById("run-btn");
      if (runBtn) runBtn.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] text-foreground flex flex-col font-sans">
      
      {/* 1. Top Navigation Bar (Google AI Studio style) */}
      <header className="h-14 border-b border-[rgba(255,255,255,0.08)] bg-[#0d0f14] flex items-center justify-between px-6 sticky top-0 z-50">
        
        {/* Left: Branding */}
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer select-none">
            <img src="/logo.png" alt="Imagica Logo" className="w-6 h-6 object-contain" />
            <span className="font-sans font-semibold text-lg tracking-normal text-white">Imagica</span>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.15)] text-[10px] font-medium text-[#8ab4f8]">
              <Sparkles className="w-2.5 h-2.5 text-[#8ab4f8]" />
              Built on Google
            </div>
          </div>
        </Link>

        {/* Center: Horizontal pill-shaped tab switcher */}
        <div className="flex items-center bg-[rgba(255,255,255,0.04)] p-1 rounded-full border border-[rgba(255,255,255,0.06)]">
          <Link href="/">
            <button className={`px-4 py-1.5 rounded-full text-xs transition-all font-medium select-none ${
              location === "/" 
                ? "bg-[#1a1d27] text-[#8ab4f8] shadow-sm border border-[rgba(255,255,255,0.06)]" 
                : "text-slate-400 hover:text-white"
            }`}>
              Convert
            </button>
          </Link>

          <Link href="/history">
            <button className={`px-4 py-1.5 rounded-full text-xs transition-all font-medium select-none ${
              location.startsWith("/history") 
                ? "bg-[#1a1d27] text-[#8ab4f8] shadow-sm border border-[rgba(255,255,255,0.06)]" 
                : "text-slate-400 hover:text-white"
            }`}>
              History
            </button>
          </Link>

          <Link href={sketchId ? `/sketch/${sketchId}` : "#"}>
            <button 
              disabled={!isSketchDetail}
              className={`px-4 py-1.5 rounded-full text-xs transition-all font-medium select-none ${
                isSketchDetail 
                  ? "bg-[#1a1d27] text-[#8ab4f8] shadow-sm border border-[rgba(255,255,255,0.06)]" 
                  : "text-slate-600 cursor-not-allowed"
              }`}
            >
              Workbench
            </button>
          </Link>
        </div>

        {/* Right: Settings + Run button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setApiKeyModalOpen(true)}
            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-[rgba(255,255,255,0.08)] text-slate-300 hover:text-white hover:border-[#8ab4f8]/60 transition-colors"
            aria-label="Gemini API key settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={handleGlobalRun}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8ab4f8] text-[#0d0f14] text-xs font-semibold hover:bg-[#a8c7fa] transition-colors shadow-sm select-none"
          >
            Run
            <span className="text-[10px] opacity-75 font-normal tracking-wide px-1.5 py-0.5 rounded bg-[rgba(13,15,20,0.15)]">
              Ctrl+Enter
            </span>
          </button>
        </div>
      </header>

      <Dialog open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen}>
        <DialogContent className="bg-[#141720] border border-[rgba(255,255,255,0.08)] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Key className="w-4 h-4 text-[#8ab4f8]" />
              Gemini API Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Paste your Gemini API key to use your own quota for generation and refinement.
            </p>
            <Input
              type="password"
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
              placeholder="AIza..."
              className="bg-[#0d0f14] border border-[rgba(255,255,255,0.08)] text-white"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={clearApiKey} className="bg-[#1a1d27] text-slate-200 hover:bg-[#232736]">
              Clear
            </Button>
            <Button onClick={saveApiKey} className="bg-[#8ab4f8] text-[#0d0f14] hover:bg-[#a8c7fa]">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Container */}
      <div className="flex flex-1 flex-col md:flex-row min-h-[calc(100vh-3.5rem)]">
        
        {/* 2. Sidebar (Google Labs / Gemini App style) */}
        <aside className="w-full md:w-[260px] border-r border-[rgba(255,255,255,0.08)] bg-[#0d0f14] flex flex-col justify-between sticky top-14 h-[calc(100vh-3.5rem)] shrink-0 hidden md:flex">
          
          <div className="flex-1 py-6 px-4 space-y-6">
            
            {/* Nav Group */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase px-3 mb-2">Navigation</div>
              <Link href="/">
                <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all cursor-pointer select-none ${
                  location === "/" 
                    ? "bg-[rgba(138,180,248,0.12)] text-[#8ab4f8] font-medium" 
                    : "text-slate-400 hover:bg-[rgba(138,180,248,0.06)] hover:text-white"
                }`}>
                  <Layers className="w-4 h-4" />
                  <span className="text-sm">Converter</span>
                </div>
              </Link>

              <Link href="/history">
                <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all cursor-pointer select-none ${
                  location.startsWith("/history") || location.startsWith("/sketch")
                    ? "bg-[rgba(138,180,248,0.12)] text-[#8ab4f8] font-medium" 
                    : "text-slate-400 hover:bg-[rgba(138,180,248,0.06)] hover:text-white"
                }`}>
                  <HistoryIcon className="w-4 h-4" />
                  <span className="text-sm">History Log</span>
                </div>
              </Link>
            </div>

            {/* Subtle System Stats (Subtle text labels) */}
            <div className="space-y-3 px-3 pt-4 border-t border-[rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">System Stats</span>
              </div>
              
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full bg-[rgba(255,255,255,0.04)]" />
                  <Skeleton className="h-3 w-2/3 bg-[rgba(255,255,255,0.04)]" />
                </div>
              ) : stats ? (
                <div className="space-y-2.5 text-xs text-slate-400">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total Generated</span>
                    <span className="font-medium text-white">{stats.total}</span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(stats.byFramework || {}).map(([fw, count]) => (
                      <div key={fw} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 capitalize">{fw}</span>
                        <span className="text-slate-300 font-mono">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Bottom Section: Gemini Model Selector */}
          <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[#0d0f14] relative">
            <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase px-1 mb-2">Active AI Model</div>
            
            <button 
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1d27] border border-[rgba(255,255,255,0.08)] text-xs text-white hover:border-[#8ab4f8]/50 transition-all font-mono select-none"
            >
              <div className="flex items-center gap-2">
                <GeminiSparkleIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{selectedModel}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Model Dropdown Picker (Google style) */}
            {modelDropdownOpen && (
              <div className="absolute bottom-16 left-4 right-4 bg-[#1a1d27] border border-[rgba(255,255,255,0.12)] rounded-lg shadow-xl py-1.5 z-50">
                {["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"].map((model) => (
                  <button
                    key={model}
                    onClick={() => selectModel(model)}
                    className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center gap-2 ${
                      selectedModel === model 
                        ? "bg-[rgba(138,180,248,0.12)] text-[#8ab4f8]" 
                        : "text-slate-300 hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <GeminiSparkleIcon className="w-3 h-3 shrink-0" />
                    {model}
                  </button>
                ))}
              </div>
            )}

            {/* Powered by Gemini Badge with Shine */}
            <div className="mt-4 flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-[rgba(138,180,248,0.04)] border border-[rgba(138,180,248,0.08)]">
              <GeminiSparkleIcon className="w-3 h-3" />
              <span className="text-[10px] font-semibold tracking-wide gemini-text-shimmer">
                Powered by Gemini
              </span>
            </div>

            {/* API Key Settings Button */}
            <div className="mt-4">
              <button
                onClick={() => setApiKeyModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-transparent text-[10px] font-bold text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)] transition-all select-none cursor-pointer uppercase tracking-wider"
              >
                <Key className="w-3 h-3" />
                API Key Settings
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Nav Top Bar */}
        <div className="md:hidden border-b border-[rgba(255,255,255,0.08)] bg-[#0d0f14] p-3 flex items-center justify-between sticky top-14 z-40">
          <div className="flex gap-2">
            <Link href="/">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${location === "/" ? "bg-[rgba(138,180,248,0.12)] text-[#8ab4f8]" : "text-slate-400"}`}>
                Converter
              </div>
            </Link>
            <Link href="/history">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${location.startsWith("/history") || location.startsWith("/sketch") ? "bg-[rgba(138,180,248,0.12)] text-[#8ab4f8]" : "text-slate-400"}`}>
                History
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-[rgba(255,255,255,0.08)] text-slate-300 hover:text-white hover:border-[#8ab4f8]/60 transition-colors"
              aria-label="Gemini API key settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={handleGlobalRun}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#8ab4f8] text-[#0d0f14] text-xs font-semibold hover:bg-[#a8c7fa]"
            >
              Run
            </button>
          </div>
        </div>

        {/* 3. Main Content View Area */}
        <main className="flex-1 overflow-x-hidden bg-[#0d0f14] relative">
          {children}
        </main>
      </div>

      {/* Built with Google AI Footer badge */}
      <footer className="py-2.5 px-6 border-t border-[rgba(255,255,255,0.04)] bg-[#0a0c10] flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div>&copy; {new Date().getFullYear()} Imagica Engine</div>
        <div className="flex items-center gap-1 select-none">
          <span>Built with</span>
          <span className="font-semibold text-slate-400">Google AI</span>
        </div>
      </footer>
    </div>
  );
}
