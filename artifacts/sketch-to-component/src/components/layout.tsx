import { Link, useLocation } from "wouter";
import { Settings, History as HistoryIcon, Sparkles, ChevronDown, Layers, Activity, Key, Save } from "lucide-react";
import { useGetSketchStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import logoUrl from "@/assets/logo.svg";

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
    if (location === "/studio") {
      const genBtn = document.getElementById("generate-btn");
      if (genBtn) genBtn.click();
    } else if (isSketchDetail) {
      const runBtn = document.getElementById("run-btn");
      if (runBtn) runBtn.click();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      
      {/* 1. Top Navigation Bar (Google AI Studio style) */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-6">
        
        {/* Left: Branding */}
        <Link href="/">
          <div className="flex cursor-pointer select-none items-center gap-2.5">
            <img src={logoUrl} alt="Imagica" className="h-8 w-8 object-contain bg-transparent" />
            <span className="font-headline text-lg font-semibold tracking-normal text-foreground">
              Imagica
            </span>
            <div className="hidden items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline-flex">
              <Sparkles className="h-2.5 w-2.5 text-primary" />
              Studio
            </div>
          </div>
        </Link>

        {/* Center: Horizontal pill-shaped tab switcher */}
        <div className="flex items-center rounded-full border border-border bg-muted/40 p-1">
          <Link href="/studio">
            <button className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all select-none ${
              location === "/studio" 
                ? "nav-pill-active bg-card" 
                : "nav-pill"
            }`}>
              Convert
            </button>
          </Link>

          <Link href="/history">
            <button className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all select-none ${
              location.startsWith("/history") 
                ? "nav-pill-active bg-card" 
                : "nav-pill"
            }`}>
              History
            </button>
          </Link>

          <Link href={sketchId ? `/sketch/${sketchId}` : "#"}>
            <button 
              disabled={!isSketchDetail}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all select-none ${
                isSketchDetail 
                  ? "nav-pill-active bg-card" 
                  : "cursor-not-allowed text-muted-foreground/50"
              }`}
            >
              Workbench
            </button>
          </Link>
        </div>

        {/* Right: Settings + Run button */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setApiKeyModalOpen(true)}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:inline-flex"
            aria-label="Gemini API key settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={handleGlobalRun}
            className="hidden items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90 sm:inline-flex select-none"
          >
            Run
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal tracking-wide opacity-75">
              Ctrl+Enter
            </span>
          </button>
        </div>
      </header>

      <Dialog open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen}>
        <DialogContent className="border border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Key className="w-4 h-4 text-primary" />
              Gemini API Key
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Paste your Gemini API key to use your own quota for generation and refinement.
            </p>
            <Input
              type="password"
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
              placeholder="AIza..."
              className="bg-background border border-border text-foreground"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="secondary" onClick={clearApiKey} className="bg-card text-foreground hover:bg-muted">
              Clear
            </Button>
            <Button onClick={saveApiKey} className="bg-primary text-primary-foreground hover:opacity-90">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Container */}
      <div className="flex flex-1 flex-col md:flex-row min-h-[calc(100vh-3.5rem)]">
        
        {/* 2. Sidebar (Google Labs / Gemini App style) */}
        <aside className="w-full md:w-[260px] border-r border-border bg-background flex flex-col justify-between sticky top-14 h-[calc(100vh-3.5rem)] shrink-0 hidden md:flex">
          
          <div className="flex-1 py-6 px-4 space-y-6">
            
            {/* Nav Group */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-3 mb-2">Navigation</div>
              <Link href="/studio">
                <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all cursor-pointer select-none ${
                  location === "/studio" 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                }`}>
                  <Layers className="w-4 h-4" />
                  <span className="text-sm">Converter</span>
                </div>
              </Link>

              <Link href="/history">
                <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full transition-all cursor-pointer select-none ${
                  location.startsWith("/history") || location.startsWith("/sketch")
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                }`}>
                  <HistoryIcon className="w-4 h-4" />
                  <span className="text-sm">History Log</span>
                </div>
              </Link>
            </div>

            {/* Subtle System Stats (Subtle text labels) */}
            <div className="space-y-3 px-3 pt-4 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">System Stats</span>
              </div>
              
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full bg-muted" />
                  <Skeleton className="h-3 w-2/3 bg-muted" />
                </div>
              ) : stats ? (
                <div className="space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Generated</span>
                    <span className="font-medium text-foreground">{stats.total}</span>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(stats.byFramework || {}).map(([fw, count]) => (
                      <div key={fw} className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground capitalize">{fw}</span>
                        <span className="text-foreground/80 font-mono">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Bottom Section: Gemini Model Selector */}
          <div className="p-4 border-t border-border bg-background relative">
            <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase px-1 mb-2">Active AI Model</div>
            
            <button 
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-card border border-border text-xs text-foreground hover:border-primary/50 transition-all font-mono select-none"
            >
              <div className="flex items-center gap-2">
                <GeminiSparkleIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{selectedModel}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Model Dropdown Picker (Google style) */}
            {modelDropdownOpen && (
              <div className="absolute bottom-16 left-4 right-4 bg-card border border-border rounded-lg shadow-xl py-1.5 z-50">
                {["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"].map((model) => (
                  <button
                    key={model}
                    onClick={() => selectModel(model)}
                    className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors flex items-center gap-2 ${
                      selectedModel === model 
                        ? "bg-primary/10 text-primary" 
                        : "text-foreground/80 hover:bg-muted"
                    }`}
                  >
                    <GeminiSparkleIcon className="w-3 h-3 shrink-0" />
                    {model}
                  </button>
                ))}
              </div>
            )}

            {/* Powered by Gemini Badge with Shine */}
            <div className="mt-4 flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-primary/5 border border-primary/15">
              <GeminiSparkleIcon className="w-3 h-3" />
              <span className="text-[10px] font-semibold tracking-wide gemini-text-shimmer">
                Powered by Gemini
              </span>
            </div>

            {/* API Key Settings Button */}
            <div className="mt-4">
              <button
                onClick={() => setApiKeyModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border border-border bg-transparent text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all select-none cursor-pointer uppercase tracking-wider"
              >
                <Key className="w-3 h-3" />
                API Key Settings
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Nav Top Bar */}
        <div className="md:hidden border-b border-border bg-background p-3 flex items-center justify-between sticky top-14 z-40">
          <div className="flex gap-2">
            <Link href="/studio">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${location === "/studio" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                Converter
              </div>
            </Link>
            <Link href="/history">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${location.startsWith("/history") || location.startsWith("/sketch") ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                History
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setApiKeyModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-foreground/80 hover:text-foreground hover:border-primary/60 transition-colors"
              aria-label="Gemini API key settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={handleGlobalRun}
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Run
            </button>
          </div>
        </div>

        {/* 3. Main Content View Area */}
        <main className="flex-1 overflow-x-hidden bg-background relative">
          {children}
        </main>
      </div>

      {/* Built with Google AI Footer badge */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border bg-background px-6 py-2.5 text-[11px] text-muted-foreground">
        <div>&copy; {new Date().getFullYear()} Imagica Engine</div>
        <div className="flex items-center gap-1 select-none">
          <span>Built with</span>
          <span className="font-semibold text-muted-foreground">Google AI</span>
        </div>
      </footer>
    </div>
  );
}
