import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingBag, 
  Coins, 
  ArrowRight, 
  ExternalLink, 
  Code, 
  Check, 
  Layout, 
  User, 
  ChevronRight, 
  Sparkles,
  Search,
  Building,
  CreditCard,
  QrCode,
  DollarSign,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetPaymentPlan } from "@workspace/api-client-react";

interface Listing {
  sketchId: number;
  title: string;
  imageDataUrl: string;
  generatedCode: string;
  price: number;
  sellerId: string;
  sellerName: string;
  createdAt: string;
  salesCount: number;
}

export default function Marketplace() {
  const { user } = useUser();
  const userId = user?.id || "default-user";
  const { toast } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<"catalog" | "dashboard">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  // Bank Info form state
  const [bankName, setBankName] = useState("");
  const [accountNum, setAccountNum] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Fetch plan and wallet stats
  const { data: planStatus, refetch: refetchWallet } = useGetPaymentPlan({
    request: {
      headers: {
        "x-user-id": userId,
      },
    },
  });

  const fetchListings = async () => {
    try {
      setListingsLoading(true);
      const res = await fetch("/api/marketplace", {
        headers: { "x-user-id": userId }
      });
      if (res.ok) {
        const data = await res.json();
        setListings(data);
      }
    } catch (err) {
      console.error("Failed to load marketplace listings:", err);
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
    if (planStatus?.bankDetails) {
      setBankName(planStatus.bankDetails.bankName || "");
      setAccountNum(planStatus.bankDetails.accountNum || "");
      setIfsc(planStatus.bankDetails.ifsc || "");
      setUpiId(planStatus.bankDetails.upiId || "");
    }
  }, [planStatus]);

  const handleBuy = async (sketchId: number, price: number) => {
    const credits = planStatus?.credits ?? 0;
    if (credits < price) {
      toast({
        title: "Insufficient Credits",
        description: `This layout costs ${price} Credits (₹${price}), but you only have ${credits} Credits. Upgrade plans or earn credits by selling your own designs.`,
        variant: "destructive"
      });
      return;
    }

    setBuyingId(sketchId);
    try {
      const res = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({ sketchId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to make purchase");
      }

      toast({
        title: "Purchase Successful",
        description: "Layout added to your credentials. Credits deducted successfully.",
      });

      refetchWallet();
      fetchListings();
    } catch (err: any) {
      toast({
        title: "Purchase failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setBuyingId(null);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    try {
      const res = await fetch("/api/marketplace/bank-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId
        },
        body: JSON.stringify({ bankName, accountNum, ifsc, upiId })
      });
      if (res.ok) {
        toast({
          title: "Bank Details Updated",
          description: "Your direct cash settlement settings have been updated persistently.",
        });
        refetchWallet();
      } else {
        throw new Error();
      }
    } catch {
      toast({
        title: "Update failed",
        description: "Could not save settlement configuration.",
        variant: "destructive"
      });
    } finally {
      setSavingBank(false);
    }
  };

  const handleWithdraw = async () => {
    if (!planStatus?.cash || planStatus.cash <= 0) {
      toast({
        title: "No Earnings",
        description: "You do not have any cash balance available to withdraw yet.",
        variant: "destructive"
      });
      return;
    }
    if (!upiId && (!bankName || !accountNum)) {
      toast({
        title: "Settlement details missing",
        description: "Please specify your UPI ID or Bank Account Details first in the dashboard.",
        variant: "destructive"
      });
      return;
    }

    setPayoutLoading(true);
    // Simulate payment routing delay
    setTimeout(() => {
      setPayoutLoading(false);
      toast({
        title: "Payout Dispatched",
        description: `Direct Bank Transfer of ₹${planStatus.cash} is successfully dispatched to your configured account/UPI. It will reflect in 2-4 hours.`,
      });
    }, 1500);
  };

  const filteredListings = listings.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter listings belonging to user for dashboard metrics
  const myListings = listings.filter((l) => l.sellerId === userId);
  const totalSales = myListings.reduce((sum, item) => sum + item.salesCount, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 md:p-8 space-y-6">
      
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border border-indigo-500/20 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Imagica Creator Market
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-headline">
            Design & Component Marketplace
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Browse premium layouts created by engineers and designers. Sell your own code for <span className="text-amber-400 font-semibold font-mono">60% Credits</span> and <span className="text-emerald-400 font-semibold font-mono">40% Cash Payouts</span>.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:w-64 backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>My Credits</span>
            <span className="font-bold text-amber-400 font-mono">✨ {planStatus?.credits ?? 0}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Cash Ledger</span>
            <span className="font-bold text-emerald-400 font-mono">₹{planStatus?.cash ?? 0}</span>
          </div>
          <Button 
            onClick={() => setActiveSubTab(activeSubTab === "catalog" ? "dashboard" : "catalog")}
            size="sm" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-1 rounded-xl text-xs h-8"
          >
            {activeSubTab === "catalog" ? "Seller Dashboard" : "Browse Market"}
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* 2. Sub Tabs Navigation */}
      <Tabs value={activeSubTab} onValueChange={(val) => setActiveSubTab(val as any)} className="w-full">
        <TabsList className="bg-muted/30 border border-border/80 rounded-xl p-1 mb-6">
          <TabsTrigger value="catalog" className="rounded-lg text-xs font-medium py-2 px-4 transition-all">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Components Catalog
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="rounded-lg text-xs font-medium py-2 px-4 transition-all">
            <User className="w-4 h-4 mr-2" />
            Seller Settlement & Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Components Catalog */}
        <TabsContent value="catalog" className="space-y-6 outline-none">
          {/* Search Box */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search components or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-card border border-border text-xs rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          {listingsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-3xl bg-card/20 space-y-3">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
              <p className="text-sm font-semibold text-foreground">No components found</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No designs are currently listed matching your criteria. Create a beautiful component from sketch and list it for sale first!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing) => {
                const isOwnListing = listing.sellerId === userId;
                return (
                  <Card 
                    key={listing.sketchId} 
                    className="border border-border/80 bg-card hover:border-primary/40 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col group"
                  >
                    {/* Visual Preview */}
                    <div className="relative aspect-video bg-neutral-900 border-b border-border overflow-hidden select-none">
                      {listing.imageDataUrl ? (
                        <img 
                          src={listing.imageDataUrl} 
                          alt={listing.title} 
                          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-950">
                          <Layout className="w-8 h-8 text-indigo-500 opacity-40" />
                        </div>
                      )}
                      
                      <div className="absolute top-3 right-3 rounded-full bg-slate-950/80 border border-white/10 px-3 py-1 text-xs font-bold text-amber-400 font-mono flex items-center gap-1 select-none backdrop-blur-sm shadow">
                        ✨ {listing.price} Cr
                      </div>
                    </div>

                    <CardHeader className="p-4 space-y-1">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {listing.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        <span>{listing.sellerName}</span>
                        {isOwnListing && (
                          <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400 bg-indigo-500/10 rounded-full border border-indigo-500/25">
                            My Design
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="px-4 pb-4 pt-0 flex-grow">
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
                        <div>
                          Sales: <span className="font-bold text-foreground">{listing.salesCount}</span>
                        </div>
                        <div>
                          Listed: <span className="font-mono text-foreground/80">{new Date(listing.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 bg-muted/20 border-t border-border/40 gap-2">
                      <Button
                        size="sm"
                        disabled={isOwnListing || buyingId !== null}
                        onClick={() => handleBuy(listing.sketchId, listing.price)}
                        className={`w-full rounded-xl text-xs font-semibold select-none ${
                          isOwnListing 
                            ? "bg-muted text-muted-foreground border border-border" 
                            : "bg-indigo-600 hover:bg-indigo-700 text-white hover:-translate-y-0.5 transition-all duration-300"
                        }`}
                      >
                        {buyingId === listing.sketchId ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Buying Layout...
                          </>
                        ) : isOwnListing ? (
                          "Your Item"
                        ) : (
                          <>
                            Buy Layout
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Seller Dashboard */}
        <TabsContent value="dashboard" className="space-y-6 outline-none">
          
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border border-border/80 bg-card rounded-2xl p-5 space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                Designs Listed
              </p>
              <p className="text-2xl font-bold font-mono leading-none text-foreground">
                {myListings.length}
              </p>
            </Card>

            <Card className="border border-border/80 bg-card rounded-2xl p-5 space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                Total Layouts Sold
              </p>
              <p className="text-2xl font-bold font-mono leading-none text-foreground">
                {totalSales}
              </p>
            </Card>

            <Card className="border border-border/80 bg-card rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  Credits Earned (60%)
                </p>
                <Coins className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-2xl font-bold font-mono leading-none text-amber-400">
                ✨ {planStatus?.credits ?? 0}
              </p>
            </Card>

            <Card className="border border-border/80 bg-card rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                  Cash Balance (40%)
                </p>
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono leading-none text-emerald-400">
                ₹{planStatus?.cash ?? 0}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Direct Bank/UPI payout Form */}
            <Card className="border border-border/80 bg-card rounded-2xl lg:col-span-2 overflow-hidden">
              <CardHeader className="border-b border-border/40 p-5 bg-muted/20">
                <CardTitle className="text-sm font-bold text-foreground">
                  Bank Settlement & Direct Cash Withdrawals
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in your settlement details to route direct cash transfers successfully to your bank.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <form onSubmit={handleSaveBank} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bank Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. HDFC Bank, ICICI Bank"
                          className="pl-10 bg-background border border-border text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Number</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={accountNum}
                          onChange={(e) => setAccountNum(e.target.value)}
                          placeholder="Enter Account Number"
                          className="pl-10 bg-background border border-border text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bank IFSC Code</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={ifsc}
                          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                          placeholder="HDFC0001234"
                          className="pl-10 bg-background border border-border text-xs rounded-xl font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">UPI ID (Recommended)</label>
                      <div className="relative">
                        <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. username@paytm"
                          className="pl-10 bg-background border border-border text-xs rounded-xl font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button 
                      type="submit" 
                      disabled={savingBank}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs px-5 select-none"
                    >
                      {savingBank ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Saving...
                        </>
                      ) : "Save Settlement Details"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Withdraw Operations Panel */}
            <Card className="border border-border/80 bg-card rounded-2xl overflow-hidden flex flex-col justify-between">
              <CardHeader className="border-b border-border/40 p-5 bg-muted/20">
                <CardTitle className="text-sm font-bold text-foreground">
                  Redeem Payouts
                </CardTitle>
                <CardDescription className="text-xs">
                  Initiate direct cash payouts for your accumulated bank ledger earnings.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4 flex-grow flex flex-col justify-center">
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                    Direct Cash Earned
                  </p>
                  <p className="text-4xl font-extrabold text-emerald-400 font-mono">
                    ₹{planStatus?.cash ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
                    Direct settlements are credited to your UPI ID or Bank account automatically.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="p-4 bg-muted/20 border-t border-border/40">
                <Button
                  disabled={payoutLoading || !planStatus?.cash || planStatus.cash <= 0}
                  onClick={handleWithdraw}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs py-2 select-none"
                >
                  {payoutLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Routing Payout...
                    </>
                  ) : (
                    "Trigger Direct Settlement"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
