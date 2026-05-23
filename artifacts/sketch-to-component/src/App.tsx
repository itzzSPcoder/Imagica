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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/preview/:id" component={PreviewStandalone} />
      <Route path="/" component={Index} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/studio" component={Home} />
            <Route path="/history" component={History} />
            <Route path="/sketch/:id" component={SketchDetail} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
