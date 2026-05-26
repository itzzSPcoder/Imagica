import { useParams, useLocation } from "wouter";
import {
  useDeleteSketch,
  useRegenerateSketch,
  getGetSketchQueryKey,
  getGetSketchQueryOptions,
} from "@workspace/api-client-react";
import { ReactCompareSlider } from "react-compare-slider";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  Settings2,
  Code2,
  Clock,
  Image as ImageIcon,
  Loader2,
  Download,
  Sparkles,
  Eye,
  MonitorSmartphone,
  Scan,
  Brain,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPreviewHtml } from "@/lib/preview-html";

const FRAMEWORK_LABELS: Record<string, string> = {
  "react-tailwind": "React + Tailwind",
  "react-shadcn": "React + shadcn/ui",
  "html-tailwind": "HTML + Tailwind",
  "mern-stack": "Full Stack (MERN)",
};

const FILE_EXTENSIONS: Record<string, string> = {
  "react-tailwind": "tsx",
  "react-shadcn": "tsx",
  "html-tailwind": "html",
  "mern-stack": "tsx",
};

const ELEMENT_ICONS: Record<string, string> = {
  button: "🔘",
  input: "📝",
  textarea: "📋",
  select: "📂",
  navbar: "🧭",
  sidebar: "📐",
  header: "📌",
  footer: "🔻",
  card: "🃏",
  table: "📊",
  list: "📃",
  modal: "💬",
  image: "🖼️",
  avatar: "👤",
  icon: "✨",
  badge: "🏷️",
  tab: "📑",
  form: "📄",
  chart: "📈",
  search: "🔍",
  dropdown: "⬇️",
  link: "🔗",
  divider: "➖",
  checkbox: "☑️",
  radio: "🔘",
  toggle: "🔀",
  "progress-bar": "📊",
  notification: "🔔",
};

