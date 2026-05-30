/**
 * Builds a fully self-contained HTML page that can be rendered inside an
 * <iframe srcDoc={...}> to give a live preview of generated component code.
 *
 * Handles all three generation targets:
 *   - html-tailwind  → return as-is (already a complete HTML document)
 *   - react-tailwind → strip imports, wrap in CDN React + Babel
 *   - react-shadcn   → same + shadcn/ui stubs + lucide-react stubs
 */
export function buildPreviewHtml(code: string, framework: string): string {
  const trimmed = code.trim();
  if (
    framework === "html-tailwind" ||
    trimmed.startsWith("<!DOCTYPE html>") ||
    trimmed.startsWith("<html")
  ) {
    return code;
  }

  // For MERN stack, extract just the React component from the multi-file output
  let componentCode = code;
  if (framework === "mern-stack") {
    // Try to extract the App.tsx / React component section with a highly lenient regex
    const appMatch = code.match(/\/\/\s*=*\s*FILE:\s*(?:(?:[^ \n]*\/)?(?:App|index|main|component)\.(?:tsx|jsx|js|ts))\b[\s=]*\n([\s\S]*?)(?:\/\/\s*=*\s*FILE:|$)/i);
    if (appMatch) {
      componentCode = appMatch[1].trim();
    }
    // Fall through to react-tailwind rendering
  }

  const isShadcn = framework === "react-shadcn";

  // ── 1. Parse what was imported before we strip imports ───────────────────
  const lucideImports = parseLucideImports(componentCode);

  // ── 2. Derive component name ─────────────────────────────────────────────
  const componentName = extractComponentName(componentCode) ?? "GeneratedComponent";

  // ── 3. Transform the code ─────────────────────────────────────────────────
  let body = stripImports(componentCode);
  // `export default function Foo` → `function Foo`
  body = body.replace(/\bexport\s+default\s+function\b/, "function");
  // `export default const Foo =` → `const Foo =`  (rare but possible)
  body = body.replace(/\bexport\s+default\s+const\b/, "const");
  // Standalone `export default Foo;` at end of file → remove
  body = body.replace(/^\s*export\s+default\s+[A-Z]\w*\s*;?\s*$/m, "");
  body = body.trim();

  // ── 4. Assemble the full TSX source (hooks + stubs + component) ─────────────
  // Everything is transformed in one Babel pass so stubs' JSX is also compiled.
  const fullSource = [
    `const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, Fragment } = React;`,
    `if (typeof Recharts !== 'undefined') { var { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadialBarChart, RadialBar, Treemap, Sankey } = Recharts; }`,
    isShadcn ? SHADCN_STUBS : "",
    buildLucideStubs(lucideImports),
    body,
    // Return the component so the outer function can grab it
    `var __comp = typeof ${componentName} !== "undefined" ? ${componentName} : null;`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // JSON.stringify safely encodes newlines, quotes, backticks — no escaping needed
  const encodedSource = JSON.stringify(fullSource);

  // ── 5. Build the preview page ─────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin onerror="typeof __showErr !== 'undefined' ? __showErr('Failed to load React CDN. Please check your internet connection.') : alert('React CDN failed')" src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
  <script crossorigin onerror="typeof __showErr !== 'undefined' ? __showErr('Failed to load React-DOM CDN. Please check your internet connection.') : alert('React-DOM CDN failed')" src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
  <script onerror="typeof __showErr !== 'undefined' ? __showErr('Failed to load Babel CDN. Please check your internet connection.') : alert('Babel CDN failed')" src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.27.1/babel.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/recharts/umd/Recharts.min.js"></script>
  <script>window.process = { env: { NODE_ENV: 'development' } };</script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #ffffff; }
    #__err { display:none; padding:20px; background:#fef2f2; color:#dc2626; font-family:monospace; font-size:12px; white-space:pre-wrap; border-left:4px solid #dc2626; }
    #__loading { display:flex; align-items:center; justify-content:center; height:100vh; color:#94a3b8; font-family:system-ui; font-size:14px; gap:8px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="__loading">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
    Loading preview…
  </div>
  <div id="__err"></div>
  <div id="root"></div>
  <script>
    function __showErr(msg) {
      var loadingEl = document.getElementById('__loading');
      if (loadingEl) loadingEl.style.display = 'none';
      var el = document.getElementById('__err');
      if (el) {
        el.style.display = 'block';
        el.textContent = msg;
      }
    }

    window.onerror = function(msg, _src, _line, _col, err) {
      __showErr('Runtime error:\\n' + msg + (err && err.stack ? '\\n\\n' + err.stack : ''));
      return true;
    };

    function __initPreview() {
      try {
        var src = ${encodedSource};

        // Transform TSX+TypeScript → plain JS.
        // Presets run in REVERSE order in Babel: typescript strips types first,
        // then react converts JSX — so generics like useState<string> are safe.
        var result = Babel.transform(src, {
          filename: 'component.tsx',
          presets: [
            ['react', {}],
            ['typescript', { allExtensions: true, isTSX: true }]
          ]
        });

        // Execute in a function that receives React & ReactDOM as its only
        // external deps; everything else (hooks, stubs) is defined inside src.
        var run = new Function('React', 'ReactDOM', result.code + '\\nreturn __comp;');
        var Component = run(window.React, window.ReactDOM);

        if (!Component) {
          __showErr('Component "${componentName}" was not found.\\nMake sure the generated code has a default export.');
          return;
        }

        var loadingEl = document.getElementById('__loading');
        if (loadingEl) loadingEl.style.display = 'none';
        ReactDOM.createRoot(document.getElementById('root')).render(
          React.createElement(Component)
        );
      } catch(e) {
        __showErr('Error:\\n' + (e && e.message ? e.message : String(e)));
      }
    }

    if (document.readyState === 'complete') {
      __initPreview();
    } else {
      window.addEventListener('load', __initPreview);
    }
  </script>
</body>
</html>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractComponentName(code: string): string | null {
  // export default function ComponentName(
  let m = code.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9_]*)/);
  if (m) return m[1];
  // export default ComponentName  (standalone, last occurrence wins)
  const all = [...code.matchAll(/^\s*export\s+default\s+([A-Z][A-Za-z0-9_]*)\s*;?\s*$/gm)];
  if (all.length) return all[all.length - 1][1];
  // const ComponentName = … (first PascalCase top-level const/function)
  m = code.match(/^(?:const|function|class)\s+([A-Z][A-Za-z0-9_]*)/m);
  if (m) return m[1];
  return null;
}

