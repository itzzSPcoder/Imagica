import { Link, useLocation } from "wouter";
import { PenTool, History as HistoryIcon, LayoutDashboard, Code2 } from "lucide-react";
import { useGetSketchStats } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetSketchStats();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight tracking-tight">Sketch2Comp</h1>
            <p className="text-xs text-muted-foreground">AI Vision UI Builder</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${location === "/" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm">Converter</span>
            </div>
          </Link>
          <Link href="/history">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${location.startsWith("/history") || location.startsWith("/sketch") ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
              <HistoryIcon className="w-4 h-4" />
              <span className="text-sm">History</span>
            </div>
          </Link>
        </nav>

        <div className="p-4 m-4 rounded-lg bg-secondary/50 border border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Stats</h3>
          {statsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-secondary" />
              <Skeleton className="h-4 w-2/3 bg-secondary" />
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total Generated</span>
                <span className="text-sm font-medium">{stats.total}</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(stats.byFramework || {}).map(([fw, count]) => (
                  <div key={fw} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{fw}</span>
                    </div>
                    <span className="text-muted-foreground">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden border-b border-border bg-card p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
            <PenTool className="w-3 h-3" />
          </div>
          <span className="font-semibold text-sm">Sketch2Comp</span>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <div className={`p-2 rounded-md ${location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
          </Link>
          <Link href="/history">
            <div className={`p-2 rounded-md ${location.startsWith("/history") || location.startsWith("/sketch") ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
              <HistoryIcon className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
