import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import admin from "firebase-admin";
import { readFileSync } from "fs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (serviceAccountPath) {
  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("Firebase Admin inicializado com service account");
  } catch (err) {
    console.warn("Aviso: serviceAccountKey.json não encontrado em", serviceAccountPath);
    console.warn("Webhook e verificação de pagamento não funcionarão sem ele.");
  }
}

let PRICE_IDS: Record<string, { plan: string; interval: string }> = {};

async function loadStripePrices() {
  try {
    const prices = await stripe.prices.list({ active: true, limit: 100 });
    const mapping: Record<string, { plan: string; interval: string }> = {};
    for (const p of prices.data) {
      const product = await stripe.products.retrieve(p.product as string);
      const planName = product.metadata?.plan || product.name.toLowerCase();
      const interval = p.recurring?.interval || 'month';
      mapping[p.id] = { plan: planName, interval };
    }
    PRICE_IDS = mapping;
    console.log(`[Stripe] ${Object.keys(mapping).length} preços carregados dinamicamente`);
  } catch (err) {
    console.warn('[Stripe] Não foi possível carregar preços automaticamente:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Webhook precisa do body raw (antes do json parser)
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ error: "Webhook secret não configurado" });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Erro na assinatura do webhook:", err.message);
      return res.status(400).json({ error: "Assinatura inválida" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.uid;
      const shopId = session.metadata?.shopId;
      const plan = session.metadata?.plan;

      if (uid && shopId && plan && admin.apps.length) {
        try {
          await admin.firestore().doc(`barbershops/${shopId}`).update({
            plan,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Plano ${plan} ativado para barbearia ${shopId}`);
        } catch (err) {
          console.error("Erro ao atualizar Firestore no webhook:", err);
        }
      }
    }

    res.json({ received: true });
  });

  // JSON parser para as demais rotas
  app.use(express.json());

  // Criar sessão de checkout
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { priceId, uid, shopId } = req.body;

      if (!priceId || !uid || !shopId) {
        return res.status(400).json({ error: "Parâmetros obrigatórios: priceId, uid, shopId" });
      }

      const priceConfig = PRICE_IDS[priceId];
      const plan = priceConfig?.plan || "pro";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: uid,
        metadata: { uid, shopId, plan },
        success_url: `${req.headers.origin}/#/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/#/checkout/cancel`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Erro ao criar checkout:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Verificar sessão de checkout
  app.get("/api/verify-checkout", async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== "string") {
        return res.json({ success: false, error: "session_id obrigatório" });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid" || session.status === "complete") {
        const uid = session.metadata?.uid;
        const shopId = session.metadata?.shopId;
        const plan = session.metadata?.plan;

        if (uid && shopId && plan && admin.apps.length) {
          await admin.firestore().doc(`barbershops/${shopId}`).update({
            plan,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return res.json({ success: true, plan });
      }

      res.json({ success: false, error: "Pagamento não confirmado" });
    } catch (err: any) {
      res.json({ success: false, error: err.message });
    }
  });

  // Listar preços do Stripe (para popular PRICE_IDS dinamicamente)
  app.get("/api/stripe-prices", async (_req, res) => {
    try {
      const prices = await stripe.prices.list({
        active: true,
        expand: ["data.product"],
      });
      res.json(prices.data.map(p => ({
        id: p.id,
        product: (p.product as Stripe.Product).name,
        amount: p.unit_amount ? p.unit_amount / 100 : 0,
        currency: p.currency,
        interval: p.recurring?.interval || null,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await loadStripePrices();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
