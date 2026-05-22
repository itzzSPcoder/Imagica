import { useState, useCallback, useRef } from "react";
import { UploadCloud, Sparkles, X, Loader2, Zap, Eye, Code2, Camera, Image as ImageIcon, Check } from "lucide-react";
import { useCreateSketch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const FRAMEWORKS = [
  {
    value: "react-tailwind",
    label: "React + Tailwind CSS",
    shortLabel: "React + Tailwind",
    description: "Functional React component styled with utility classes",
  },
  {
    value: "react-shadcn",
    label: "React + shadcn/ui",
    shortLabel: "React + shadcn",
    description: "Component library using Radix UI primitives & Tailwind CSS",
  },
  {
    value: "html-tailwind",
    label: "HTML + Tailwind CSS",
    shortLabel: "HTML + Tailwind",
    description: "Standalone plain HTML page utilizing the Tailwind CDN",
  },
  {
    value: "mern-stack",
    label: "Full Stack (MERN)",
    shortLabel: "MERN Fullstack",
    description: "React frontend coupled with Express API & MongoDB schema",
  },
];

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
        fill="url(#gemini-sparkle-grad-home)"
      />
      <defs>
        <linearGradient id="gemini-sparkle-grad-home" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4"/>
          <stop offset="0.33" stopColor="#9B72CB"/>
          <stop offset="0.66" stopColor="#D96570"/>
          <stop offset="1" stopColor="#1B9AAA"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [title, setTitle] = useState("");
  const [framework, setFramework] = useState("react-tailwind");
  const [instructions, setInstructions] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const createSketch = useCreateSketch();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or JPEG image.",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      if (!title) {
        setTitle(
          file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [title]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleGenerate = () => {
    if (!image) return;

    createSketch.mutate(
      {
        data: {
          title: title || "Untitled Sketch",
          imageDataUrl: image,
          framework: framework as any,
          instructions: instructions || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Generation Complete!",
            description: "Your component has been generated successfully.",
          });
          setLocation(`/sketch/${data.id}`);
        },
        onError: (err) => {
          toast({
            title: "Generation Failed",
            description: (err as any).data?.error || (err as Error).message || "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const selectedFramework = FRAMEWORKS.find((f) => f.value === framework);

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#0d0f14] font-sans">
      
      {/* ── Background Glow Accents ── */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[rgba(66,133,244,0.06)] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[rgba(155,114,203,0.05)] blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto p-6 md:p-10 relative z-10 space-y-10">
        
        {/* Header Section (Google Labs style) */}
        <div className="text-center md:text-left space-y-3.5 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.15)] text-[#8ab4f8] text-[11px] font-semibold uppercase tracking-wider select-none">
            <GeminiSparkleIcon className="w-3.5 h-3.5" />
            Google Workspace Labs Showcase
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-normal text-white font-sans leading-tight">
            Sketch to Code with{" "}
            <span className="gemini-text-shimmer font-bold">
              Gemini Vision
            </span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed font-sans">
            Upload hand-drawn mockups, layout screenshots, or tablet drawings. Imagica compiles your sketches instantly into clean, high-performance web components using Google's frontier multimodal models.
          </p>
        </div>

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Upload Area & Framework Selector (Left Pane - Col 7) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            
            {/* 3. Upload Zone (Google Drive / Google Photos style) */}
            <div
              className={`flex-1 border-2 border-dashed rounded-2xl transition-all duration-300 min-h-[380px] relative overflow-hidden flex flex-col items-center justify-center text-center p-6 ${
                image
                  ? "bg-[#1a1d27]/40 border-[rgba(255,255,255,0.08)]"
                  : isDragging
                  ? "border-[#8ab4f8] bg-[rgba(138,180,248,0.04)] scale-[1.01]"
                  : "border-[rgba(255,255,255,0.08)] hover:border-[#8ab4f8]/50 hover:bg-[#1a1d27]/20"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !image && fileInputRef.current?.click()}
            >
              {image ? (
                <div className="w-full h-full relative group flex flex-col items-center justify-center">
                  
                  {/* Image preview */}
                  <img
                    src={image}
                    alt="Sketch preview"
                    className="max-h-[340px] object-contain rounded-lg shadow-2xl transition-transform duration-300 group-hover:scale-[1.005]"
                  />

                  {/* Google Photos style floating chip overlay */}
                  <div className="absolute top-3 left-3 bg-[#1a1d27] border border-[rgba(255,255,255,0.12)] shadow-lg rounded-full py-1 px-3.5 flex items-center gap-2 select-none z-10 backdrop-blur-md">
                    <ImageIcon className="w-3.5 h-3.5 text-[#8ab4f8]" />
                    <span className="text-xs text-white max-w-[200px] truncate font-medium">{fileName || "sketch.png"}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(null);
                        setFileName("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="w-4 h-4 rounded-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5 text-slate-300 hover:text-white" />
                    </button>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#0d0f14]/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 rounded-lg pointer-events-none">
                    <p className="text-xs text-slate-400">Click anywhere to replace image</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-md py-6 space-y-6">
                  
                  {/* Google's cloud-upload icon style */}
                  <div className="w-16 h-16 rounded-full bg-[rgba(138,180,248,0.06)] flex items-center justify-center border border-[rgba(138,180,248,0.12)] mx-auto">
                    <UploadCloud className="w-7 h-7 text-[#8ab4f8]" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-white tracking-tight">Drag files here or click to upload</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Upload sketches, wireframes, screenshots, or drawings (PNG, JPG, JPEG) to extract high-fidelity clean component code.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-5 h-9 rounded-full border-[rgba(255,255,255,0.1)] hover:bg-[rgba(138,180,248,0.08)] hover:text-[#8ab4f8] text-xs font-semibold select-none bg-transparent"
                    >
                      Browse Drive
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      className="px-5 h-9 rounded-full gap-1.5 bg-[rgba(138,180,248,0.08)] border border-[rgba(138,180,248,0.15)] text-[#8ab4f8] hover:bg-[rgba(138,180,248,0.12)] transition-all text-xs font-semibold select-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Take Sketch Photo
                    </Button>
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png,image/jpg,image/jpeg"
                onChange={handleFileChange}
              />
              <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
            </div>

            {/* Google-style segmented button group for framework selector */}
            <div className="bg-[#1a1d27]/40 border border-[rgba(255,255,255,0.08)] p-4 rounded-2xl space-y-3">
              <Label className="text-xs font-bold text-slate-400 tracking-wider uppercase px-1">
                Target Framework Selector
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0d0f14]/50 p-1.5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                {FRAMEWORKS.map((f) => {
                  const isActive = framework === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFramework(f.value)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center text-center gap-1 select-none cursor-pointer ${
                        isActive
                          ? "bg-[#1a1d27] text-[#8ab4f8] border border-[rgba(138,180,248,0.15)] shadow"
                          : "text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.02)]"
                      }`}
                    >
                      <span className="truncate w-full">{f.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
              {selectedFramework && (
                <p className="text-[11px] text-[#8ab4f8] px-1 italic">
                  &bull; {selectedFramework.description}
                </p>
              )}
            </div>

          </div>

          {/* Settings Panel (Right Pane - Col 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#1a1d27]/40 p-6 md:p-8 rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-2xl relative">
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-white">Generation Prompts</h3>
                <p className="text-xs text-slate-400">Describe the layout flow & color instructions</p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-bold text-slate-400 tracking-wider uppercase">Component Name</Label>
                <Input
                  id="title"
                  placeholder="e.g. Analytics dashboard panel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 bg-[#0d0f14]/50 border-[rgba(255,255,255,0.08)] focus:border-[#8ab4f8] transition-all rounded-lg text-xs"
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions" className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                  Additional Style Rules{" "}
                  <span className="text-slate-500 font-normal lowercase">(optional)</span>
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="e.g. Use a stunning Google AI Studio dark scheme with elegant blue border accents, beautiful glass cards, and crisp micro-animations."
                  rows={6}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="bg-[#0d0f14]/50 border-[rgba(255,255,255,0.08)] focus:border-[#8ab4f8] resize-none rounded-lg leading-relaxed text-xs p-3.5"
                />
              </div>
            </div>

            {/* Launch Block with Google & Gemini animated CTAs */}
            <div className="pt-6 mt-6 border-t border-[rgba(255,255,255,0.08)] space-y-4">
              
              {/* 4. Generation Button (Google Search / Gemini style) */}
              <div className="relative">
                <Button
                  id="generate-btn"
                  className={`w-full h-11 text-xs font-semibold shadow-lg text-white gap-2 cursor-pointer transition-all active:scale-[0.98] select-none rounded-full ${
                    !image 
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-[rgba(255,255,255,0.04)]" 
                      : "gemini-gradient hover:shadow-[#4285F4]/10 hover:shadow-xl"
                  }`}
                  disabled={!image || createSketch.isPending}
                  onClick={handleGenerate}
                >
                  {createSketch.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Analyzing sketch...
                    </>
                  ) : (
                    <>
                      <GeminiSparkleIcon className="w-4 h-4 text-white" />
                      Generate with Gemini
                    </>
                  )}
                </Button>

                {/* Google indeterminate progress bar shown while generating */}
                {createSketch.isPending && (
                  <div className="google-progress-bar mt-3">
                    <div className="google-progress-bar-value" />
                  </div>
                )}
              </div>

              {createSketch.isPending && (
                <div className="bg-[rgba(138,180,248,0.04)] border border-[rgba(138,180,248,0.1)] rounded-xl p-4 text-center space-y-1.5 animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-xs text-[#8ab4f8] font-semibold">
                    <Zap className="w-3.5 h-3.5 text-[#8ab4f8]" />
                    <span>Gemini is compiling component markup...</span>
                  </div>
                  <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Analyzing shapes, compiling pixel coordinates, mapping typography properties, and drafting reactive UI markup. This takes ~15 seconds.
                  </p>
                </div>
              )}

              {!image && (
                <div className="text-center">
                  <p className="text-[10px] text-slate-400/80 bg-[rgba(255,255,255,0.02)] py-1.5 px-3.5 rounded-full inline-block border border-[rgba(255,255,255,0.04)]">
                    Upload sketch to activate generation
                  </p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
