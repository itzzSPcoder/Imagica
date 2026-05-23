import { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Highlight, type PrismTheme } from "prism-react-renderer";

const darkTheme: PrismTheme = {
  plain: {
    color: "#e8eaed",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#9aa0a6", fontStyle: "italic" as const },
    },
    {
      types: ["builtin", "changed", "keyword", "tag-id", "operator", "meta", "property"],
      style: { color: "#6366f1" },
    },
    {
      types: ["string", "attr-value", "char", "number", "inserted"],
      style: { color: "#059669" },
    },
    {
      types: ["function", "class-name", "attr-name", "selector", "variable"],
      style: { color: "#9333ea" },
    },
    {
      types: ["punctuation"],
      style: { color: "#9aa0a6" },
    },
  ],
};

const lightTheme: PrismTheme = {
  plain: {
    color: "#1e1b4b",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#64748b", fontStyle: "italic" as const },
    },
    {
      types: ["builtin", "changed", "keyword", "tag-id", "operator", "meta", "property"],
      style: { color: "#4f46e5" },
    },
    {
      types: ["string", "attr-value", "char", "number", "inserted"],
      style: { color: "#047857" },
    },
    {
      types: ["function", "class-name", "attr-name", "selector", "variable"],
      style: { color: "#7c3aed" },
    },
    {
      types: ["punctuation"],
      style: { color: "#64748b" },
    },
  ],
};

export function CodeBlock({ code, language = "tsx" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const prismTheme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const prismLang = language.includes("html") ? "html" : "tsx";

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <Code2 className="h-3.5 w-3.5 text-primary" />
          <span>generated-component.{prismLang === "html" ? "html" : "tsx"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-7 cursor-pointer select-none rounded-full px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="mr-1 h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>

      <div className="group relative flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed scrollbar-thin">
        <Highlight theme={prismTheme} code={code} language={prismLang}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} m-0 min-w-full bg-transparent`} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="table-row">
                  <span className="table-cell w-8 select-none pr-4 text-right text-[11px] text-muted-foreground/40">
                    {i + 1}
                  </span>
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
