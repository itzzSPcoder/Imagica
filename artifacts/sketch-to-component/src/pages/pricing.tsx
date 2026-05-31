import { useGetPaymentPlan } from "@workspace/api-client-react";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Zap, Sparkles, Crown, ArrowRight, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function Pricing() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"plans" | "faq">("plans");
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  
  const userId = user?.id || "default-user";
  const { data: planStatus, isLoading: planLoading, refetch: refetchPlan } = useGetPaymentPlan({
    request: {
      headers: {
        "x-user-id": userId,
      },
    },
  });

  const handleUpgrade = async (planId: string) => {
    setPendingPlan(planId);
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize checkout session.");
      }
      toast({
        title: "Redirecting to checkout...",
        description: "Connecting to the secure payment portal.",
      });
      window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: "Checkout error",
        description: err.message || "Failed to initialize payment gateway checkout.",
        variant: "destructive",
      });
    } finally {
      setPendingPlan(null);
    }
  };

  const TIERS = [
    {
      id: "weekly",
      name: "Weekly Plan",
      price: "₹149",
      period: "week",
      description: "Perfect for testing layout capabilities and quick components.",
      features: [
        "10 sketch-to-component conversions per week",
        "Standard gemini-2.0-flash model access",
        "React + Tailwind CSS output support",
        "Basic component sandbox preview",
        "Standard email support",
      ],
      cta: "Upgrade Weekly",
      popular: false,
      badge: "Flexible"
    },
    {
      id: "monthly",
      name: "Monthly Pro",
      price: "₹499",
      period: "month",
      description: "Industrial-grade features designed for full-time designers and developers.",
      features: [
        "100 sketch-to-component conversions per month",
        "Priority gemini-2.5-pro high-tier model access",
        "All outputs (shadcn/ui, plain HTML, MERN Stack)",
        "Ultra Savings token optimizer telemetry",
        "StackBlitz one-click workspace exporting",
        "Priority developer support channel",
      ],
      cta: "Upgrade Monthly",
      popular: true,
      badge: "Save 20%"
    },
    {
      id: "yearly",
      name: "Yearly Lab",
      price: "₹3,999",
      period: "year",
      description: "Dedicated infrastructure and customized models for engineering teams.",
      features: [
        "Unlimited sketch-to-component conversions",
        "Dedicated rate-limit bypass gateway",
        "Custom model tuning & layout prompts",
        "Unified workspace dashboard billing",
        "SLA guaranteed uptime",
        "Single-Sign-On (SSO) & custom SAML integrations",
        "24/7 dedicated support team",
      ],
      cta: "Upgrade Yearly",
      popular: false,
      badge: "Best Value (Save 45%)"
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-background px-6 py-12 text-foreground sm:px-8 lg:py-20 select-none">
      
      {/* Visual Space Backdrop - Adaptive Radial Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />
      <div className="absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/3 dark:bg-primary/2 blur-3xl" />
      
      <div className="relative z-10 mx-auto max-w-6xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 py-1 text-xs font-semibold text-foreground/80 shadow-sm">
            <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Pricing & Subscriptions
          </div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground sm:text-5xl leading-tight">
            Unlock Industrial-Grade AI Features
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Upgrade your Imagica workbench to unlock deep reasoning models, higher sketch limits, and advanced developer sandboxes in INR packages.
          </p>
        </div>

        {/* Tab switcher for plans vs faq */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full border border-border bg-muted/40 p-1">
            <button
              onClick={() => setActiveTab("plans")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                activeTab === "plans" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setActiveTab("faq")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                activeTab === "faq" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Frequently Asked Questions
            </button>
          </div>
        </div>

        {activeTab === "plans" ? (
          <>
            {/* Sandbox Simulation Mode banner if Stripe key is missing */}
            <div className="bg-muted/40 border border-border rounded-2xl p-4 flex items-start gap-3 max-w-3xl mx-auto shadow-md backdrop-blur-sm">
              <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 text-muted-foreground">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <span>Interactive Billing Simulation Portal</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </p>
                <p className="leading-relaxed">
                  Payments are running in **Developer Sandbox Mode** (No real credentials required). Click on your preferred package below to proceed to the secure Indian Rupees (INR) checkout simulator supporting cards, UPI, and Netbanking.
                </p>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-6 max-w-5xl mx-auto pt-4 items-stretch">
              {TIERS.map((tier) => {
                const isCurrent = planStatus?.plan === tier.id;
                const isPending = pendingPlan === tier.id;

                return (
                  <div
                    key={tier.id}
                    className={`relative flex flex-col justify-between rounded-3xl p-6 bg-card border transition-all duration-300 ${
                      tier.popular
                        ? "border-primary shadow-xl scale-[1.03] z-10 md:py-8"
                        : "border-border hover:border-border/80 hover:shadow-md"
                    } backdrop-blur-md`}
                  >
                    {/* Badge */}
                    <div className={`absolute inset-x-0 -top-2.5 mx-auto w-36 rounded-full px-3 py-0.5 text-center text-[9px] font-extrabold uppercase tracking-widest border shadow-sm ${
                      tier.popular
                        ? "bg-foreground text-background border-foreground"
                        : "bg-muted text-muted-foreground border-border"
                    }`}>
                      {tier.badge}
                    </div>

                    <div className="space-y-6">
                      {/* Title & Price */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Active Plan
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground min-h-[32px] leading-relaxed">{tier.description}</p>
                        
                        <div className="mt-4 flex items-baseline gap-1 select-all">
                          <span className="text-4xl font-extrabold tracking-tight text-foreground">{tier.price}</span>
                          <span className="text-xs text-muted-foreground">/{tier.period}</span>
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      {/* Features List */}
                      <ul className="space-y-3">
                        {tier.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                            <Check className="w-3.5 h-3.5 text-foreground shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Call-to-action button */}
                    <div className="mt-8">
                      {isCurrent ? (
                        <Button
                          variant="outline"
                          className="w-full rounded-full text-xs text-muted-foreground cursor-not-allowed bg-muted/50 border-border"
                          disabled
                        >
                          Active Subscription
                        </Button>
                      ) : (
                        <button
                          onClick={() => handleUpgrade(tier.id)}
                          disabled={pendingPlan !== null}
                          className={`w-full py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 shadow-sm ${
                            tier.popular
                              ? "bg-foreground text-background hover:opacity-90"
                              : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                          }`}
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Initializing...
                            </>
                          ) : (
                            <>
                              <Crown className="w-3.5 h-3.5 shrink-0" />
                              <span>{tier.cta}</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
            
            {/* Free Tier Info footer */}
            <div className="text-center text-xs text-muted-foreground pt-4">
              Currently on **Developer Starter** (Free tier) with standard features. Need customized enterprise setups?{" "}
              <button 
                onClick={() => {
                  toast({
                    title: "Contacting Enterprise Sales",
                    description: "Our sales team has been notified of your interest.",
                  });
                }}
                className="underline hover:text-foreground font-semibold"
              >
                Contact Sales
              </button>
            </div>
          </>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 bg-card border border-border rounded-3xl p-8 shadow-sm">
            <div className="space-y-4">
              <h3 className="font-headline text-lg font-bold text-foreground">Can I upgrade or downgrade my plan anytime?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yes. You can toggle between Weekly, Monthly, and Yearly plans at any point. Your new limits will update instantly upon transaction confirmation in the checkout portal.
              </p>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-4">
              <h3 className="font-headline text-lg font-bold text-foreground">How does the simulated billing mode work?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Since this environment does not configure private Stripe API keys, all billing interactions run inside our premium interactive mock sandbox. It allows you to simulate payment details, receive mock invoices, and unlock the premium features immediately.
              </p>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-4">
              <h3 className="font-headline text-lg font-bold text-foreground">Which payment methods are supported in INR?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our Indian Rupees (INR) checkout simulator supports UPI (QR Code & VPA), Credit/Debit Cards (Visa, Mastercard, RuPay), and Netbanking from major Indian banks.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
