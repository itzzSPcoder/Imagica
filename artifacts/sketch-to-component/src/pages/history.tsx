import { useListSketches, useDeleteSketch } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format, isToday, isAfter, subDays, startOfDay } from "date-fns";
import { FileCode2, Clock, Code2, ArrowRight, Trash2, Download, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const FRAMEWORK_LABELS: Record<string, string> = {
  "react-tailwind": "React + Tailwind",
  "react-shadcn": "React + shadcn/ui",
  "html-tailwind": "HTML + Tailwind",
  "mern-stack": "Full Stack (MERN)",
};

const FRAMEWORK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "react-tailwind": {
    bg: "rgba(66, 133, 244, 0.08)",
    border: "rgba(66, 133, 244, 0.15)",
    text: "#8ab4f8", // Google Blue
  },
  "react-shadcn": {
    bg: "rgba(197, 138, 249, 0.08)",
    border: "rgba(197, 138, 249, 0.15)",
    text: "#c58af9", // Google Purple
  },
  "html-tailwind": {
    bg: "rgba(129, 201, 149, 0.08)",
    border: "rgba(129, 201, 149, 0.15)",
    text: "#81c995", // Google Green
  },
  "mern-stack": {
    bg: "rgba(217, 101, 112, 0.08)",
    border: "rgba(217, 101, 112, 0.15)",
    text: "#ff8bcb", // Google Pink
  },
};

const getGroup = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  if (isToday(date)) return "Today";
  const sevenDaysAgo = subDays(today, 7);
  if (isAfter(date, startOfDay(sevenDaysAgo))) {
    return "This Week";
  }
  return "Earlier";
};

export default function History() {
  const { data: sketches, isLoading } = useListSketches();
  const deleteSketch = useDeleteSketch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Record<number, boolean>>({});

  const handleDeleteItem = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault();
    deleteSketch.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Sketch deleted successfully" });
          queryClient.invalidateQueries({ queryKey: ["/api/sketches"] });
        },
      }
    );
  };

  const toggleSelect = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Group sketches
  const groupedSketches: Record<string, typeof sketches> = {
    Today: [],
    "This Week": [],
    Earlier: [],
  };

  if (sketches) {
    sketches.forEach((sketch) => {
      const grp = getGroup(sketch.createdAt);
      groupedSketches[grp] = groupedSketches[grp] || [];
      groupedSketches[grp]?.push(sketch);
    });
  }

  const hasItems = sketches && sketches.length > 0;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 bg-[#0d0f14] min-h-[calc(100vh-80px)] font-sans">
      
      {/* Page Header (Google style) */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-6 select-none">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-normal font-sans">
            Compilation History
          </h1>
          <p className="text-xs text-slate-400 font-sans">
            Inspect or refine your compiled UI components, layouts, and frontends.
          </p>
        </div>
        <Link href="/">
          <button className="px-5 py-2 rounded-full bg-[#8ab4f8] text-[#0d0f14] text-xs font-semibold hover:bg-[#a8c7fa] transition-colors shadow-sm select-none cursor-pointer flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            New Sketch Build
          </button>
        </Link>
      </div>

      {isLoading ? (
        
        // Skeleton shimmer loaders
        <div className="space-y-8">
          {["Today", "This Week"].map((groupName) => (
            <div key={groupName} className="space-y-4">
              <Skeleton className="h-4 w-20 bg-[#1a1d27]" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[180px] w-full rounded-2xl bg-[#1a1d27]" />
                    <Skeleton className="h-4 w-3/4 bg-[#1a1d27]" />
                    <Skeleton className="h-3 w-1/2 bg-[#1a1d27]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !hasItems ? (
        
        // Empty State
        <div className="text-center py-24 bg-[#1a1d27]/40 border border-[rgba(255,255,255,0.08)] rounded-2xl select-none">
          <div className="w-14 h-14 bg-[#1a1d27] border border-[rgba(255,255,255,0.08)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileCode2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1.5">No component builds yet</h3>
          <p className="text-xs text-slate-400 mb-6 max-w-xs mx-auto leading-relaxed">
            You haven't converted any wireframes or layout sketches yet. Upload a drawing to get started!
          </p>
          <Link href="/">
            <button className="px-5 py-2 rounded-full border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(138,180,248,0.08)] text-xs font-semibold text-[#8ab4f8] transition-all cursor-pointer">
              Go to Vision Canvas
            </button>
          </Link>
        </div>
      ) : (
        
        // Google Photos Grid Grouping
        <div className="space-y-10">
          {(["Today", "This Week", "Earlier"] as const).map((groupName) => {
            const groupItems = groupedSketches[groupName] || [];
            if (groupItems.length === 0) return null;

            return (
              <div key={groupName} className="space-y-4">
                
                {/* Group Date Header */}
                <h2 className="text-[10px] font-bold text-slate-500 tracking-widest uppercase border-b border-[rgba(255,255,255,0.04)] pb-1.5 select-none">
                  {groupName}
                </h2>

                {/* Google Photos Grid Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {groupItems.map((sketch) => {
                    const fwColors = FRAMEWORK_COLORS[sketch.framework] || {
                      bg: "rgba(255,255,255,0.04)",
                      border: "rgba(255,255,255,0.08)",
                      text: "slate-400",
                    };
                    const isSelected = !!selectedItems[sketch.id];

                    return (
                      <Link key={sketch.id} href={`/sketch/${sketch.id}`}>
                        <div className={`group flex flex-col bg-[#1a1d27]/40 border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-[#4285F4]/5 cursor-pointer h-full relative ${
                          isSelected ? "border-[#8ab4f8] bg-[rgba(138,180,248,0.02)]" : "border-[rgba(255,255,255,0.08)] hover:border-slate-500/50"
                        }`}>
                          
                          {/* Image preview area */}
                          <div className="aspect-[4/3] bg-[#0d0f14] relative overflow-hidden border-b border-[rgba(255,255,255,0.06)] select-none">
                            <img
                              src={sketch.imageDataUrl}
                              alt={sketch.title}
                              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                            />
                            
                            {/* Hover overlay gradients */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                              <div className="flex items-center text-white text-xs font-semibold">
                                Launch Workbench <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </div>
                            </div>

                            {/* Google-style checkbox selection circle (top-left) */}
                            <button
                              onClick={(e) => toggleSelect(e, sketch.id)}
                              className={`absolute top-3 left-3 w-5 h-5 rounded-full border flex items-center justify-center transition-all z-10 ${
                                isSelected
                                  ? "bg-[#8ab4f8] border-[#8ab4f8] text-[#0d0f14]"
                                  : "bg-black/40 border-white/40 opacity-0 group-hover:opacity-100 hover:border-white"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            {/* Action icons (top-right direct delete) */}
                            <button
                              onClick={(e) => handleDeleteItem(e, sketch.id)}
                              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 border border-white/10 text-slate-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Card metadata info */}
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-medium text-sm text-white leading-tight mb-3 line-clamp-1 group-hover:text-[#8ab4f8] transition-colors font-sans">
                              {sketch.title}
                            </h3>
                            <div className="mt-auto flex flex-col gap-2">
                              
                              {/* Workspace style colored badges */}
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: fwColors.bg,
                                    border: `1px solid ${fwColors.border}`,
                                    color: fwColors.text,
                                  }}
                                >
                                  {FRAMEWORK_LABELS[sketch.framework] ?? sketch.framework}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-sans font-medium select-none">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(sketch.createdAt), "MMM d, yyyy · h:mm a")}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
