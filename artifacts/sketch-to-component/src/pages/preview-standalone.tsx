import { useParams } from "wouter";
import { useGetSketch } from "@workspace/api-client-react";
import { buildPreviewHtml } from "@/lib/preview-html";
import { Loader2 } from "lucide-react";

export default function PreviewStandalone() {
  const params = useParams();
  const id = Number(params.id);
  const { data: sketch, isLoading } = useGetSketch(id);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium tracking-wide">Loading premium preview...</p>
      </div>
    );
  }

  if (!sketch) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 p-6 text-center">
        <h1 className="text-xl font-bold text-red-500 mb-2 font-mono">PREVIEW NOT FOUND</h1>
        <p className="text-xs text-slate-400">The requested sketch preview could not be loaded.</p>
      </div>
    );
  }

  const previewHtml = buildPreviewHtml(sketch.generatedCode || "", sketch.framework);

  return (
    <iframe
      srcDoc={previewHtml}
      className="w-screen h-screen border-0 bg-white"
      title={sketch.title}
    />
  );
}
