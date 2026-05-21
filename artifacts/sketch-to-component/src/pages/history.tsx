import { useListSketches } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { FileCode2, Clock, Code2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function History() {
  const { data: sketches, isLoading } = useListSketches();

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Conversion History</h1>
          <p className="text-muted-foreground">Your previously generated components from sketches.</p>
        </div>
        <Link href="/">
          <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            New Sketch
          </div>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl bg-card" />
              <Skeleton className="h-4 w-3/4 bg-card" />
              <Skeleton className="h-4 w-1/2 bg-card" />
            </div>
          ))}
        </div>
      ) : !sketches || sketches.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border rounded-xl">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <FileCode2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No history yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            You haven't converted any sketches to code yet. Upload your first sketch to get started.
          </p>
          <Link href="/">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              Go to Converter
            </div>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sketches.map((sketch) => (
            <Link key={sketch.id} href={`/sketch/${sketch.id}`}>
              <div className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer h-full">
                <div className="aspect-[4/3] bg-secondary relative overflow-hidden border-b border-border">
                  <img 
                    src={sketch.imageDataUrl} 
                    alt={sketch.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="flex items-center text-white text-sm font-medium">
                      View Code <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-medium text-lg leading-tight mb-3 line-clamp-1 group-hover:text-primary transition-colors">
                    {sketch.title}
                  </h3>
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-3 h-3" />
                        <span className="truncate">{sketch.framework}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(sketch.createdAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
