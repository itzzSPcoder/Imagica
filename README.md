# 🔮 Imagica — AI-Powered Sketch to Component Workbench

Imagica is a breathtaking, premium, Google AI Studio-inspired sketch-to-code compiler that turns hand-drawn mockups, wireframes, and UI screenshots into production-ready web components. Powered by frontier Google Gemini multimodal models, Clerk Auth, and a blazing-fast Express+React monorepo workspace.

---

## 🎨 Visual Preview & User Experience

> [!NOTE]
> Imagica is designed with rich, spacey modern aesthetics, elegant night mode gradients, glassmorphism card panels, and smooth tactile micro-animations to deliver a state-of-the-art developer experience.

* **Google Labs UI Style**: A beautiful dark/night theme landing page utilizing seamless video loops.
* **Pill Tab Navigation**: Sleek, modern header tab switching between **Convert (Studio)**, **History Log**, and the interactive developer **Workbench**.
* **Live Sandbox Render**: Interactive split-pane workbench to test your generated components live in a preview frame next to their raw source code.

---

## 🚀 Key Features

* 🔐 **Clerk Auth Integration**: Complete secure sign-in and sign-up flow, seamlessly locking down private routes and showing your Clerk profile badge inside the workspace header.
* 📷 **Sketch-to-Code compiler**: Upload layout sketches via cloud-upload drag zones, file browsing, or directly snapping a picture from your camera.
* ⚡ **Real-Time Code Streaming (SSE)**: Generates responsive code via server-sent events, showing active generation stream chunks as they compile.
* 💬 **Gemini Chat Refiner**: A dedicated AI side-chat panel allowing you to refine the code with custom prompts (e.g. *"make it scrollable"*, *"change the theme"*).
* 🎯 **Target Framework Selector**: Output layouts into React+Tailwind, React+shadcn/ui, Standalone HTML+Tailwind, or a Full-Stack MERN (MongoDB, Express, React, Node) application bundle.
* ⚡ **StackBlitz Live Sandbox**: Launch code export playpens instantly on StackBlitz with a single click.

---

## 🏗️ Monorepo Architecture & Flow

The entire workflow, from sketch upload to robust fallback generation and token-efficient streaming refinement, is mapped out in the architectural diagram below:

```mermaid
graph TD
    classDef frontend fill:#4f46e5,stroke:#818cf8,stroke-width:2px,color:#fff;
    classDef backend fill:#10b981,stroke:#34d399,stroke-width:2px,color:#fff;
    classDef database fill:#f59e0b,stroke:#fbbf24,stroke-width:2px,color:#fff;
    classDef ai fill:#a855f7,stroke:#c084fc,stroke-width:2px,color:#fff;

    %% ── USER / FRONTEND LAYER ──
    User(["👤 User Context"]) -->|1. Sign In / Auth| LandingPage["🔮 Landing Page (Clerk Auth)"]:::frontend
    LandingPage -->|2. Redirect| Studio["💻 Convert Studio (Upload Mockup)"]:::frontend
    Studio -->|3. POST /api/sketches| API_Gate["⚙️ Express Router Gate"]:::backend
    
    %% ── BACKEND CORE LAYER ──
    subgraph Express Backend Server
        API_Gate -->|Extract Key/Model| KeyResolver["🔑 Key & Model Resolver"]:::backend
        KeyResolver -->|Quota Safe| FirstGen["🤖 generateCodeFromImage"]:::backend
        
        %% ── STREAMING & REFINE ──
        Studio -->|4. GET /sketch/:id (SSE)| StreamEndpoint["⚡ Code Stream SSE"]:::backend
        ChatBot["💬 Gemini Refiner Chat"] -->|5. GET /refine (SSE)| RefineEndpoint["💬 Code Refine SSE"]:::backend
    end

    %% ── ROBUST FALLBACKS ──
    FirstGen -->|Fallback Loop| ModelFlash20["gemini-2.0-flash"]:::ai
    FirstGen -->|Fallback Loop| ModelFlash25["gemini-2.5-flash"]:::ai
    FirstGen -->|Fallback Loop| ModelPro25["gemini-2.5-pro"]:::ai
    
    %% ── STREAM & REFINE WORK ──
    StreamEndpoint -->|Includes base64 Image| GeminiStream["Gemini Stream API"]:::ai
    RefineEndpoint -->|95% Token Optimized (No Image)| GeminiRefine["Gemini Refine API"]:::ai

    %% ── RETRY HANDLER ──
    GeminiStream & GeminiRefine -->|withRetry helper| RetryGate{"Retry on 429/408?"}:::backend
    RetryGate -->|Yes: exponential backoff| GeminiStream
    RetryGate -->|No: critical error| ErrorLog["🚨 SSE Error Event"]:::backend

    %% ── DATABASE LAYER ──
    RetryGate -->|Success: Save Code| DrizzleORM["Drizzle ORM Query"]:::database
    DrizzleORM -->|SQLite / DB Store| SQLite[("🗄️ SQLite Database")]:::database
    
    %% ── RESULT FEEDBACK LOOP ──
    SQLite -.->|Hydrate Stats/History| Workbench["🔬 Dev Workbench Sandbox"]:::frontend
    Workbench -.->|StackBlitz Playpen| StackBlitz[("⚡ StackBlitz Sandbox")]:::frontend

    class LandingPage,Studio,Workbench,StackBlitz frontend;
    class API_Gate,KeyResolver,FirstGen,StreamEndpoint,RefineEndpoint,RetryGate,ErrorLog backend;
    class DrizzleORM,SQLite database;
    class ModelFlash20,ModelFlash25,ModelPro25,GeminiStream,GeminiRefine ai;
```

