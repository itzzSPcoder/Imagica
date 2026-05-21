import { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Highlight, themes } from "prism-react-renderer";

export function CodeBlock({ code, language = "tsx" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert framework/language names to prism compatible
  const prismLang = language.includes("html") ? "html" : "tsx";

  return (
    <div className="flex flex-col h-full w-full bg-[#0d0d12]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#09090b]">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Code2 className="w-4 h-4" />
          <span>generated-component.{prismLang === "html" ? "html" : "tsx"}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={copyToClipboard}
          className="h-8 px-2 text-zinc-400 hover:text-white hover:bg-white/10"
        >
          {copied ? (
            <Check className="w-4 h-4 mr-1.5 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 mr-1.5" />
          )}
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4 text-sm font-mono leading-relaxed relative group">
        <Highlight theme={themes.nightOwl} code={code} language={prismLang}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} bg-transparent m-0 min-w-full`} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell text-right pr-4 select-none opacity-30 w-8">{i + 1}</span>
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
