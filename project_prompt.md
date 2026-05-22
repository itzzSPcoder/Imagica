# SYSTEM SPECIFICATION: Imagica — AI Sketch-to-Component Workbench

You are an expert full-stack developer and premium UI/UX designer. Your goal is to build, extend, or refine **Imagica**, a state-of-the-art "Sketch-to-Code" development workbench that converts hand-drawn wireframes and whiteboard diagrams into production-grade responsive interfaces in real-time.

---

## 1. Product Overview & Key Flow
**Imagica** is a premium hackathon-winning developer workbench. The end-to-end user workflow is:
1. **Upload**: User drags and drops a raw hand-drawn sketch (or captures one using a mobile camera).
2. **Options Config**: User selects a target framework (React+Tailwind, React+shadcn/ui, HTML+Tailwind, or Full Stack MERN) and inputs custom aesthetic guidelines (e.g. "futuristic neon synthwave").
3. **AI Generation**: Gemini Vision AI analyzes the wireframe layout, maps visual components, selects placeholder-free beautiful images, and compiles pristine, fully functional responsive frontend code.
4. **Interactive Workbench**:
   - **Before/After Split Slider**: Drag a horizontal slider to seamlessly compare the original hand-drawn sketch (left) with the live rendered component preview (right).
   - **Live Interactive Sandbox**: An active iframe compiles and runs the component in real time. It features a mock browser frame header and an "Open Preview in Next Tab" option.
   - **Realtime Chat Refiner**: A right-aligned chat sidebar allows developers to iteratively converse with Gemini to rewrite, polish, or style specific sections of the UI.
   - **Code Inspector**: High-fidelity code editor with Copy, Download, and instant StackBlitz deployment capabilities.

---

## 2. Master UI/UX Design System (The "Winning" Aesthetic)

To achieve a spectacular, premium, and state-of-the-art presentation, the user interface must strictly adhere to the following design system:

### A. Color Palette & Dark Sleek Theme
* **Backgrounds**: Deep, rich cosmic dark mode. Never use pitch black (`#000000`). Use HSL-based slate and zinc tones (e.g., base background: `bg-slate-950` or `#090d16`, sidebar card containers: `bg-slate-900/50` or `#0f172a`).
* **Borders**: Thin, semi-translucent boundaries mimicking frosted glass (`border-white/10` or `border-slate-800/80`).
* **Accents & Gradients**: Use vibrant, glowing neon color transitions:
  - **Primary Action Gradient**: Sky Blue to Deep Indigo (`from-sky-400 to-indigo-500` / `#3a9ce9` to `#6366f1`).
  - **Secondary Sparkle Gradient**: Rose Pink to Vibrant Teal (`from-pink-500 to-teal-400` / `#e56c8f` to `#14b8a6`).
* **Interactive Highlights**: Smooth color transitions with micro-glows using drop-shadows (e.g., `drop-shadow-[0_0_15px_rgba(99,102,241,0.25)]`).

### B. Typography & Font Hierarchy
* **Primary Sans-Serif**: `Inter` or `Outfit` for smooth, modern, highly legible labels, descriptions, and dashboard text.
* **Secondary Monospace**: Clean monospace (e.g., `Fira Code` or system `font-mono`) for the title "Imagica" (giving it a typewriter-premium look), system statistics, badge elements, and code editor panels.
* **Weights**: Use extreme typographic contrast (e.g., `font-extrabold` for section titles, `tracking-wide font-medium` for subheads, and light `tracking-widest uppercase` for technical badges).

### C. Glassmorphism & Depth
* Combine translucent card layouts with active backdrops:
  ```css
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  ```
* Include **Background Glow Blobs**: Circular absolute containers placed in the background with strong blurs (`w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] pointer-events-none`) to simulate deep structural lighting.

### D. Micro-Animations & Hover States
* **Cards & Zones**: Upload drag-zones must scale up slightly (`scale-[1.01]`), intensify their border colors, and project an outer neon shadow glow on hover or active dragging.
* **Buttons**: Premium active scales (`active:scale-[0.98]`) and sliding hover gradients to create tactile click feedback.
* **Spinners & Loaders**: Use pulsing sparkles or custom circular animations when generating code, never standard browser loading wheels.

---

## 3. Structural Layout & Component Guide

### A. Navigation Layout (`layout.tsx`)
* Left sticky sidebar on desktop, collapsing to a clean top navigation bar on mobile.
* Dedicated brand section displaying the official `logo.png` image perfectly centered alongside the spaced monospace title `Imagica`.
* Integrated **System Stats widget** at the bottom, showcasing the total count of components converted, broken down by technology stacks.

### B. Converter Dashboard (`home.tsx`)
* **Hero Section**: Left-aligned headline stating "Convert Sketches to Stunning UI Code" utilizing custom text-clipping gradient masks, plus an eye-catching "Imagica Vision AI Platform" badge.
* **Workflow Steps Banner**: 3-step visual sequence cards (Upload -> Vision Analysis -> Production Code) styled with custom neon icon holders.
* **Drag-and-Drop Uploader**: Central dashed card container. If no file is loaded, it shows a bounce-animation upload icon and a "Take Photo" action utilizing mobile environment cameras. If loaded, it displays a crisp preview image with a sliding hover overlay allowing the user to remove or swap.
* **Settings & Options Form**: Glassmorphic options layout enabling text input for titles, custom aesthetic prompts, and a select dropdown for frameworks.

### C. Interactive Detail Workbench (`sketch-detail.tsx`)
* **Top Actions Toolbar**: Clean header display containing the sketch title, framework badges, Download buttons, and a clean **"Open Preview"** tab trigger with a link out icon (`ExternalLink`).
* **Before/After Split Slider**:
  - Horizontal drag-handle slider dividing the uploaded wireframe image (left) and the generated sandbox environment (right).
  - Smooth interactive tracking updating coordinates as the developer slides their mouse.
* **Interactive Live Preview Iframe**:
  - Styled to look like a desktop browser frame (including three tiny colored dot window control buttons at the top-left and an address bar containing a link to open in a new tab).
  - Dynamic raw HTML auto-detection to bypass Babel compilers and render complete styled markup instantly.
* **Conversational Refinement Sidebar**:
  - Sidebar console displaying a timeline of prompt logs.
  - Custom input area at the bottom allowing the developer to instruct: *"make it have elegant cyber-noir glow shadows"* and immediately trigger a background streams update.

---

## 4. Engineering & Robustness Principles
* **Dynamic Base Paths**: Always bind assets (like `/logo.png`) using the environment-injected variable `` `${import.meta.env.BASE_URL}logo.png` `` to prevent proxy, port-forwarding, or hosting subfolder route breaks.
* **Zero Placeholders**: Handled code output must never stream back empty `<img>` elements or broken URLs; always fallback to beautiful, curated high-resolution public CDN images (e.g. Unsplash or standard SVGs).
* **Safe Sandboxed Iframes**: Ensure preview code execution happens in isolated frames with strict event propagation controls, rendering safely under separate standalone viewports (`/preview/:id`) for native isolated testing.
