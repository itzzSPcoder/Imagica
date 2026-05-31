import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";
import { db, sketchesTable } from "@workspace/db";
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

  res.json({
    plan: userPlan,
    userId,
    conversionsUsed,
    conversionsLimit,
  });
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