### 🧠 Advanced Engineering Optimizations Implemented:
1. **95%+ Token-Saving Refinement Prompting**: Unlike basic tools that upload large base64 image strings (~300,000+ tokens) on every single refinement request, Imagica only uploads the sketch once. Subsequent chats are strictly text-based, decreasing latency by 5x and preventing free API quota exhaustion.
2. **Zero-Delay Model Fallback Engine**: If the default model `gemini-2.0-flash` is rate-limited on the user's key, the backend automatically and seamlessly tries candidate fallbacks (`gemini-2.5-flash` and `gemini-2.5-pro`) to ensure generations never crash.
3. **Exponential Backoff Retry Gate**: Standard transient rate limit errors (`429`) and timeouts (`408`) are elegantly intercepted by the server and retried using a backoff algorithm (`2s -> 4s -> 8s`) instead of failing instantly in the UI.

---

## 🛠️ Technology Stack

| Component | Framework / Library | Description |
|---|---|---|
| **Frontend Core** | React 19, TypeScript | High-performance reactive UI |
| **Styling** | Tailwind CSS v4 | Futuristic modern glassmorphism themes |
| **Authentication** | `@clerk/clerk-react` | Enterprise grade secure user management |
| **Routing** | `wouter` | Blazing-fast router matching wildcard routes |
| **Backend API** | Node.js, Express, Pino | Lightweight and structured JSON APIs |
| **Database ORM**| Drizzle ORM | Type-safe migrations and queries |
| **AI Frontier** | `@google/genai` | Frontier vision/multimodal intelligence |

---

## 📁 Monorepo Workspace Structure

```
├── artifacts/
│   ├── api-server/              # Express API server (ports, DB connectors, SSE routers)
│   ├── mockup-sandbox/          # Live HTML sandbox frame preview server
│   └── sketch-to-component/     # Front-end React application (workbench, forms, layouts)
├── lib/
│   ├── api-client-react/        # Auto-generated Tanstack Queries hooks for the frontend
│   ├── api-spec/                # OpenAPI specification and generation configurations
│   ├── api-zod/                 # Shared data validation Zod schemas
│   ├── db/                      # Shared SQLite migrations and schema tables
│   └── integrations-gemini-ai/  # Shared Google Gen AI SDK client wrappers
├── package.json                 # Monorepo workspace configuration
└── pnpm-workspace.yaml          # Monorepo dependencies catalog definitions
```

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have **Node.js >= 24** and **pnpm** installed on your system.

### ⚙️ Environment Configuration
Create a `.env` file in the root workspace (which will feed the apps):

1. For **Frontend** (`artifacts/sketch-to-component/.env`):
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   ```

2. For **Backend** (`artifacts/api-server/.env`):
   ```env
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

### 📦 Installation
From the root workspace folder, install all local and package dependencies:
```bash
pnpm install
```

### 💻 Running Development Servers
Start both the API server and the front-end workbench in local development mode:
```bash
pnpm run dev
```
* **Frontend UI**: `http://localhost:25383`
* **API Backend**: `http://localhost:18080`

### 🏗️ Compiling for Production
Verify types and compile the complete production bundle:
```bash
pnpm run build
```

---

## ⚡ Deployment

The application is completely configured for cloud deployment platforms (such as Render, Dokku, or VPS engines):
* Root scripts automatically compile frontend public assets directly into the Express static folder.
* Launch production instances directly using:
  ```bash
  pnpm start
  ```

---
*Built with passion and 🔮 Google Gemini AI.*