function stripImports(code: string): string {
  // Multi-line and single-line imports
  return code
    .replace(/^[ \t]*import\s+[\s\S]*?from\s+['"][^'"]*['"]\s*;?[ \t]*\n?/gm, "")
    .replace(/^[ \t]*import\s+['"][^'"]*['"]\s*;?[ \t]*\n?/gm, "")
    .trim();
}

function parseLucideImports(code: string): string[] {
  const results: string[] = [];
  const re = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    m[1]
      .split(",")
      .map((s) => s.trim().replace(/\s+as\s+\w+/, "").trim())
      .filter(Boolean)
      .forEach((name) => results.push(name));
  }
  return [...new Set(results)];
}

function buildLucideStubs(names: string[]): string {
  if (names.length === 0) return "";

  // Map of icon name → SVG path(s). Real paths for common icons, generic fallback.
  const paths: Record<string, string> = {
    Home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
    Search: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    Settings: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M4.93 19.07l1.41-1.41 M17.66 6.34l1.41-1.41",
    User: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    Users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    Bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
    Mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
    Phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 14 19.79 19.79 0 0 1 1.08 5.38 2 2 0 0 1 3.05 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 18z",
    Plus: "M12 5v14 M5 12h14",
    Minus: "M5 12h14",
    X: "M18 6 6 18 M6 6l12 12",
    Check: "M20 6 9 17l-5-5",
    ChevronRight: "M9 18l6-6-6-6",
    ChevronLeft: "M15 18l-6-6 6-6",
    ChevronDown: "M6 9l6 6 6-6",
    ChevronUp: "M18 15l-6-6-6 6",
    ArrowRight: "M5 12h14 M12 5l7 7-7 7",
    ArrowLeft: "M19 12H5 M12 19l-7-7 7-7",
    ArrowUp: "M12 19V5 M5 12l7-7 7 7",
    ArrowDown: "M12 5v14 M19 12l-7 7-7-7",
    Edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
    Pencil: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
    Trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
    Trash2: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M10 11v6 M14 11v6",
    Download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    Upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    Copy: "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
    Eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    EyeOff: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24 M1 1l22 22",
    Star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    Heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
    Share: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13",
    Lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4",
    Unlock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 9.9-1",
    RefreshCw: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
    Loader2: "M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83",
    Sparkles: "M12 3l1.88 5.76L20 10.5l-5.12 3.87L16.76 21 12 17.27 7.24 21l1.88-7.63L4 10.5l6.12-1.74L12 3z",
    Code: "M16 18l6-6-6-6 M8 6l-6 6 6 6",
    Code2: "M16 18l6-6-6-6 M8 6l-6 6 6 6",
    Terminal: "M4 17l6-6-6-6 M12 19h8",
    Zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    Shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    Globe: "M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    Link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    ExternalLink: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3",
    Info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4 M12 16h.01",
    AlertCircle: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
    CheckCircle: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3",
    XCircle: "M15 9l-6 6 M9 9l6 6 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
    HelpCircle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01",
    Menu: "M3 12h18 M3 6h18 M3 18h18",
    MoreHorizontal: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    MoreVertical: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    Filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
    Calendar: "M3 4h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M1 10h22 M8 2v4 M16 2v4",
    Clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
    Map: "M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16",
    MapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    Activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    BarChart: "M12 20V10 M18 20V4 M6 20v-4",
    BarChart2: "M18 20V10 M12 20V4 M6 20v-4",
    TrendingUp: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6",
    TrendingDown: "M23 18l-9.5-9.5-5 5L1 6 M17 18h6v-6",
    DollarSign: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    CreditCard: "M1 4h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M1 10h22",
    ShoppingCart: "M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6",
    Package: "M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 1 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12",
    LogOut: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    LogIn: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3",
    Send: "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z",
    MessageSquare: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    MessageCircle: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
    Bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
    Tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01",
    Layers: "M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
    Layout: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    Grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    List: "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
    Database: "M12 2C8.13 2 5 3.79 5 6s3.13 4 7 4 7-1.79 7-4-3.13-4-7-4z M5 6v4c0 2.21 3.13 4 7 4s7-1.79 7-4V6 M5 14v4c0 2.21 3.13 4 7 4s7-1.79 7-4v-4",
    Server: "M2 2h20v8H2z M2 14h20v8H2z M6 6h.01 M6 18h.01",
    Cpu: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
    Wifi: "M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01",
    Sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42",
    Moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    Award: "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12",
    FileText: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    File: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2v7h7",
    Folder: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
    Image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8.5 8.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M21 15l-5-5L5 21",
    Camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    Clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z",
    Maximize2: "M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7",
    Minimize2: "M4 14h6v6 M20 10h-6V4 M14 10l7-7 M3 21l7-7",
    SlidersHorizontal: "M21 4H8 M16 4a2 2 0 1 0-4 0 2 2 0 0 0 4 0z M4 12h13 M9 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0z M21 20H11 M16 20a2 2 0 1 0-4 0 2 2 0 0 0 4 0z",
    LayoutDashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    PenTool: "M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586 M11 11a2 2 0 1 0-4 0 2 2 0 0 0 4 0z",
    Gauge: "M12 22a10 10 0 1 0-8.45-15.3 M12 7v5l3 3",
    Power: "M18.36 6.64a9 9 0 1 1-12.73 0 M12 2v10",
    Repeat: "M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3",
    Volume2: "M11 5 6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07",
    Play: "M5 3l14 9-14 9V3z",
    Pause: "M6 4h4v16H6z M14 4h4v16h-4z",
    SkipForward: "M5 4l10 8-10 8V4z M19 5v14",
    SkipBack: "M19 20L9 12l10-8v16z M5 19V5",
    Maximize: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
    Minimize: "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3",
    GitBranch: "M6 3v12 M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 9a9 9 0 0 1-9 9",
    Building2: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4",
    Briefcase: "M20 7H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2",
    UserPlus: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M20 8v6 M23 11h-6",
    AlignLeft: "M17 10H3 M21 6H3 M21 14H3 M17 18H3",
    AlignCenter: "M18 10H6 M21 6H3 M21 14H3 M18 18H6",
    AlignRight: "M21 10H7 M21 6H3 M21 14H3 M21 18H7",
    Type: "M4 7V4h16v3 M9 20h6 M12 4v16",
    Hash: "M4 9h16 M4 15h16 M10 3L8 21 M16 3l-2 18",
    AtSign: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M20 12v1a4 4 0 0 1-8 0v-1",
    Percent: "M19 5L5 19 M6.5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M17.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    Crosshair: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M22 12h-4 M6 12H2 M12 6V2 M12 22v-4",
    Target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    Locate: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M12 2v2 M12 20v2 M2 12h2 M20 12h2",
    Circle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
    Square: "M3 3h18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    Dot: "M12.01 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0",
    Inbox: "M22 12h-6l-2 3H10L8 12H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
    Archive: "M21 8v13H3V8 M1 3h22v5H1z M10 12h4",
    Flag: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7",
    Fingerprint: "M2 12a10 10 0 0 1 10-10c2.76 0 5.26 1.12 7.07 2.93 M6 12a6 6 0 0 1 6-6c1.66 0 3.16.67 4.24 1.76 M10 12a2 2 0 0 1 4 0c0 4-2 8-2 8 M12 12v1",
    Scan: "M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2",
    QrCode: "M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h.01 M19 15h.01 M15 19h.01 M19 19h.01",
    Accessibility: "M12 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z M12 7l-1 5h-3l2 7h4l2-7h-3l-1-5z",
  };

  const stub = (name: string) => {
    const d = paths[name];
    if (d) {
      return `const ${name}=({size=24,color='currentColor',className='',strokeWidth=2,...p}={})=>(<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...p}>${d.split(" M").map((seg, i) => `<path d="${i === 0 ? seg : "M" + seg}"/>`).join("")}</svg>);`;
    }
    // Fallback: generic box icon
    return `const ${name}=({size=24,color='currentColor',className='',strokeWidth=2,...p}={})=>(<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><text x="12" y="15.5" textAnchor="middle" fontSize="6" fill={color} stroke="none" fontFamily="sans-serif">${name.slice(0, 4)}</text></svg>);`;
  };

  return names.map(stub).join("\n    ");
}

