import { useListSketches, useDeleteSketch } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format, isToday, isAfter, subDays, startOfDay } from "date-fns";
import { FileCode2, Clock, ArrowRight, Trash2, Sparkles, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FRAMEWORK_LABELS: Record<string, string> = {
  "react-tailwind": "React + Tailwind",
  "react-shadcn": "React + shadcn/ui",
  "html-tailwind": "HTML + Tailwind",
  "mern-stack": "Full Stack (MERN)",
};

const FRAMEWORK_BADGE: Record<string, string> = {
  "react-tailwind": "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
  "react-shadcn": "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
  "html-tailwind": "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  "mern-stack": "bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-300",
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
  
  // Marketplace Listing Modal State
  const [listingSketch, setListingSketch] = useState<{ id: number; title: string } | null>(null);
  const [listPrice, setListPrice] = useState("250");
  const [listingInProgress, setListingInProgress] = useState(false);

  const handleListConfirm = async () => {
    if (!listingSketch) return;
    const price = parseInt(listPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please specify a valid positive INR price.",
        variant: "destructive"
      });
      return;
    }

    setListingInProgress(true);
    try {
      const res = await fetch("/api/marketplace/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "default-user" // Real user ID is resolved on backend headers or default-user
        },
        body: JSON.stringify({ sketchId: listingSketch.id, price })
      });
      if (!res.ok) {
        throw new Error("Failed to list template.");
      }
      toast({
        title: "Listed on Marketplace!",
        description: `"${listingSketch.title}" is now live for sale at ₹${price}.`,
      });
      setListingSketch(null);
    } catch {
      toast({
        title: "Listing failed",
        description: "Could not publish design listing to the marketplace.",
        variant: "destructive"
      });
    } finally {
      setListingInProgress(false);
    }
  };

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
    <div className="mx-auto min-h-[calc(100vh-80px)] max-w-6xl space-y-8 bg-background p-6 font-sans md:p-10">
      <div className="flex select-none items-center justify-between border-b border-border pb-6">
        <div className="space-y-1.5">
          <h1 className="font-headline text-2xl font-semibold tracking-normal text-foreground md:text-3xl">
            Compilation History
          </h1>
          <p className="text-xs text-muted-foreground">
            Inspect or refine your compiled UI components, layouts, and frontends.
          </p>
        </div>
        <Link href="/studio">
          <button className="flex cursor-pointer select-none items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5" />
            New Sketch Build
          </button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {["Today", "This Week"].map((groupName) => (
            <div key={groupName} className="space-y-4">
              <Skeleton className="h-4 w-20 bg-muted" />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-[180px] w-full rounded-2xl bg-muted" />
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                    <Skeleton className="h-3 w-1/2 bg-muted" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : !hasItems ? (
        <div className="select-none rounded-2xl border border-border bg-card/40 py-24 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card">
            <FileCode2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1.5 text-base font-semibold text-foreground">No component builds yet</h3>
          <p className="mx-auto mb-6 max-w-xs text-xs leading-relaxed text-muted-foreground">
            You haven&apos;t converted any wireframes or layout sketches yet. Upload a drawing to get started!
          </p>
          <Link href="/studio">
            <button className="cursor-pointer rounded-full border border-border px-5 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary/10">
              Go to Vision Canvas
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {(["Today", "This Week", "Earlier"] as const).map((groupName) => {
            const groupItems = groupedSketches[groupName] || [];
            if (groupItems.length === 0) return null;

            return (
              <div key={groupName} className="space-y-4">
                <h2 className="select-none border-b border-border pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {groupName}
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {groupItems.map((sketch) => {
                    const badgeClass =
                      FRAMEWORK_BADGE[sketch.framework] ??
                      "bg-muted border-border text-muted-foreground";
                    const isSelected = !!selectedItems[sketch.id];

                    return (
                      <Link key={sketch.id} href={`/sketch/${sketch.id}`}>
                        <div
                          className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="relative aspect-[4/3] select-none overflow-hidden border-b border-border bg-muted/30">
                            <img
                              src={sketch.imageDataUrl}
                              alt={sketch.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                            />

                            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-background/80 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                              <div className="flex items-center text-xs font-semibold text-foreground">
                                Launch Workbench <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => toggleSelect(e, sketch.id)}
                              className={`absolute top-3 left-3 z-10 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-foreground/40 bg-background/70 opacity-0 group-hover:opacity-100 hover:border-foreground"
                              }`}
                            >
                              {isSelected && <span className="text-[10px] font-bold">✓</span>}
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteItem(e, sketch.id)}
                              className="absolute top-3 right-3 z-10 cursor-pointer rounded-full border border-border bg-background/70 p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="flex flex-1 flex-col p-4">
                            <h3 className="mb-3 line-clamp-1 font-sans text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-primary">
                              {sketch.title}
                            </h3>
                            <div className="mt-auto flex flex-col gap-2">
                              <span
                                className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider ${badgeClass}`}
                              >
                                {FRAMEWORK_LABELS[sketch.framework] ?? sketch.framework}
                              </span>

                              <div className="flex select-none items-center justify-between font-sans text-[10px] font-medium text-muted-foreground mt-1">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(sketch.createdAt), "MMM d, yyyy · h:mm a")}</span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setListingSketch({ id: sketch.id, title: sketch.title });
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/25 transition-all text-[9px] font-bold select-none cursor-pointer"
                                >
                                  <ShoppingBag className="w-2.5 h-2.5" />
                                  Sell Layout
                                </button>
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

      {/* Sell Template Marketplace Dialog */}
      <Dialog open={listingSketch !== null} onOpenChange={(open) => !open && setListingSketch(null)}>
        <DialogContent className="border border-border bg-card text-foreground rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-headline text-base">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              Sell Design Layout
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              List "{listingSketch?.title}" for sale in the Imagica Marketplace.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Set Price (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <Input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="250"
                  className="pl-7 bg-background border border-border text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Split breakdown details info card */}
            <div className="bg-muted/40 rounded-xl p-3 border border-border/80 text-[10px] space-y-2 leading-relaxed text-muted-foreground">
              <div className="flex justify-between items-center text-foreground font-semibold">
                <span>Revenue Split:</span>
                <span>60% Credits / 40% Cash</span>
              </div>
              <div className="h-px bg-border/40" />
              <div className="flex justify-between items-center">
                <span>Imagica Credits earned (60%):</span>
                <span className="font-mono text-amber-400 font-bold">
                  ✨ {Math.round((parseInt(listPrice) || 0) * 0.6)} Credits
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Direct Cash transfer (40%):</span>
                <span className="font-mono text-emerald-400 font-bold">
                  ₹{Math.round((parseInt(listPrice) || 0) * 0.4)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="secondary" 
              onClick={() => setListingSketch(null)} 
              className="bg-card text-foreground hover:bg-muted rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleListConfirm}
              disabled={listingInProgress}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs h-9 font-semibold"
            >
              {listingInProgress ? "Listing..." : "Confirm Listing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
