import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/clerk-react";
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Sparkles, 
  HelpCircle, 
  QrCode, 
  ArrowRight,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentMethod = "card" | "upi" | "netbanking";
type LoadingStep = "idle" | "securing" | "verifying" | "activating" | "success";

export default function CheckoutSimulation() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Parse query parameters
  const [userId, setUserId] = useState("default-user");
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setUserId(params.get("userId") || user?.id || "default-user");
      setSelectedPlan(params.get("plan") || "monthly");
    }
  }, [user]);

  // Pricing details in INR
  const planDetails: Record<string, { name: string; price: number; period: string; base: number; gst: number }> = {
    weekly: {
      name: "Weekly Plan",
      price: 149,
      period: "week",
      base: 126.27,
      gst: 22.73
    },
    monthly: {
      name: "Monthly Pro Plan",
      price: 499,
      period: "month",
      base: 422.88,
      gst: 76.12
    },
    yearly: {
      name: "Yearly Lab Plan",
      price: 3999,
      period: "year",
      base: 3388.98,
      gst: 610.02
    }
  };

  const plan = planDetails[selectedPlan] || planDetails.monthly;

  // UI state
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [stepProgress, setStepProgress] = useState(0);
  const [transactionId] = useState(`TXN_${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
  const [invoiceId] = useState(`INV_2026_${Math.floor(1000 + Math.random() * 9000)}`);

  // Card input states
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  // UPI input states
  const [upiId, setUpiId] = useState("");
  const [qrScanned, setQrScanned] = useState(false);

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState("");

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 16) value = value.slice(0, 16);
    const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
    setCardNumber(formatted);
  };

  // Format Expiry (adds slash MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setCardExpiry(value);
  };

  // Format CVV (3 digits)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 3);
    setCardCvv(value);
  };

  // Simulated payment processing loop
  const initiatePayment = () => {
    // Basic form validation
    if (method === "card") {
      if (cardNumber.replace(/\s/g, "").length !== 16) {
        toast({ title: "Validation Error", description: "Please enter a valid 16-digit card number.", variant: "destructive" });
        return;
      }
      if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
        toast({ title: "Validation Error", description: "Please enter expiry date in MM/YY format.", variant: "destructive" });
        return;
      }
      if (cardCvv.length !== 3) {
        toast({ title: "Validation Error", description: "Please enter a valid 3-digit CVV.", variant: "destructive" });
        return;
      }
      if (!cardName.trim()) {
        toast({ title: "Validation Error", description: "Please enter cardholder name.", variant: "destructive" });
        return;
      }
    } else if (method === "upi") {
      if (!upiId.trim() && !qrScanned) {
        toast({ title: "Validation Error", description: "Please enter your UPI VPA address or click 'Simulate QR Scan'.", variant: "destructive" });
        return;
      }
    } else if (method === "netbanking") {
      if (!selectedBank) {
        toast({ title: "Validation Error", description: "Please select your bank.", variant: "destructive" });
        return;
      }
    }

    setLoadingStep("securing");
    setStepProgress(20);

    setTimeout(() => {
      setLoadingStep("verifying");
      setStepProgress(50);
      
      setTimeout(() => {
        setLoadingStep("activating");
        setStepProgress(85);
        
        // Call backend API to activate the plan
        fetch("/api/payments/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            plan: selectedPlan
          })
        })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Activation failed.");
          }
          return res.json();
        })
        .then(() => {
          setLoadingStep("success");
          setStepProgress(100);
          toast({
            title: "Plan Upgraded Successfully!",
            description: `Unlocked full premium access for the ${plan.name}.`,
          });
        })
        .catch((err) => {
          setLoadingStep("idle");
          toast({
            title: "Transaction Failed",
            description: err.message || "Failed to update limits persistently.",
            variant: "destructive"
          });
        });

      }, 1500);
    }, 1500);
  };

  if (loadingStep === "success") {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-6 bg-background text-foreground relative select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(16,185,129,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(16,185,129,0.03),rgba(255,255,255,0))]" />
        
        <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-fade-in">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="font-headline text-2xl font-bold tracking-tight text-foreground">Payment Successful</h2>
            <p className="text-xs text-muted-foreground">Your account has been upgraded. Start creating components with premium limits.</p>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-5 text-left space-y-3.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono font-medium text-foreground">{transactionId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Invoice Reference</span>
              <span className="font-mono font-medium text-foreground">{invoiceId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Upgraded Package</span>
              <span className="font-semibold text-foreground">{plan.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-extrabold text-foreground text-sm">₹{plan.price.toLocaleString("en-IN")}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/80 leading-normal">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Paid securely via simulated sandbox gateway. Persistent limits updated in `.local/imagica-plans.json`</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => setLocation("/studio")}
              className="w-full rounded-full bg-foreground text-background hover:opacity-90 py-5 font-semibold text-xs transition-all shadow-sm"
            >
              Go to Workbench Studio
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/pricing")}
              className="w-full rounded-full border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted py-5 transition-all"
            >
              View Pricing Tiers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground relative p-6 sm:p-10 lg:py-16 select-none">
      
      {/* Visual Space Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.06),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
      
      {/* Simulation Gateway Loading Screen */}
      {loadingStep !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-8 bg-card border border-border rounded-3xl shadow-2xl text-center space-y-6 animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin text-foreground mx-auto" />
            
            <div className="space-y-2">
              <h3 className="font-headline text-lg font-bold text-foreground">
                {loadingStep === "securing" && "Securing Payment Channel..."}
                {loadingStep === "verifying" && "Waiting for Bank Authorization..."}
                {loadingStep === "activating" && "Activating Custom Limits..."}
              </h3>
              <p className="text-xs text-muted-foreground">
                {loadingStep === "securing" && "Connecting to the dummy banking simulator over secure layer."}
                {loadingStep === "verifying" && "Processing transaction tokens and confirming verification state."}
                {loadingStep === "activating" && "Writing subscription changes to persistent database."}
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/10">
                <div 
                  className="h-full bg-foreground rounded-full transition-all duration-300"
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-muted-foreground/80">
                <span>PROGRESS</span>
                <span>{stepProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-5xl space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border pb-5">
          <button 
            onClick={() => window.history.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 leading-none">
              Checkout Simulator
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 select-none uppercase tracking-wide">
                Sandbox
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Interactive mock billing gateway inside sandbox testing environment.</p>
          </div>
        </div>

        {/* Info Sandbox banner */}
        <div className="bg-muted/40 border border-border rounded-2xl p-4 flex items-start gap-3 shadow-sm">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-xs space-y-1 text-muted-foreground">
            <p className="font-bold text-foreground">Bhai, Payment Integration completely dummy hai!</p>
            <p className="leading-relaxed">
              Aap dynamic card details (kuch bhi fill krdo), UPI text box, or direct QR code scanning simulate kr skte ho. Indian Rupees (INR) packages backend system se linked hain so successful validation ke baad aapki limit update ho jaegi!
            </p>
          </div>
        </div>

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Payment Form (8 cols) */}
          <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            <div className="space-y-1">
              <h2 className="text-md font-bold text-foreground">Select Payment Method</h2>
              <p className="text-xs text-muted-foreground">Pick how you want to simulate this Indian Rupees (INR) transaction.</p>
            </div>

            {/* Selector Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMethod("card")}
                className={`py-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "card" 
                    ? "border-foreground bg-foreground text-background" 
                    : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground bg-muted/20"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>
              <button
                onClick={() => setMethod("upi")}
                className={`py-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "upi" 
                    ? "border-foreground bg-foreground text-background" 
                    : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground bg-muted/20"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>
              <button
                onClick={() => setMethod("netbanking")}
                className={`py-3 rounded-2xl border text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === "netbanking" 
                    ? "border-foreground bg-foreground text-background" 
                    : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground bg-muted/20"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Netbanking</span>
              </button>
            </div>

            <div className="h-px bg-border" />

            {/* Credit Card inputs */}
            {method === "card" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="card-number" className="text-xs font-semibold text-foreground/80">Card Number (Simulated)</Label>
                  <div className="relative">
                    <Input
                      id="card-number"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4111 2222 3333 4444"
                      className="bg-muted/10 border-border text-foreground font-mono pl-10 pr-4 py-6 rounded-xl placeholder:text-muted-foreground/60"
                    />
                    <CreditCard className="w-4 h-4 text-muted-foreground/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="text-xs font-semibold text-foreground/80">Expiry Date</Label>
                    <Input
                      id="expiry"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      placeholder="MM/YY"
                      className="bg-muted/10 border-border text-foreground font-mono py-6 rounded-xl placeholder:text-muted-foreground/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv" className="text-xs font-semibold text-foreground/80">CVV</Label>
                    <Input
                      id="cvv"
                      value={cardCvv}
                      onChange={handleCvvChange}
                      type="password"
                      placeholder="123"
                      className="bg-muted/10 border-border text-foreground font-mono py-6 rounded-xl placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-name" className="text-xs font-semibold text-foreground/80">Cardholder Name</Label>
                  <Input
                    id="card-name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Enter Name"
                    className="bg-muted/10 border-border text-foreground py-6 rounded-xl placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
            )}

            {/* UPI inputs */}
            {method === "upi" && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Simulated QR Code Scan */}
                <div className="border border-border rounded-2xl p-5 bg-muted/20 flex flex-col items-center gap-4">
                  <div className="relative p-3 bg-white dark:bg-zinc-950 border border-border/80 rounded-2xl shadow-sm">
                    {/* Simulated SVG QR */}
                    <svg className="w-36 h-36 text-zinc-900 dark:text-zinc-50" viewBox="0 0 100 100" fill="currentColor">
                      <rect width="100" height="100" fill="none" />
                      {/* Squares representing QR anchors */}
                      <rect x="5" y="5" width="25" height="25" fill="currentColor" rx="2" />
                      <rect x="10" y="10" width="15" height="15" fill="white" rx="1" />
                      <rect x="13" y="13" width="9" height="9" fill="currentColor" />
                      
                      <rect x="70" y="5" width="25" height="25" fill="currentColor" rx="2" />
                      <rect x="75" y="10" width="15" height="15" fill="white" rx="1" />
                      <rect x="78" y="13" width="9" height="9" fill="currentColor" />
                      
                      <rect x="5" y="70" width="25" height="25" fill="currentColor" rx="2" />
                      <rect x="10" y="75" width="15" height="15" fill="white" rx="1" />
                      <rect x="13" y="78" width="9" height="9" fill="currentColor" />
                      
                      {/* Dummy QR bits pattern */}
                      <rect x="35" y="5" width="5" height="10" />
                      <rect x="45" y="15" width="10" height="5" />
                      <rect x="60" y="5" width="5" height="5" />
                      
                      <rect x="35" y="35" width="10" height="10" />
                      <rect x="50" y="40" width="15" height="5" />
                      <rect x="70" y="35" width="10" height="10" />
                      
                      <rect x="35" y="60" width="5" height="15" />
                      <rect x="45" y="75" width="20" height="5" />
                      <rect x="75" y="65" width="15" height="15" />
                      
                      <rect x="55" y="55" width="10" height="10" />
                      <rect x="85" y="45" width="10" height="5" />
                      <rect x="15" y="45" width="5" height="15" />
                      <rect x="45" y="50" width="5" height="5" />
                    </svg>
                    
                    {qrScanned && (
                      <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-500/5 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                        <span className="bg-emerald-500 text-white font-bold text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                          QR Scanned ✓
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-foreground">Scan and Pay with UPI Apps</p>
                    <p className="text-[10px] text-muted-foreground max-w-xs">Use any UPI app (GPay, PhonePe, Paytm, BHIM) to scan this dummy QR code.</p>
                  </div>

                  {!qrScanned ? (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setQrScanned(true);
                        toast({ title: "Mock Scan Complete", description: "Simulated QR code scanning from UPI Mobile App." });
                      }}
                      className="rounded-full text-[11px] h-8 border-border text-muted-foreground hover:text-foreground"
                    >
                      <QrCode className="w-3.5 h-3.5 mr-1" />
                      Simulate Mobile QR Scan
                    </Button>
                  ) : (
                    <button 
                      onClick={() => setQrScanned(false)}
                      className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    >
                      Reset QR Scan state
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider">OR ENTER UPI ID</span>
                  <div className="h-px bg-border flex-1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upi-vpa" className="text-xs font-semibold text-foreground/80">UPI Virtual Payment Address (VPA)</Label>
                  <Input
                    id="upi-vpa"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="example@okaxis, user@paytm"
                    className="bg-muted/10 border-border text-foreground font-mono py-6 rounded-xl placeholder:text-muted-foreground/60"
                  />
                  <p className="text-[10px] text-muted-foreground/80 leading-normal">Enter any dummy UPI address to simulate authorization flow.</p>
                </div>

              </div>
            )}

            {/* Netbanking inputs */}
            {method === "netbanking" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Select Major Indian Bank</Label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-4 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                          selectedBank === bank 
                            ? "border-foreground bg-foreground/5 font-bold" 
                            : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground bg-muted/10"
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="h-px bg-border" />

            {/* Pay Button */}
            <div className="pt-2">
              <Button
                onClick={initiatePayment}
                className="w-full rounded-full bg-foreground text-background hover:opacity-90 font-bold text-xs py-6 transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Pay securely ₹{plan.price.toLocaleString("en-IN")}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Button>
              <div className="text-center text-[10px] text-muted-foreground mt-3 flex items-center justify-center gap-1 leading-normal">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Simulated Sandbox Environment. No real financial transaction will take place.</span>
              </div>
            </div>

          </div>

          {/* Right: Order Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Summary Details */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-md font-bold text-foreground">Billing Summary</h2>
              
              <div className="h-px bg-border" />

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-foreground">{plan.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Billed {plan.period}ly</p>
                  </div>
                  <span className="font-mono font-semibold text-foreground">₹{plan.base.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span className="font-mono text-foreground">₹{plan.gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="h-px bg-border" />

                <div className="flex justify-between items-end">
                  <span className="font-bold text-foreground">Total Amount (INR)</span>
                  <span className="font-extrabold text-foreground text-lg">₹{plan.price.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Security trust badge */}
            <div className="bg-muted/10 border border-border/80 rounded-2xl p-4 flex gap-3 text-xs leading-normal">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-muted-foreground text-[11px]">
                <p className="font-bold text-foreground">PCI-DSS Compliant Simulation</p>
                <p>Mock billing portal implements state-of-the-art secure gateway endpoints. Data is processed locally without external leakage.</p>
              </div>
            </div>

            {/* Help / Need Assistance */}
            <div className="border border-border rounded-2xl p-5 text-xs text-muted-foreground space-y-2">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                Need Assistance?
              </p>
              <p className="leading-relaxed">
                If you encounter any issues inside the simulator sandbox or wish to custom reset your test subscriptions, please click **Reset QR Scan** or contact us at sandbox-support@imagica.xyz
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
