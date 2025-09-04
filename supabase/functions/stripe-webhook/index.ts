import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeWebhookSecret) {
    console.error("Stripe webhook secret is not set.");
    return new Response("Webhook secret not configured.", { status: 500 });
  }

  let receivedEvent;
  try {
    receivedEvent = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      stripeWebhookSecret
    );
  } catch (err) {
    console.error("Error constructing Stripe event:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Received Stripe event: ${receivedEvent.type}`);

  if (receivedEvent.type === "checkout.session.completed") {
    const session = receivedEvent.data.object;
    const customerEmail = session.customer_details?.email;
    const subscriptionId = session.subscription;

    if (!customerEmail || !subscriptionId) {
      console.error("Missing customer email or subscription ID in session.");
      return new Response("Missing data in session.", { status: 400 });
    }

    try {
      // Busca o usuário no Supabase pelo email
      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", customerEmail)
        .single();

      if (userError || !userData) {
        throw new Error(`User not found for email: ${customerEmail}`);
      }
      const userId = userData.id;

      // Busca a assinatura no Stripe para saber o plano
      const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
      const priceId = subscription.items.data.price.id;
      
      // Lógica para determinar o plano (ajuste os price_ids se necessário)
      const premiumPriceId = Deno.env.get("STRIPE_PREMIUM_PRICE_ID"); // ex: price_123...
      const vipPriceId = Deno.env.get("STRIPE_VIP_PRICE_ID"); // ex: price_456...
      
      let tier = null;
      if (priceId === premiumPriceId) tier = 'premium';
      if (priceId === vipPriceId) tier = 'vip';

      if (!tier) {
        throw new Error(`Price ID ${priceId} does not match known plans.`);
      }

      // Atualiza a tabela de assinantes no Supabase
      const { error: updateError } = await supabaseAdmin
        .from("subscribers")
        .upsert({
          user_id: userId,
          email: customerEmail,
          subscribed: true,
          subscription_tier: tier,
          is_vip: tier === 'vip',
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        throw new Error(`Failed to update subscriber table: ${updateError.message}`);
      }

      console.log(`Successfully activated ${tier} subscription for user ${userId}`);

    } catch (e) {
      console.error("Error processing checkout session:", e.message);
      return new Response(`Webhook handler error: ${e.message}`, { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});