import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    const { token: pushToken, platform } = await req.json();

    console.log(`💾 Salvando token push para usuário ${user.id} na plataforma ${platform}`);

    // Save or update push token in fcm_tokens table (standardized)
    const { error } = await supabaseClient
      .from("fcm_tokens")
      .upsert({
        user_id: user.id,
        token: pushToken,
        platform: platform || 'unknown',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });

    if (error) {
      console.error("Erro ao salvar token:", error);
      throw error;
    }

    console.log(`✅ Token push salvo com sucesso para ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Token saved successfully" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error saving push token:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});