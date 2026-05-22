import { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Highlight } from "prism-react-renderer";

const googleDarkTheme = {
  plain: {
    color: "#e8eaed",
    backgroundColor: "#1a1d27"
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: {
        color: "#9aa0a6",
        fontStyle: "italic" as const
      }
    },
    {
      types: ["builtin", "changed", "keyword", "tag-id", "operator", "meta", "property"],
      style: {
        color: "#8ab4f8"
      }
    },
    {
      types: ["string", "attr-value", "char", "number", "inserted"],
      style: {
        color: "#81c995"
      }
    },
    {
      types: ["function", "class-name", "attr-name", "selector", "variable"],
      style: {
        color: "#c58af9"
      }
    },
    {
      types: ["punctuation"],
      style: {
        color: "#9aa0a6"
      }
    }
  ]
};

export function CodeBlock({ code, language = "tsx" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const prismLang = language.includes("html") ? "html" : "tsx";

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1d27]">
      
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[#13151c] shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Code2 className="w-3.5 h-3.5 text-[#8ab4f8]" />
          <span>generated-component.{prismLang === "html" ? "html" : "tsx"}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={copyToClipboard}
          className="h-7 px-2.5 rounded-full text-xs text-slate-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)] cursor-pointer select-none"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 mr-1" />
          )}
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>

      {/* Code Viewer Panel */}
      <div className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed relative group scrollbar-thin">
        <Highlight theme={googleDarkTheme} code={code} language={prismLang}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} bg-transparent m-0 min-w-full`} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell text-right pr-4 select-none opacity-20 text-slate-400 w-8 text-[11px]">{i + 1}</span>
                  <span className="table-cell whitespace-pre-wrap">
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
