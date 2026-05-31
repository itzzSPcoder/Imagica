import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";
import { db, sketchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Locate local plans file for persistence
const LOCAL_PLANS_FILE = path.resolve(process.cwd(), ".local", "imagica-plans.json");

interface PlanState {
  plan: "free" | "pro" | "enterprise" | "weekly" | "monthly" | "yearly";
  updatedAt: string;
}

function readPlans(): Record<string, PlanState> {
  try {
    if (fs.existsSync(LOCAL_PLANS_FILE)) {
      const data = fs.readFileSync(LOCAL_PLANS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to read local plans database, using in-memory state");
  }
  return {};
}

function writePlans(plans: Record<string, PlanState>) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_PLANS_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_PLANS_FILE, JSON.stringify(plans, null, 2));
  } catch (err) {
    logger.error({ err }, "Failed to save plan status persistently");
  }
}

// Fetch user plan status
const LOCAL_MARKETPLACE_FILE = path.resolve(process.cwd(), ".local", "imagica-marketplace.json");

interface UserWallet {
  credits: number;
  cash: number;
  bankDetails: {
    bankName: string;
    accountNum: string;
    ifsc: string;
    upiId: string;
  };
}

interface DesignListing {
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

interface MarketplaceState {
  users: Record<string, UserWallet>;
  listings: Record<string, DesignListing>;
}

function readMarketplace(): MarketplaceState {
  try {
    if (fs.existsSync(LOCAL_MARKETPLACE_FILE)) {
      const data = fs.readFileSync(LOCAL_MARKETPLACE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    logger.warn({ err }, "Failed to read local marketplace file");
  }
  return { users: {}, listings: {} };
}

function writeMarketplace(state: MarketplaceState) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_MARKETPLACE_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_MARKETPLACE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    logger.error({ err }, "Failed to save marketplace persistently");
  }
}

function getUserWallet(state: MarketplaceState, userId: string): UserWallet {
  if (!state.users[userId]) {
    state.users[userId] = {
      credits: 250, // Welcome gift of 250 credits to play around with the buying feature!
      cash: 0,
      bankDetails: {
        bankName: "",
        accountNum: "",
        ifsc: "",
        upiId: ""
      }
    };
  }
  return state.users[userId];
}

router.get("/payments/plan", async (req, res): Promise<void> => {
  const userId = (req.headers["x-user-id"] || "default-user") as string;

  const plans = readPlans();
  const userPlan = plans[userId]?.plan || "free";

  // Count sketch conversions created by the system
  const allSketches = await db.select().from(sketchesTable);
  const conversionsUsed = allSketches.length;
  
  let conversionsLimit = 3;
  if (userPlan === "weekly") {
    conversionsLimit = 20;
  } else if (userPlan === "monthly") {
    conversionsLimit = 100;
  } else if (userPlan === "yearly") {
    conversionsLimit = 99999;
  } else if (userPlan === "pro") {
    conversionsLimit = 99999;
  } else if (userPlan === "enterprise") {
    conversionsLimit = 999999;
  }

  // Retrieve wallet details from marketplace state
  const mState = readMarketplace();
  const wallet = getUserWallet(mState, userId);

  res.json({
    plan: userPlan,
    userId,
    conversionsUsed,
    conversionsLimit,
    credits: wallet.credits,
    cash: wallet.cash,
    bankDetails: wallet.bankDetails
  });
});

// Redeem plan using Imagica Credits
router.post("/payments/buy-with-credits", async (req, res): Promise<void> => {
  const userId = (req.headers["x-user-id"] || "default-user") as string;
  const { plan } = req.body;

  if (!["weekly", "monthly", "yearly"].includes(plan)) {
    res.status(400).json({ error: "Invalid plan type for credit redemption" });
    return;
  }

  let creditCost = 150;
  if (plan === "monthly") creditCost = 500;
  else if (plan === "yearly") creditCost = 4000;

  const mState = readMarketplace();
  const wallet = getUserWallet(mState, userId);

  if (wallet.credits < creditCost) {
    res.status(400).json({ error: `Insufficient credits. This plan costs ${creditCost} Credits, but you only have ${wallet.credits} Credits.` });
    return;
  }

  // Deduct credits
  wallet.credits -= creditCost;
  writeMarketplace(mState);

  // Activate plan
  const plans = readPlans();
  plans[userId] = {
    plan,
    updatedAt: new Date().toISOString()
  };
  writePlans(plans);

  res.json({
    success: true,
    plan,
    creditsRemaining: wallet.credits
  });
});

// Get all listed designs in the marketplace
router.get("/marketplace", async (req, res): Promise<void> => {
  const mState = readMarketplace();
  res.json(Object.values(mState.listings));
});

// List design/sketch for sale on the marketplace
router.post("/marketplace/list", async (req, res): Promise<void> => {
  const userId = (req.headers["x-user-id"] || "default-user") as string;
  const { sketchId, price } = req.body;

  if (!sketchId || !price || price <= 0) {
    res.status(400).json({ error: "Invalid sketchId or listing price" });
    return;
  }

  const [sketch] = await db.select().from(sketchesTable).where(eq(sketchesTable.id, parseInt(sketchId)));
  if (!sketch) {
    res.status(404).json({ error: "Sketch not found to list on marketplace" });
    return;
  }

  const mState = readMarketplace();
  mState.listings[sketchId.toString()] = {
    sketchId: sketch.id,
    title: sketch.title,
    imageDataUrl: sketch.imageDataUrl,
    generatedCode: sketch.generatedCode,
    price: parseInt(price),
    sellerId: userId,
    sellerName: "Creator #" + userId.slice(-4),
    createdAt: new Date().toISOString(),
    salesCount: 0
  };

  writeMarketplace(mState);
  res.json({ success: true, listing: mState.listings[sketchId.toString()] });
});

// Buy a listed design
router.post("/marketplace/buy", async (req, res): Promise<void> => {
  const buyerId = (req.headers["x-user-id"] || "default-user") as string;
  const { sketchId } = req.body;

  if (!sketchId) {
    res.status(400).json({ error: "Missing sketchId to purchase" });
    return;
  }

  const mState = readMarketplace();
  const listing = mState.listings[sketchId.toString()];

  if (!listing) {
    res.status(404).json({ error: "Marketplace listing not found" });
    return;
  }

  if (listing.sellerId === buyerId) {
    res.status(400).json({ error: "You cannot purchase your own listed design." });
    return;
  }

  // Deduct price from buyer's credits (1 INR = 1 Credit for simulated purchases)
  const buyerWallet = getUserWallet(mState, buyerId);
  if (buyerWallet.credits < listing.price) {
    res.status(400).json({ error: `Insufficient Credits to buy this layout. Cost: ${listing.price} Credits, Current: ${buyerWallet.credits} Credits.` });
    return;
  }

  buyerWallet.credits -= listing.price;

  // Process 60% credits / 40% cash revenue split to the seller
  const sellerId = listing.sellerId;
  const sellerWallet = getUserWallet(mState, sellerId);

  const tokensSplit = Math.round(listing.price * 0.60);
  const cashSplit = Math.round(listing.price * 0.40);

  sellerWallet.credits += tokensSplit;
  sellerWallet.cash += cashSplit;
  listing.salesCount += 1;

  writeMarketplace(mState);

  res.json({
    success: true,
    message: "Purchase completed successfully.",
    buyerCreditsRemaining: buyerWallet.credits
  });
});

// Update user bank/UPI settlement details
router.post("/marketplace/bank-details", async (req, res): Promise<void> => {
  const userId = (req.headers["x-user-id"] || "default-user") as string;
  const { bankName, accountNum, ifsc, upiId } = req.body;

  const mState = readMarketplace();
  const wallet = getUserWallet(mState, userId);

  wallet.bankDetails = {
    bankName: bankName || "",
    accountNum: accountNum || "",
    ifsc: ifsc || "",
    upiId: upiId || ""
  };

  writeMarketplace(mState);
  res.json({ success: true, bankDetails: wallet.bankDetails });
});

// Create checkout session (Stripe integration + simulated sandbox redirect)
router.post("/payments/checkout", async (req, res): Promise<void> => {
  const userId = (req.headers["x-user-id"] || "default-user") as string;
  const { plan } = req.body;
  const selectedPlan = plan || "monthly";
  const isSimulation = !process.env.STRIPE_SECRET_KEY;

  if (isSimulation) {
    logger.info({ userId, selectedPlan }, "Stripe secret key not found. Initializing checkout session in simulation mode.");
    
    // In simulation mode, we redirect to our beautiful interactive frontend checkout simulation page
    res.json({
      url: `/checkout-simulation?userId=${encodeURIComponent(userId)}&plan=${encodeURIComponent(selectedPlan)}`,
      sessionId: `mock_session_${Date.now()}`,
    });
    return;
  }

  try {
    // Real Stripe Integration
    const stripeModule = await import("stripe");
    const StripeClass = stripeModule.default;
    const stripe = new StripeClass(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-01-27.acacia" as any,
    });

    const host = req.headers.origin || "http://localhost:25383";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Imagica Pro Plan Subscription",
              description: "Unlimited sketch-to-component conversions, priority Gemini 2.5 Pro streaming, and premium StackBlitz sandbox exporting.",
              images: ["https://imagicasite.xyz/logo.png"],
            },
            unit_amount: 2900, // $29.00
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${host}/checkout-success?session_id={CHECKOUT_SESSION_ID}&userId=${encodeURIComponent(userId)}`,
      cancel_url: `${host}/pricing`,
      metadata: {
        userId,
      },
    });

    res.json({
      url: session.url!,
      sessionId: session.id,
    });
  } catch (err: any) {
    logger.error({ err }, "Stripe checkout session creation failed");
    res.status(500).json({ error: "Failed to initialize payment gateway checkout" });
  }
});

// Update plan status (mock callback or webhook confirmation endpoint)
router.post("/payments/activate", async (req, res): Promise<void> => {
  const { userId, plan } = req.body;

  if (!userId || !["free", "pro", "enterprise", "weekly", "monthly", "yearly"].includes(plan)) {
    res.status(400).json({ error: "Invalid request body parameters" });
    return;
  }

  const plans = readPlans();
  plans[userId] = {
    plan,
    updatedAt: new Date().toISOString(),
  };
  writePlans(plans);

  logger.info({ userId, plan }, "Payment gateway activated user subscription plan");
  res.json({ success: true, plan });
});

export default router;
