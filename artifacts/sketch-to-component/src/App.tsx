import { useCallback, useRef, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Index from "@/pages/index";
import Home from "@/pages/home";
import History from "@/pages/history";
import SketchDetail from "@/pages/sketch-detail";
import PreviewStandalone from "@/pages/preview-standalone";
import Pricing from "@/pages/pricing";
import CheckoutSimulation from "@/pages/checkout-simulation";
import Marketplace from "@/pages/marketplace";
import NotFound from "@/pages/not-found";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from "@clerk/clerk-react";

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY = 
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 
  "pk_test_bGVhcm5pbmctcHVwLTAuY2xlcmsuYWNjb3VudHMuZGV2JA";

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

/** Avoid a visible flash when the video loops by seeking before the last frame. */
function useSeamlessVideoLoop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    if (video.duration - video.currentTime < 0.08) {
      video.currentTime = 0.05;
    }
  }, []);

  return { videoRef, onTimeUpdate };
}

/** Automatically normalizes trailing slashes to prevent 404 router mismatch. */
function RedirectTrailingSlash() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (location !== "/" && location.endsWith("/")) {
      setLocation(location.slice(0, -1));
    }
  }, [location, setLocation]);
  return null;
}

function SignInPage() {
  const { videoRef, onTimeUpdate } = useSeamlessVideoLoop();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950">
      {/* Spacey video backdrop matching the landing page */}
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-neutral-950/20 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md p-4 flex justify-center">
        <SignIn 
          appearance={{
            variables: {
              colorPrimary: "#4285F4",
              colorBackground: "#ffffff",
              colorText: "#1f1f1f",
              colorTextSecondary: "#5f6368",
              colorInputBackground: "#ffffff",
              colorInputText: "#1f1f1f",
              colorBorder: "#e0e0e0"
            },
            elements: {
              cardBox: "shadow-2xl rounded-2xl overflow-hidden",
              card: "border border-white/40 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl",
              headerTitle: "text-zinc-950 font-headline font-semibold",
              headerSubtitle: "text-zinc-600 text-xs",
              socialButtonsBlockButton: "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg",
              formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-full font-medium shadow-sm",
              footerActionLink: "text-primary hover:underline",
              identityPreviewText: "text-zinc-900",
              identityPreviewEditButtonIcon: "text-primary",
              formFieldLabel: "text-zinc-700 font-medium text-xs",
              formFieldInput: "border border-zinc-300 rounded-lg focus:border-primary",
              dividerText: "text-zinc-400 text-[10px] uppercase font-bold",
              dividerLine: "bg-zinc-200"
            }
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/studio"
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  const { videoRef, onTimeUpdate } = useSeamlessVideoLoop();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950">
      {/* Spacey video backdrop matching the landing page */}
      <video
        ref={videoRef}
        src={HERO_VIDEO_URL}
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-neutral-950/20 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md p-4 flex justify-center">
        <SignUp 
          appearance={{
            variables: {
              colorPrimary: "#4285F4",
              colorBackground: "#ffffff",
              colorText: "#1f1f1f",
              colorTextSecondary: "#5f6368",
              colorInputBackground: "#ffffff",
              colorInputText: "#1f1f1f",
              colorBorder: "#e0e0e0"
            },
            elements: {
              cardBox: "shadow-2xl rounded-2xl overflow-hidden",
              card: "border border-white/40 bg-white/90 backdrop-blur-xl shadow-2xl rounded-2xl",
              headerTitle: "text-zinc-950 font-headline font-semibold",
              headerSubtitle: "text-zinc-600 text-xs",
              socialButtonsBlockButton: "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 rounded-lg",
              formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-full font-medium shadow-sm",
              footerActionLink: "text-primary hover:underline",
              identityPreviewText: "text-zinc-900",
              identityPreviewEditButtonIcon: "text-primary",
              formFieldLabel: "text-zinc-700 font-medium text-xs",
              formFieldInput: "border border-zinc-300 rounded-lg focus:border-primary",
              dividerText: "text-zinc-400 text-[10px] uppercase font-bold",
              dividerLine: "bg-zinc-200"
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/studio"
        />
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in*" component={SignInPage} />
      <Route path="/sign-up*" component={SignUpPage} />
      <Route path="/preview/:id" component={PreviewStandalone} />
      <Route path="/" component={Index} />
      <Route>
        <SignedIn>
          <Layout>
            <Switch>
              <Route path="/studio" component={Home} />
              <Route path="/history" component={History} />
              <Route path="/sketch/:id" component={SketchDetail} />
              <Route path="/pricing" component={Pricing} />
              <Route path="/checkout-simulation" component={CheckoutSimulation} />
              <Route path="/marketplace" component={Marketplace} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </SignedIn>
        <SignedOut>
          <RedirectToSignIn signInForceRedirectUrl="/studio" />
        </SignedOut>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="imagica-theme">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <RedirectTrailingSlash />
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default App;
