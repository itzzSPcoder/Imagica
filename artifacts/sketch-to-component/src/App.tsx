import { Switch, Route, Router as WouterRouter } from "wouter";
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

function SignInPage() {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Background sparkles/glow */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[rgba(66,133,244,0.08)] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[rgba(155,114,203,0.06)] blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md p-4 flex justify-center">
        <SignIn 
          appearance={{
            variables: {
              colorPrimary: "#4285F4",
              colorBackground: "#131314",
              colorText: "#e3e3e3",
              colorTextSecondary: "#b3b3b3",
              colorInputBackground: "#1e1e1f",
              colorInputText: "#e3e3e3",
              colorBorder: "#3c4043"
            },
            elements: {
              cardBox: "shadow-2xl rounded-2xl overflow-hidden",
              card: "border border-neutral-800 bg-[#131314]/95 backdrop-blur-md shadow-2xl rounded-2xl",
              headerTitle: "text-foreground font-headline font-semibold",
              headerSubtitle: "text-muted-foreground text-xs",
              socialButtonsBlockButton: "border border-neutral-800 bg-neutral-900 text-foreground hover:bg-neutral-800",
              formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-full",
              footerActionLink: "text-primary hover:underline",
              identityPreviewText: "text-foreground",
              identityPreviewEditButtonIcon: "text-primary"
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
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Background sparkles/glow */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-[rgba(66,133,244,0.08)] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[rgba(155,114,203,0.06)] blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md p-4 flex justify-center">
        <SignUp 
          appearance={{
            variables: {
              colorPrimary: "#4285F4",
              colorBackground: "#131314",
              colorText: "#e3e3e3",
              colorTextSecondary: "#b3b3b3",
              colorInputBackground: "#1e1e1f",
              colorInputText: "#e3e3e3",
              colorBorder: "#3c4043"
            },
            elements: {
              cardBox: "shadow-2xl rounded-2xl overflow-hidden",
              card: "border border-neutral-800 bg-[#131314]/95 backdrop-blur-md shadow-2xl rounded-2xl",
              headerTitle: "text-foreground font-headline font-semibold",
              headerSubtitle: "text-muted-foreground text-xs",
              socialButtonsBlockButton: "border border-neutral-800 bg-neutral-900 text-foreground hover:bg-neutral-800",
              formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-opacity rounded-full",
              footerActionLink: "text-primary hover:underline",
              identityPreviewText: "text-foreground",
              identityPreviewEditButtonIcon: "text-primary"
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
        <Layout>
          <Switch>
            <Route path="/studio">
              <SignedIn>
                <Home />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn signInForceRedirectUrl="/studio" />
              </SignedOut>
            </Route>
            <Route path="/history">
              <SignedIn>
                <History />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn signInForceRedirectUrl="/history" />
              </SignedOut>
            </Route>
            <Route path="/sketch/:id">
              <SignedIn>
                <SketchDetail />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn signInForceRedirectUrl="/studio" />
              </SignedOut>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </Layout>
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
