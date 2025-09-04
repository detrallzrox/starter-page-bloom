import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check current subscription status
    const { data: subscriber } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Lógica especial para email de teste
    let isPremium = false;
    let subscriptionEnd = null;
    let inTrial = false;
    let isVip = false;
    let subscriptionTier = null;

    // Email especial para VIP eterno
    if (user.email === 'allan@asmoreira.com.br') {
      isPremium = true;
      isVip = true;
      subscriptionTier = 'vip';
      subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      logStep("VIP eternal email detected - setting as VIP", { email: user.email });
    } else if (user.email === 'detrallzrox@gmail.com') {
      isPremium = true;
      subscriptionTier = 'premium';
      subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      logStep("Premium eternal email detected - setting as Premium", { email: user.email });
    } else {
      // Para outras contas, verificar se há assinatura válida e se não expirou
      if (subscriber && subscriber.subscription_end) {
        const now = new Date();
        const endDate = new Date(subscriber.subscription_end);
        
        if (endDate > now) {
          // Assinatura ainda válida
          isPremium = true;
          subscriptionEnd = subscriber.subscription_end;
          isVip = subscriber.is_vip || false;
          subscriptionTier = subscriber.subscription_tier;
          logStep("Active subscription found", { tier: subscriptionTier, endDate: subscriptionEnd });
        } else {
          // Assinatura expirou - todos os tiers vão para Gratuito
          const currentTier = subscriber.subscription_tier;
          
          isPremium = false;
          subscriptionTier = null;
          isVip = false;
          subscriptionEnd = null;
          
          if (currentTier === 'vip') {
            logStep("VIP subscription expired - downgraded to Free", { previousTier: currentTier });
          } else if (currentTier === 'premium') {
            logStep("Premium subscription expired - downgraded to Free", { previousTier: currentTier });
          } else {
            logStep("Subscription expired - remains free", { previousTier: currentTier });
          }
        }
      } else {
        // Não tem assinatura
        isPremium = false;
        subscriptionTier = null;
        isVip = false;
        subscriptionEnd = null;
        logStep("No subscription found - setting as free", { email: user.email });
      }
    }

    // Atualizar registro do subscriber
    if (user.email === 'allan@asmoreira.com.br') {
      // Para email VIP eterno - marcar como VIP
      await supabaseClient
        .from("subscribers")
        .upsert({
          user_id: user.id,
          email: user.email,
          subscribed: true, // VIP ativo
          subscription_tier: 'vip', // Tier VIP
          is_vip: true, // Marcar como VIP
          vip_eternal: true, // VIP eterno
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } else if (user.email === 'detrallzrox@gmail.com') {
      // Para email Premium eterno (para testes) - marcar como Premium
      await supabaseClient
        .from("subscribers")
        .upsert({
          user_id: user.id,
          email: user.email,
          subscribed: true, // Premium ativo
          subscription_tier: 'premium', // Tier Premium
          is_vip: false, // Não é VIP
          vip_eternal: false, // Não é VIP eterno
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    } else {
      // Para todas as outras contas - usar valores calculados baseados na verificação de expiração
      await supabaseClient
        .from("subscribers")
        .upsert({
          user_id: user.id,
          email: user.email,
          subscribed: isPremium,
          subscription_tier: subscriptionTier,
          is_vip: isVip,
          vip_eternal: false, // Apenas VIP eterno não expira
          subscription_end: subscriptionEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }

    logStep("Subscription check completed", { 
      isPremium, 
      inTrial,
      subscriptionEnd 
    });

    return new Response(JSON.stringify({
      isPremium,
      inTrial,
      subscribed: isPremium,
      subscriptionEnd,
      isVip,
      subscriptionTier
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      isPremium: false,
      inTrial: false,
      subscribed: false,
      isVip: false,
      subscriptionTier: null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});