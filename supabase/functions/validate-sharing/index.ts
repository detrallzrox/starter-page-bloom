import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-SHARING] ${step}${detailsStr}`);
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

    const { invited_email } = await req.json();
    if (!invited_email) throw new Error("Invited email is required");

    // Check owner's subscription status
    const { data: ownerSubscriber } = await supabaseClient
      .from("subscribers")
      .select("subscribed, trial_end")
      .eq("user_id", user.id)
      .single();

    const now = new Date();
    const ownerTrialEnd = ownerSubscriber?.trial_end ? new Date(ownerSubscriber.trial_end) : null;
    const ownerInTrial = ownerSubscriber && ownerTrialEnd && now < ownerTrialEnd && !ownerSubscriber?.subscribed;
    const ownerIsPremium = ownerSubscriber?.subscribed || false;

    logStep("Owner subscription status", { 
      ownerIsPremium, 
      ownerInTrial,
      trialEnd: ownerTrialEnd?.toISOString()
    });

    // Get invited user info
    const { data: invitedUserData } = await supabaseClient
      .rpc('get_user_by_email', { email_to_search: invited_email });

    if (invitedUserData && invitedUserData.length > 0) {
      const invitedUserId = invitedUserData[0].id;
      
      // Check invited user's subscription status
      const { data: invitedSubscriber } = await supabaseClient
        .from("subscribers")
        .select("subscribed, trial_end")
        .eq("user_id", invitedUserId)
        .single();

      const invitedTrialEnd = invitedSubscriber?.trial_end ? new Date(invitedSubscriber.trial_end) : null;
      const invitedInTrial = invitedSubscriber && invitedTrialEnd && now < invitedTrialEnd && !invitedSubscriber?.subscribed;
      const invitedIsPremium = invitedSubscriber?.subscribed || false;

      logStep("Invited user subscription status", { 
        invitedIsPremium, 
        invitedInTrial,
        trialEnd: invitedTrialEnd?.toISOString()
      });

    // Todas as contas são agora gratuitas, compartilhamento sempre permitido
    logStep("All accounts are free, sharing always allowed");
    }

    logStep("Sharing validation passed");

    return new Response(JSON.stringify({
      success: true,
      message: "Compartilhamento permitido"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in validate-sharing", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});