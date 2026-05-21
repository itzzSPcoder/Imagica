import { useState, useCallback, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { useCreateSketch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [framework, setFramework] = useState("react-tailwind");
  const [instructions, setInstructions] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        description: "Please upload an image file.",
        variant: "destructive"
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleGenerate = () => {
    if (!image) return;
    
    createSketch.mutate({
      data: {
        title: title || "Untitled Sketch",
        imageDataUrl: image,
        framework: framework as any,
        instructions: instructions || undefined
      }
    }, {
      onSuccess: (data) => {
        toast({
          title: "Generation Complete",
          description: "Your component has been generated successfully."
        });
        setLocation(`/sketch/${data.id}`);
      },
      onError: (err) => {
        toast({
          title: "Generation Failed",
          description: err.error || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Upload Sketch</h1>
        <p className="text-muted-foreground">Upload a hand-drawn wireframe to generate production-ready code.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${image ? "bg-card border-border" : isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-card/50"} min-h-[300px] relative overflow-hidden`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            {image ? (
              <div className="w-full h-full relative group">
                <img src={image} alt="Sketch preview" className="w-full h-full object-contain max-h-[400px]" />
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setImage(null); }}>
                    <X className="w-4 h-4 mr-2" /> Remove Image
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">Drop your sketch here</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mb-6">
                  Supports PNG, JPG, or JPEG. Clear, high-contrast photos work best.
                </p>
                <Button variant="outline" type="button">
                  Browse Files
                </Button>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
        </div>

        {/* Configuration Area */}
        <div className="space-y-6 bg-card p-6 rounded-xl border border-border">
          <div className="space-y-3">
            <Label htmlFor="title">Component Name</Label>
            <Input 
              id="title" 
              placeholder="e.g. Dashboard Header" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-3">
            <Label>Target Framework</Label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select a framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="react-tailwind">React + Tailwind</SelectItem>
                <SelectItem value="react-shadcn">React + shadcn/ui</SelectItem>
                <SelectItem value="html-tailwind">HTML + Tailwind</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="instructions">Extra Instructions (Optional)</Label>
            <Textarea 
              id="instructions" 
              placeholder="e.g. Use a deep purple theme, make the buttons fully rounded, ensure it's mobile responsive." 
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="bg-background resize-none"
            />
          </div>

          <div className="pt-4 border-t border-border">
            <Button 
              className="w-full h-12 text-md shadow-lg shadow-primary/25" 
              disabled={!image || createSketch.isPending}
              onClick={handleGenerate}
            >
              {createSketch.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Code...
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Generate Component
                </>
              )}
            </Button>
            {createSketch.isPending && (
              <p className="text-xs text-center text-muted-foreground mt-3 animate-pulse">
                Gemini Vision is analyzing your sketch. This may take up to 20 seconds.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
