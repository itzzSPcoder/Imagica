import { useGetPaymentPlan, useCreateCheckoutSession } from "@workspace/api-client-react";
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
  
  const userId = user?.id || "default-user";
  const { data: planStatus, isLoading: planLoading, refetch: refetchPlan } = useGetPaymentPlan({
    request: {
      headers: {
        "x-user-id": userId,
      },
    },
  });

  const checkoutMutation = useCreateCheckoutSession({
    request: {
      headers: {
        "x-user-id": userId,
      },
    },
  });

  const handleUpgrade = () => {
    checkoutMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          toast({
            title: "Redirecting to checkout...",
            description: "Connecting to the secure payment portal.",
          });
          // Redirect to Stripe checkout or simulated sandbox billing portal
          window.location.href = data.url;
        },
        onError: (err: any) => {
          toast({
            title: "Checkout error",
            description: err.error || "Failed to initialize payment gateway checkout.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const TIERS = [
    {
      id: "free",
      name: "Developer Starter",
      price: "$0",
      period: "forever",
      description: "Perfect for testing layout capabilities and quick components.",
      features: [
        "3 sketch-to-component conversions total",
        "Standard gemini-2.0-flash model access",
        "React + Tailwind CSS output support",
        "Sandbox environment execution",
      ],
      cta: "Current Tier",
      popular: false,
    },
    {
      id: "pro",
      name: "Workbench Premium",
      price: "$29",
      period: "month",
      description: "Industrial-grade features designed for full-time designers and developers.",
      features: [
        "Unlimited sketch-to-component conversions",
        "Priority gemini-2.5-pro high-tier model access",
        "All outputs (shadcn/ui, plain HTML, MERN Stack)",
        "Ultra Savings token optimizer telemetry",
        "StackBlitz one-click workspace exporting",
        "Priority developer support channel",
      ],
      cta: "Upgrade to Pro",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise Lab",
      price: "Custom",
      period: "billed annually",
      description: "Dedicated infrastructure and customized models for engineering teams.",
      features: [
        "Dedicated rate-limit bypass gateway",
        "Custom model tuning & layout prompts",
        "Unified workspace dashboard billing",
        "SLA guaranteed uptime",
        "Single-Sign-On (SSO) & custom SAML integrations",
      ],
      cta: "Contact Enterprise",
      popular: false,
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-neutral-950 px-6 py-12 text-zinc-100 sm:px-8 lg:py-20 select-none">
      
      {/* Visual Space Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="absolute top-1/4 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      
      <div className="relative z-10 mx-auto max-w-6xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Crown className="w-3.5 h-3.5 text-primary" />
            Pricing & Subscriptions
          </div>
          <h1 className="font-headline text-3xl font-semibold tracking-tight text-foreground sm:text-5xl leading-none">
            Unlock Industrial-Grade AI Features
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Upgrade your Imagica workbench to unlock deep reasoning models, unlimited sketch persists, and advanced developer sandboxes.
          </p>
        </div>

        {/* Sandbox Simulation Mode banner if Stripe key is missing */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 flex items-start gap-3 max-w-3xl mx-auto shadow-xl backdrop-blur-sm">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-zinc-300">
            <p className="font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Payment Gateway active in Developer Sandbox Mode</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
            <p className="leading-relaxed">
              Stripe checkout session creation is fully simulated when local keys are not configured. Click <strong>Upgrade to Pro</strong> to launch our interactive checkout mock portal and experience the premium onboarding flow.
            </p>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4 max-w-5xl mx-auto pt-4 items-stretch">
          {TIERS.map((tier) => {
            const isCurrent = planStatus?.plan === tier.id;
            const isFree = tier.id === "free";
            const isPro = tier.id === "pro";
            const isEnterprise = tier.id === "enterprise";

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-3xl p-6 bg-white/5 border transition-all duration-300 ${
                  tier.popular
                    ? "border-primary/50 shadow-2xl shadow-primary/5 scale-[1.03] z-10 md:py-8"
                    : "border-white/10 hover:border-white/20"
                } backdrop-blur-md`}
              >
                {/* Popular Glow Ring */}
                {tier.popular && (
                  <div className="absolute inset-x-0 -top-2.5 mx-auto w-32 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-1 text-center text-[9px] font-extrabold uppercase tracking-widest text-white shadow-md">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  {/* Title & Price */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Active Plan
                        </span>
                      )}
                    </div>
                    <p className="mt-2.5 text-xs text-zinc-400 min-h-[32px] leading-normal">{tier.description}</p>
                    
                    <div className="mt-4 flex items-baseline gap-1 select-all">
                      <span className="text-4xl font-semibold tracking-tight text-foreground">{tier.price}</span>
                      <span className="text-xs text-zinc-500">/{tier.period}</span>
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  {/* Features List */}
                  <ul className="space-y-3">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-normal">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
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
                      className="w-full rounded-full text-xs text-zinc-300 cursor-not-allowed"
                      disabled
                    >
                      Active Subscription
                    </Button>
                  ) : isFree ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-full text-xs text-zinc-400 hover:text-foreground cursor-pointer"
                      onClick={() => setLocation("/studio")}
                    >
                      Return to Studio
                    </Button>
                  ) : isEnterprise ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-full text-xs text-zinc-300 hover:bg-white/10 cursor-pointer"
                      onClick={() => {
                        toast({
                          title: "Contacting Enterprise Sales",
                          description: "An account executive has been notified of your interest.",
                        });
                      }}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <button
                      onClick={handleUpgrade}
                      disabled={checkoutMutation.isPending}
                      className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-1.5 select-none cursor-pointer border-0"
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Initializing Checkout...
                        </>
                      ) : (
                        <>
                          <Crown className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                          <span>Upgrade to Pro</span>
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

      </div>
    </div>
  );
}