// ── shadcn/ui component stubs ────────────────────────────────────────────────

const SHADCN_STUBS = `
    // ── shadcn/ui stubs ───────────────────────────────────────────────────────
    const Button = ({children,className='',variant='default',size='default',disabled,...p}) => {
      const vars={default:'bg-slate-900 text-white hover:bg-slate-700',secondary:'bg-slate-100 text-slate-900 hover:bg-slate-200',destructive:'bg-red-500 text-white hover:bg-red-600',outline:'border border-slate-300 bg-white hover:bg-slate-50 text-slate-900',ghost:'hover:bg-slate-100 text-slate-900',link:'underline-offset-4 hover:underline text-slate-900 px-0 py-0'};
      const sizes={default:'h-10 px-4 py-2 text-sm',sm:'h-9 px-3 text-xs',lg:'h-11 px-8 text-base',icon:'h-10 w-10 p-0'};
      return <button disabled={disabled} className={'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none '+(vars[variant]||vars.default)+' '+(sizes[size]||sizes.default)+' '+className} {...p}>{children}</button>;
    };
    const Input = ({className='',...p}) => <input className={'flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 '+className} {...p}/>;
    const Textarea = ({className='',...p}) => <textarea className={'flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 '+className} {...p}/>;
    const Label = ({children,className='',...p}) => <label className={'text-sm font-medium leading-none peer-disabled:opacity-70 '+className} {...p}>{children}</label>;
    const Separator = ({orientation='horizontal',className='',...p}) => <div role="separator" className={(orientation==='horizontal'?'h-[1px] w-full':'h-full w-[1px]')+' bg-slate-200 my-1 '+className} {...p}/>;
    const Badge = ({children,variant='default',className='',...p}) => {
      const vars={default:'bg-slate-900 text-white border-transparent',secondary:'bg-slate-100 text-slate-900 border-transparent',destructive:'bg-red-500 text-white border-transparent',outline:'text-slate-900 border-slate-300'};
      return <span className={'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors '+(vars[variant]||vars.default)+' '+className} {...p}>{children}</span>;
    };
    const Card = ({children,className='',...p}) => <div className={'rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm '+className} {...p}>{children}</div>;
    const CardHeader = ({children,className='',...p}) => <div className={'flex flex-col space-y-1.5 p-6 '+className} {...p}>{children}</div>;
    const CardTitle = ({children,className='',...p}) => <h3 className={'font-semibold leading-none tracking-tight text-xl '+className} {...p}>{children}</h3>;
    const CardDescription = ({children,className='',...p}) => <p className={'text-sm text-slate-500 '+className} {...p}>{children}</p>;
    const CardContent = ({children,className='',...p}) => <div className={'p-6 pt-0 '+className} {...p}>{children}</div>;
    const CardFooter = ({children,className='',...p}) => <div className={'flex items-center p-6 pt-0 '+className} {...p}>{children}</div>;
    const Avatar = ({children,className='',...p}) => <span className={'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full '+className} {...p}>{children}</span>;
    const AvatarImage = ({className='',...p}) => <img className={'aspect-square h-full w-full '+className} {...p}/>;
    const AvatarFallback = ({children,className='',...p}) => <span className={'flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-slate-600 text-sm font-medium '+className} {...p}>{children}</span>;
    const Checkbox = ({className='',...p}) => <input type="checkbox" className={'h-4 w-4 rounded border-slate-300 accent-slate-900 '+className} {...p}/>;
    const Switch = ({checked,onCheckedChange,className='',...p}) => <button role="switch" aria-checked={!!checked} onClick={()=>onCheckedChange&&onCheckedChange(!checked)} className={'peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors '+(checked?'bg-slate-900':'bg-slate-200')+' '+className} {...p}><span className={'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform '+(checked?'translate-x-5':'translate-x-0')}/></button>;
    const Progress = ({value=0,className='',...p}) => <div className={'relative h-4 w-full overflow-hidden rounded-full bg-slate-100 '+className} {...p}><div className="h-full bg-slate-900 transition-all" style={{width:Math.min(100,Math.max(0,value||0))+'%'}}/></div>;
    const _TabsCtx = createContext({v:'',set:(_n)=>{}});
    const Tabs = ({children,defaultValue='',value:vp,onValueChange,className='',...p}) => {
      const [v,setV] = useState(defaultValue||'');
      const cur = vp!==undefined ? vp : v;
      const set = (n) => { setV(n); onValueChange&&onValueChange(n); };
      return <_TabsCtx.Provider value={{v:cur,set}}><div className={className} {...p}>{children}</div></_TabsCtx.Provider>;
    };
    const TabsList = ({children,className='',...p}) => <div role="tablist" className={'inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500 '+className} {...p}>{children}</div>;
    const TabsTrigger = ({children,value,className='',...p}) => {
      const {v,set} = useContext(_TabsCtx);
      return <button role="tab" aria-selected={v===value} onClick={()=>set(value)} className={'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all disabled:opacity-50 '+(v===value?'bg-white text-slate-950 shadow-sm':'text-slate-500 hover:text-slate-700')+' '+className} {...p}>{children}</button>;
    };
    const TabsContent = ({children,value,className='',...p}) => {
      const {v} = useContext(_TabsCtx);
      return v===value ? <div role="tabpanel" className={'mt-2 ring-offset-white focus-visible:outline-none '+className} {...p}>{children}</div> : null;
    };
    const _SelCtx = createContext({v:'',set:(_n)=>{},open:false,setOpen:(_b)=>{}});
    const Select = ({children,defaultValue='',value:vp,onValueChange,...p}) => {
      const [v,setV] = useState(defaultValue||'');
      const [open,setOpen] = useState(false);
      const cur = vp!==undefined ? vp : v;
      const set = (n) => { setV(n); onValueChange&&onValueChange(n); setOpen(false); };
      return <_SelCtx.Provider value={{v:cur,set,open,setOpen}}><div className="relative inline-block w-full" {...p}>{children}</div></_SelCtx.Provider>;
    };
    const SelectTrigger = ({children,className='',...p}) => {
      const {open,setOpen} = useContext(_SelCtx);
      return <button onClick={()=>setOpen(!open)} className={'flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus:outline-none disabled:opacity-50 '+className} {...p}>{children}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>;
    };
    const SelectValue = ({placeholder=''}) => { const {v}=useContext(_SelCtx); return <span>{v||placeholder}</span>; };
    const SelectContent = ({children,className='',...p}) => {
      const {open}=useContext(_SelCtx);
      return open?<div className={'absolute z-50 min-w-[8rem] mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-md '+className} {...p}>{children}</div>:null;
    };
    const SelectItem = ({children,value,className='',...p}) => {
      const {set,v}=useContext(_SelCtx);
      return <div onClick={()=>set(value)} className={'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100 '+(v===value?'font-semibold bg-slate-50':'')+' '+className} {...p}>{children}</div>;
    };
`;
