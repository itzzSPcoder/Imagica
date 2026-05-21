import { useParams, useLocation } from "wouter";
import { useGetSketch, useDeleteSketch, useRegenerateSketch } from "@workspace/api-client-react";
import { useState } from "react";
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
  Loader2
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function SketchDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: sketch, isLoading } = useGetSketch(id);
  const deleteSketch = useDeleteSketch();
  const regenerateSketch = useRegenerateSketch();
  
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [newInstructions, setNewInstructions] = useState("");
  const [newFramework, setNewFramework] = useState<string>("react-tailwind");

  // Initialize framework when sketch loads
  if (sketch && !newFramework && sketch.framework !== newFramework && !isRegenerateOpen) {
    setNewFramework(sketch.framework);
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this conversion?")) {
      deleteSketch.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Sketch deleted" });
          setLocation("/history");
        }
      });
    }
  };

  const handleRegenerate = () => {
    regenerateSketch.mutate({
      id,
      data: {
        instructions: newInstructions || undefined,
        framework: newFramework as any
      }
    }, {
      onSuccess: () => {
        toast({ title: "Code regenerated successfully!" });
        setIsRegenerateOpen(false);
      },
      onError: (err) => {
        toast({ 
          title: "Regeneration failed", 
          description: err.error || "An error occurred",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-[1600px] mx-auto p-6 flex flex-col h-screen overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-64 bg-card" />
          <Skeleton className="h-10 w-32 bg-card" />
        </div>
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <Skeleton className="h-full w-full rounded-xl bg-card" />
          <Skeleton className="h-full w-full rounded-xl bg-card" />
        </div>
      </div>
    );
  }

  if (!sketch) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sketch not found</h2>
          <Button variant="outline" onClick={() => setLocation("/history")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col h-[100dvh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/history")} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-tight">{sketch.title}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
                <Code2 className="w-3 h-3 mr-1.5" />
                {sketch.framework}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(sketch.createdAt), "MMM d, yyyy • h:mm a")}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" onClick={() => {
                setNewFramework(sketch.framework);
                setNewInstructions(sketch.instructions || "");
              }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Regenerate Code</DialogTitle>
                <DialogDescription>
                  Tweak your instructions or change the framework to get a new result.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Framework</label>
                  <Select value={newFramework} onValueChange={setNewFramework}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="react-tailwind">React + Tailwind</SelectItem>
                      <SelectItem value="react-shadcn">React + shadcn/ui</SelectItem>
                      <SelectItem value="html-tailwind">HTML + Tailwind</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Additional Instructions</label>
                  <Textarea 
                    placeholder="e.g. Make it dark mode, add a sidebar, use larger fonts..."
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleRegenerate} 
                  disabled={regenerateSketch.isPending}
                >
                  {regenerateSketch.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate New Code
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Image Panel */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center text-sm font-medium text-muted-foreground">
              <ImageIcon className="w-4 h-4 mr-2" />
              Original Sketch
            </div>
            {sketch.instructions && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-primary">
                    <Settings2 className="w-3 h-3 mr-1.5" />
                    View Instructions
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Original Instructions</DialogTitle>
                  </DialogHeader>
                  <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap font-mono">
                    {sketch.instructions}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4 bg-black/40 flex items-center justify-center">
            <img 
              src={sketch.imageDataUrl} 
              alt={sketch.title} 
              className="max-w-full max-h-full object-contain drop-shadow-2xl" 
            />
          </div>
        </div>

        {/* Code Panel */}
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="flex-1 overflow-hidden relative">
             <CodeBlock code={sketch.generatedCode} language="tsx" />
          </div>
        </div>
      </div>
    </div>
  );
}