type ActiveTab = "code" | "preview" | "analysis";

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
        fill="url(#gemini-sparkle-grad-detail)"
      />
      <defs>
        <linearGradient id="gemini-sparkle-grad-detail" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.33" stopColor="#9B72CB"/>
          <stop offset="0.66" stopColor="#D96570"/>
          <stop offset="1" stopColor="#1B9AAA"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function SketchDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isValidId = Number.isFinite(id) && id > 0;
  const {
    data: sketch,
    isLoading,
    isError,
    error,
  } = useQuery({
    ...getGetSketchQueryOptions(id),
    enabled: isValidId,
    retry: 1,
  });
  const deleteSketch = useDeleteSketch();
  const regenerateSketch = useRegenerateSketch();
  const queryClient = useQueryClient();

  const [streamedCode, setStreamedCode] = useState<string>("");
  const [streamedAnalysis, setStreamedAnalysis] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isRefining, setIsRefining] = useState<boolean>(false);

  useEffect(() => {
    if (!sketch?.id) return;

    fetch(`/api/sketches/${sketch.id}/messages`)
      .then((res) => res.json())
      .then((data) => {
        setChatMessages(data);
      })
      .catch((err) => console.error("Failed to load chat history", err));
  }, [sketch?.id, sketch?.generatedCode]);

  useEffect(() => {
    // Auto-scroll chat refinement sidebar
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isRefining]);

  const handleStackBlitzExport = () => {
    if (!sketch) return;

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://stackblitz.com/run";
    form.target = "_blank";

    const addField = (name: string, value: string) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addField("project[title]", sketch.title);
    addField("project[description]", `Generated from hand-drawn sketch via Imagica`);
    addField("project[template]", "vite");

    if (sketch.framework === "html-tailwind") {
      addField("project[files][index.html]", sketch.generatedCode);
    } else if (sketch.framework === "mern-stack") {
      addField("project[files][App.tsx]", sketch.generatedCode);
      addField("project[files][index.html]", `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <title>Imagica Export</title>
  </head>
  <body class="bg-slate-900 text-foreground">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
    } else {
      addField("project[files][src/App.tsx]", sketch.generatedCode);
      addField("project[files][src/main.tsx]", `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`);
      addField("project[files][src/index.css]", `
@import "tailwindcss";
`);
      addField("project[files][index.html]", `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Imagica Export</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
    
    toast({
      title: "StackBlitz Sandbox",
      description: "Assembling live export playground...",
    });
  };

  const handleSendRefinement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !sketch) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setIsRefining(true);

    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreamedCode("");

    const userApiKey = typeof window !== "undefined" ? window.localStorage.getItem("gemini_api_key") || "" : "";
    const userModel = typeof window !== "undefined" ? window.localStorage.getItem("gemini_model") || "gemini-2.0-flash" : "gemini-2.0-flash";
    const eventSource = new EventSource(`/api/sketches/${sketch.id}/refine?message=${encodeURIComponent(userMsg)}&apiKey=${encodeURIComponent(userApiKey)}&model=${encodeURIComponent(userModel)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chunk") {
          setStreamedCode((prev) => prev + data.content);
        } else if (data.type === "error") {
          toast({
            title: "Refinement failed",
            description: data.message,
            variant: "destructive",
          });
          setIsStreaming(false);
          setIsRefining(false);
          eventSource.close();
        } else if (data.type === "done") {
          setIsStreaming(false);
          setIsRefining(false);
          eventSource.close();

          fetch(`/api/sketches/${sketch.id}/messages`)
            .then((res) => res.json())
            .then((msgs) => setChatMessages(msgs));

          queryClient.invalidateQueries({ queryKey: [`/api/sketches/${sketch.id}`] });
          toast({
            title: "Refinement Completed",
            description: "Sketch sandbox updated successfully.",
          });
        }
      } catch (e) {
        console.error("Failed to parse refinement stream event", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Refinement stream error:", err);
      toast({
        title: "Connection error",
        description: "Lost connection to refinement stream",
        variant: "destructive",
      });
      setIsStreaming(false);
      setIsRefining(false);
      eventSource.close();
    };
  };

  useEffect(() => {
    if (!sketch || sketch.generatedCode) {
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setStreamedCode("");
    setStreamedAnalysis(null);
    setStreamError(null);

    const userApiKey = typeof window !== "undefined" ? window.localStorage.getItem("gemini_api_key") || "" : "";
    const userModel = typeof window !== "undefined" ? window.localStorage.getItem("gemini_model") || "gemini-2.0-flash" : "gemini-2.0-flash";

    // Open connection to SSE code generation endpoint
    const eventSource = new EventSource(`/api/sketches/${sketch.id}/stream?apiKey=${encodeURIComponent(userApiKey)}&model=${encodeURIComponent(userModel)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chunk") {
          setStreamedCode((prev) => prev + data.content);
        } else if (data.type === "analysis") {
          setStreamedAnalysis(data.analysis);
        } else if (data.type === "error") {
          setStreamError(data.message);
          setIsStreaming(false);
          eventSource.close();
        } else if (data.type === "done") {
          setIsStreaming(false);
          eventSource.close();
          queryClient.invalidateQueries({ queryKey: [`/api/sketches/${sketch.id}`] });
        }
      } catch (e) {
        console.error("Failed to parse SSE event", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setStreamError("Lost connection to generation stream");
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sketch?.id, sketch?.generatedCode, queryClient]);

  // Bind keyboard shortcut Ctrl+Enter to trigger regeneration/run if on sketch detail
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const runBtn = document.getElementById("run-btn");
        if (runBtn) runBtn.click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newInstructions, setNewInstructions] = useState("");
  const [newFramework, setNewFramework] = useState<string>("react-tailwind");

  const handleDownload = () => {
    if (!sketch) return;
    const ext = FILE_EXTENSIONS[sketch.framework] ?? "txt";
    const blob = new Blob([sketch.generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sketch.title.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: `Saved as ${a.download}` });
  };

  const handleDelete = () => {
    deleteSketch.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Sketch deleted" });
          setLocation("/history");
        },
      }
    );
  };

  const handleRegenerate = () => {
    regenerateSketch.mutate(
      {
        id,
        data: {
          instructions: newInstructions || undefined,
          framework: newFramework as any,
        },
      },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetSketchQueryKey(id), updated);
          setStreamedCode("");
          setStreamedAnalysis(null);
          setStreamError(null);
          toast({
            title: "Regeneration started",
            description: "Gemini is rebuilding your component in the live preview.",
          });
          setIsRegenerateOpen(false);
          setActiveTab("preview");
        },
        onError: (err) => {
          toast({
            title: "Regeneration failed",
            description: (err as any).error || "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex flex-col h-[calc(100vh-3.5rem)] space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64 bg-card" />
          <Skeleton className="h-10 w-32 bg-card" />
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          <div className="lg:col-span-8">
            <Skeleton className="h-full w-full rounded-2xl bg-card" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-full w-full rounded-2xl bg-card" />
          </div>
        </div>
      </div>
    );
  }

  if (!isValidId || (!isLoading && !sketch)) {
    const apiMessage =
      isError && error && typeof error === "object" && "data" in error
        ? (error as { data?: { error?: string } }).data?.error
        : undefined;

    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)] bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="w-14 h-14 bg-card border border-border rounded-full flex items-center justify-center mx-auto">
            <Code2 className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Sketch not found</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {apiMessage ||
              (!isValidId
                ? "Invalid sketch link. Open a sketch from History or generate a new one."
                : "This sketch doesn't exist anymore. Generate a new one from the Convert tab.")}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/studio")} className="rounded-full text-xs">
              Convert
            </Button>
            <Button variant="outline" onClick={() => setLocation("/history")} className="rounded-full text-xs">
              <ArrowLeft className="w-4 h-4 mr-2" /> History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!sketch) {
    return null;
  }

  const codeToRender =
    (isStreaming || isRefining) && streamedCode
      ? streamedCode
      : sketch.generatedCode || streamedCode;
  const previewHtml = buildPreviewHtml(codeToRender, sketch.framework);

  const rawAnalysis = (sketch as any).analysis;
  const analysis = (rawAnalysis
    ? typeof rawAnalysis === "string"
      ? JSON.parse(rawAnalysis)
      : rawAnalysis
    : streamedAnalysis) as {
    elements?: { type: string; label: string; count?: number }[];
    layout?: string;
    colorScheme?: string;
    complexity?: string;
  } | undefined;

  const TABS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "preview", label: "Result Sandbox", icon: MonitorSmartphone },
    { id: "analysis", label: "Gemini Vision", icon: Brain },
    { id: "code", label: "Generated Code", icon: Code2 },
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 md:p-6 bg-background overflow-hidden">
      
      {/* ── Header Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0 bg-background">
        
        {/* Left Section: Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/history")}
            className="rounded-full shrink-0 border border-border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 text-foreground/80" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground tracking-normal truncate leading-tight select-all">
              {sketch.title}
            </h1>
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              <Badge
                variant="secondary"
                className="font-mono text-[9px] uppercase tracking-wider shrink-0 bg-primary/10 border border-primary/20 text-primary py-0.5 rounded-full"
              >
                {FRAMEWORK_LABELS[sketch.framework] ?? sketch.framework}
              </Badge>
              <div className="flex items-center text-[10px] text-muted-foreground gap-1 shrink-0 font-medium select-none">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(sketch.createdAt), "MMM d · h:mm a")}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Action Chips (Google Style - Text + Icon outline pills) */}
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          
          <button 
            onClick={handleStackBlitzExport}
            className="px-3.5 py-1.5 rounded-full border border-border bg-card text-xs text-foreground/80 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all flex items-center gap-1.5 select-none cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Open in StackBlitz
          </button>
          
          <button 
            onClick={handleDownload}
            className="px-3.5 py-1.5 rounded-full border border-border bg-card text-xs text-foreground/80 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all flex items-center gap-1.5 select-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>

          <button
            onClick={() => window.open(`/preview/${sketch.id}`, "_blank")}
            className="px-3.5 py-1.5 rounded-full border border-border bg-card text-xs text-primary hover:bg-primary/10 hover:border-primary/30 transition-all flex items-center gap-1.5 select-none cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Preview
          </button>

          {/* Dialog for Regenerate */}
          <Dialog open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
            <DialogTrigger asChild>
              <button
                id="run-btn"
                onClick={() => {
                  setNewFramework(sketch.framework);
                  setNewInstructions(sketch.instructions || "");
                }}
                className="px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-colors flex items-center gap-1.5 select-none cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] bg-card border border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground font-sans">
                  <GeminiSparkleIcon className="w-4 h-4" />
                  Regenerate Component
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs font-sans">
                  Target a different output framework or modify styling instructions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Framework</label>
                  <Select value={newFramework} onValueChange={setNewFramework}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="react-tailwind" className="focus:bg-primary/10 focus:text-primary">React + Tailwind CSS</SelectItem>
                      <SelectItem value="react-shadcn" className="focus:bg-primary/10 focus:text-primary">React + shadcn/ui</SelectItem>
                      <SelectItem value="html-tailwind" className="focus:bg-primary/10 focus:text-primary">HTML + Tailwind CSS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Additional Prompt Guidelines
                  </label>
                  <Textarea
                    placeholder="e.g. Apply dark mode, add high contrast cards, create interactive buttons..."
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    rows={4}
                    className="bg-background border-border text-foreground resize-none text-xs"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setIsRegenerateOpen(false)} className="rounded-full text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </Button>
                <Button onClick={handleRegenerate} disabled={regenerateSketch.isPending} className="bg-primary text-primary-foreground hover:opacity-90 rounded-full text-xs">
                  {regenerateSketch.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Rebuild Code
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog */}
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogTrigger asChild>
              <button className="p-2 rounded-full border border-border bg-card text-muted-foreground hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer select-none">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[380px] bg-card border border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="text-foreground">Delete Layout?</DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  Are you sure you want to delete "{sketch.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 mt-2">
                <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="rounded-full text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteSketch.isPending}
                  className="rounded-full text-xs"
                >
                  {deleteSketch.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Delete Permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Workspace Split Grid */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 pb-4">
        
        {/* Left Workspace Panel (Col-span fill) */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Tab bar switcher */}
          <div className="flex items-center gap-1.5 mb-3 shrink-0 border-b border-border pb-0 select-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px cursor-pointer ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === "preview" && (
                  <span className="ml-1 text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Live Preview
                  </span>
                )}
              </button>
            ))}

            {sketch.instructions && (
              <div className="ml-auto">
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-1 px-3 py-1 rounded-full border border-border hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground cursor-pointer select-none">
                      <Settings2 className="w-3 h-3 text-primary" />
                      Instructions
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border border-border text-foreground max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Active Prompt Guidelines</DialogTitle>
                    </DialogHeader>
                    <div className="bg-background p-4 border border-border rounded-lg text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/80">
                      {sketch.instructions}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Google AI Studio styled surface card container */}
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border bg-card flex flex-col relative">
            
            {/* Thin top border in Gemini gradient */}
            <div className="h-[2px] w-full gemini-gradient shrink-0" />

            {/* Generated Code Tab */}
            {activeTab === "code" && (
              <div className="w-full h-full overflow-hidden absolute inset-0 z-10 bg-card flex flex-col">
                <div className="flex-1 min-h-0 relative">
                  <CodeBlock code={codeToRender} language={sketch.framework} />
                </div>
                {/* Generated by Gemini watermark */}
                <div className="absolute bottom-3 right-4 text-[10px] font-mono text-muted-foreground bg-card px-2 py-0.5 rounded select-none pointer-events-none">
                  Generated by Gemini 2.5
                </div>
              </div>
            )}

            {/* AI Vision Analysis Tab */}
            {activeTab === "analysis" && (
              <div className="w-full h-full overflow-auto absolute inset-0 z-10 bg-card p-6 scrollbar-thin">
                <div className="max-w-3xl mx-auto space-y-6">
                  
                  {/* Header */}
                  <div className="flex items-center gap-3 select-none">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Scan className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Vision Structuring Report</h3>
                      <p className="text-[11px] text-muted-foreground">Gemini's automated pixel-coordinate parsing logs</p>
                    </div>
                  </div>

                  {analysis && analysis.elements && analysis.elements.length > 0 ? (
                    <>
                      {/* Stats cards grid */}
                      <div className="grid grid-cols-3 gap-4 select-none">
                        <div className="bg-background/50 border border-border rounded-xl p-4 space-y-1">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Components</p>
                          <p className="text-xl font-semibold text-primary">
                            {analysis.elements.reduce((sum, el) => sum + (el.count || 1), 0)}
                          </p>
                        </div>
                        <div className="bg-background/50 border border-border rounded-xl p-4 space-y-1">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Palette</p>
                          <p className="text-xs font-medium text-foreground capitalize truncate">{analysis.colorScheme || "Material Dark"}</p>
                        </div>
                        <div className="bg-background/50 border border-border rounded-xl p-4 space-y-1">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Complexity</p>
                          <p className="text-xs font-medium text-foreground capitalize flex items-center">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                              analysis.complexity === "high" ? "bg-red-400 animate-pulse" :
                              analysis.complexity === "medium" ? "bg-yellow-400" : "bg-green-400"
                            }`} />
                            {analysis.complexity || "Medium"}
                          </p>
                        </div>
                      </div>

                      {/* Layout Description */}
                      {analysis.layout && analysis.layout !== "unknown" && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                          <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1 select-none">Structural Evaluation</p>
                          <p className="text-xs text-foreground/80 leading-relaxed font-sans">{analysis.layout}</p>
                        </div>
                      )}

                      {/* Elements Grid */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider px-1 select-none">Mapped UI Nodes</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {analysis.elements.map((el, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-background/30 border border-border rounded-xl hover:bg-background/50 transition-colors">
                              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-sm shrink-0">
                                {ELEMENT_ICONS[el.type] || "📦"}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-foreground capitalize truncate">{el.type}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{el.label}</p>
                              </div>
                              {el.count && el.count > 1 && (
                                <Badge variant="secondary" className="text-[9px] shrink-0 font-mono">
                                  ×{el.count}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground select-none">
                      <Scan className="w-8 h-8 mx-auto mb-3 opacity-30 text-primary" />
                      <p className="text-xs">No analysis telemetry available.</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Rebuild the component to trigger vision report.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Preview Tab */}
            {activeTab === "preview" && (
              <div className="w-full h-full overflow-hidden absolute inset-0 z-10 bg-white flex flex-col">
                {isStreaming ? (
                  
                  // Google Loading Progress Screen
                  <div className="w-full h-full bg-card flex flex-col p-6 font-sans text-foreground/80 select-none">
                    
                    <div className="flex items-center justify-between border-b border-border pb-4 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <GeminiSparkleIcon className="w-4 h-4 text-primary" />
                        <span className="font-bold uppercase tracking-wider text-[10px] text-primary">Gemini Intelligence Engine</span>
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {FRAMEWORK_LABELS[sketch.framework]} · COMPILED_STREAM
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center gap-5 max-w-md mx-auto w-full">
                      <div className="relative flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full border border-primary/20 border-t-primary animate-spin" />
                        <Brain className="w-5 h-5 text-primary absolute animate-pulse" />
                      </div>
                      <div className="text-center space-y-2">
                        <h4 className="text-xs font-semibold text-primary">Assembling UI components...</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Compiling reactive code files, aligning grid nodes, and building preview sandbox.
                        </p>
                        <div className="google-progress-bar max-w-[200px] mx-auto mt-2">
                          <div className="google-progress-bar-value" />
                        </div>
                      </div>
                    </div>

                    <div className="h-36 border border-border bg-background/80 rounded-xl p-4 overflow-hidden shrink-0 flex flex-col justify-end">
                      <div className="text-[9px] text-muted-foreground uppercase mb-2 border-b border-border pb-1 font-sans font-bold tracking-wider">
                        Live Code Compiler Output
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-[10px] text-[#81c995] leading-normal opacity-90 max-h-[80px] overflow-hidden">
                        {streamedCode.slice(-250) || "// Starting compiler process..."}
                      </pre>
                    </div>
                  </div>
                ) : (
                  
                  // Double Compare Slider
                  <ReactCompareSlider
                    className="w-full h-full"
                    itemOne={
                      <div className="w-full h-full bg-background flex items-center justify-center p-4 select-none">
                        <img
                          src={sketch.imageDataUrl}
                          alt={sketch.title}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                      </div>
                    }
                    itemTwo={
                      
                      // 6. Live Preview Panel (Google Chrome DevTools style)
                      <div className="w-full h-full flex flex-col bg-white">
                        
                        {/* Chrome Tab Bar */}
                        <div className="flex items-center justify-between px-4 py-2 bg-[#13151c] border-b border-border shrink-0 select-none">
                          <div className="flex items-center gap-3">
                            
                            {/* Window controls */}
                            <div className="flex gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
                              <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
                            </div>
                            
                            {/* Tab bubble */}
                            <div className="flex items-center gap-2 px-3.5 py-1 bg-card border-t border-x border-border rounded-t-md text-[10px] text-foreground font-sans font-medium mt-1 -mb-[9px] relative">
                              <GeminiSparkleIcon className="w-3 h-3 text-primary" />
                              <span>Imagica Sandbox</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                            </div>
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Sandbox Render</div>
                        </div>

                        {/* Chrome Address Bar */}
                        <div className="flex items-center gap-3 px-4 py-1.5 bg-card border-b border-border shrink-0 select-none">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 opacity-60">
                              <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 opacity-60">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 opacity-80 hover:text-foreground cursor-pointer ml-0.5">
                              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                            </svg>
                          </div>

                          <div className="flex-1 flex items-center gap-2 bg-background/80 border border-border rounded-full px-3 py-0.5 text-[10px] text-muted-foreground font-mono">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-emerald-400 shrink-0">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span className="truncate">imagica://preview/{sketch.id}</span>
                          </div>

                          <button
                            onClick={() => window.open(`/preview/${sketch.id}`, "_blank")}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Open preview in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Rendering iframe */}
                        <iframe
                          key={sketch.id}
                          srcDoc={previewHtml}
                          className="flex-1 w-full border-0 bg-white"
                          title="Component Preview"
                        />

                        {/* Bottom Status bar */}
                        <div className="px-4 py-1.5 border-t border-border bg-[#13151c] flex items-center justify-between text-[9px] text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Rendered with Gemini Vision</span>
                          </div>
                          <div className="font-mono text-[9px]">STATUS: OK (200)</div>
                        </div>
                      </div>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* 7. Chat Refinement Sidebar (Google Gemini Chat style) */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-card/40 border border-border rounded-xl overflow-hidden shadow-xl">
          
          {/* Sidebar Chat Header */}
          <div className="p-4 border-b border-border bg-card/40 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <GeminiSparkleIcon className="w-4 h-4 text-primary" />
              <span className="font-semibold text-xs tracking-normal text-foreground">Gemini Refiner Chat</span>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">v2.5</div>
          </div>

          {/* Chat Messages Console */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[260px] max-h-[480px] lg:max-h-none scrollbar-thin">
            {chatMessages.length === 0 ? (
              
              // Empty State
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 opacity-90 select-none">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-foreground">Interactive Refinement</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
                    Type instructions in plain english. Gemini will modify the component structure instantly!
                  </p>
                  <div className="pt-2 text-left space-y-1 bg-background/50 border border-border p-3 rounded-xl text-[9px] font-mono">
                    <p className="text-muted-foreground font-sans font-bold uppercase tracking-wider mb-1">Try saying:</p>
                    <p className="text-primary cursor-pointer" onClick={() => setChatInput("Make the cards transparent with soft blue outlines")}>
                      "Make the cards transparent with soft blue outlines"
                    </p>
                    <p className="text-primary cursor-pointer mt-1" onClick={() => setChatInput("Add a sticky navigation bar with a glassmorphism style")}>
                      "Add a sticky navigation bar with a glassmorphism style"
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              
              // Messages Loop
              chatMessages.map((msg, i) => (
                <div key={i} className="space-y-1.5">
                  {msg.role === "user" ? (
                    
                    // User Message (Right-aligned pill blue)
                    <div className="flex flex-col items-end max-w-[85%] ml-auto">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mr-1.5 select-none">You</span>
                      <div className="p-3 bg-primary text-primary-foreground rounded-2xl rounded-tr-none text-xs font-medium leading-relaxed shadow-sm shadow-primary/5 select-all">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    
                    // Gemini Response (Left-aligned white/slate next to Sparkle Avatar)
                    <div className="flex items-start gap-3.5 max-w-[85%] mr-auto">
                      <div className="w-6.5 h-6.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 select-none">
                        <img src={`${import.meta.env.BASE_URL}logo.png`} className="w-3.5 h-3.5 object-contain" alt="Gemini" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest select-none">Gemini</span>
                        <div className="bg-card/80 border border-border text-foreground text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none leading-relaxed select-all">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Stream refining loader */}
            {isRefining && (
              <div className="flex items-start gap-3.5 max-w-[85%] mr-auto">
                <div className="w-6.5 h-6.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <img src={`${import.meta.env.BASE_URL}logo.png`} className="w-3.5 h-3.5 object-contain" alt="Gemini" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest select-none">Gemini</span>
                  <div className="bg-card/80 border border-border text-primary text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none leading-relaxed flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-primary" />
                    Streaming refined component...
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatBottomRef} />
          </div>

          {/* Chat bottom input panel (Google Search Bar Style rounded-full) */}
          <form onSubmit={handleSendRefinement} className="p-4 border-t border-border bg-background flex flex-col gap-2 shrink-0">
            <div className="relative flex items-center bg-card border border-border rounded-full px-4.5 py-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <input
                type="text"
                placeholder={isStreaming || isRefining ? "Analyzing component..." : "Refine with Gemini..."}
                disabled={isStreaming || isRefining}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none py-2.5 pr-9 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isStreaming || isRefining || !chatInput.trim()}
                className="absolute right-1.5 p-2 rounded-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none cursor-pointer flex items-center justify-center shrink-0"
              >
                {isRefining ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
      
    </div>
  );
}

