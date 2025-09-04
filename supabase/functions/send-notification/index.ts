import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.2.0";
import { getUsersToNotify } from "../_shared/notification-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  userId: string; // Representa o owner_id da conta
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Generate access token using jose library
const generateAccessToken = async (serviceAccount: any): Promise<string> => {
  try {
    let privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n');
    const privateKey = await importPKCS8(privateKeyPem, 'RS256');
    const jwt = await new SignJWT({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth2 failed: ${response.status} ${errorText}`);
    }
    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error("❌ Error generating access token:", error);
    throw error;
  }
};

const sendFirebaseNotification = async (token: string, payload: NotificationPayload, accessToken: string, projectId: string): Promise<boolean> => {
  const message = {
    message: {
      token: token,
      notification: { title: payload.title, body: payload.body },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channel_id: "finaudy_channel",
          default_sound: true,
          default_vibrate_timings: true,
          default_light_settings: true,
        },
      },
      data: payload.data ? Object.fromEntries(
        Object.entries(payload.data).map(([key, value]) => [key, String(value)])
      ) : {},
    },
  };

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (response.ok) {
    console.log(`✅ FCM notification sent successfully to token: ${token.substring(0, 20)}...`);
    return true;
  } else {
    const errorText = await response.text();
    console.error(`❌ FCM API error for token ${token.substring(0, 20)}...:`, response.status, errorText);
    return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const payload: NotificationPayload = await req.json();
    const { userId: ownerId, title, body } = payload;

    if (!ownerId || !title || !body) {
      return new Response(JSON.stringify({ error: "userId (ownerId), title, and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestId = `${ownerId}-${Date.now()}`;
    console.log(`🔔 [${requestId}] Received notification request for account owner: ${ownerId}`);

    const userIdsToNotify = await getUsersToNotify(supabaseClient, ownerId);
    if (userIdsToNotify.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No users to notify." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokens, error: tokenError } = await supabaseClient
      .from("fcm_tokens")
      .select("token, user_id")
      .in("user_id", userIdsToNotify)
      .eq("platform", "android");

    if (tokenError) throw tokenError;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active tokens found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const serviceAccountKey = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountKey) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY not configured");
    
    const serviceAccount = JSON.parse(serviceAccountKey);
    const accessToken = await generateAccessToken(serviceAccount);

    const sendPromises = tokens.map(tokenInfo => 
      sendFirebaseNotification(tokenInfo.token, payload, accessToken, serviceAccount.project_id)
        .then(sent => ({ ...tokenInfo, sent }))
    );

    const results = await Promise.all(sendPromises);
    
    const dbInsertions = results.map(result => ({
      user_id: result.user_id,
      title: payload.title,
      body: payload.body,
      platform: "android",
      data: payload.data,
      push_token: result.token,
      status: result.sent ? "sent" : "failed",
      sent_at: result.sent ? new Date().toISOString() : null,
    }));

    await supabaseClient.from("push_notifications").insert(dbInsertions);

    const successCount = results.filter(r => r.sent).length;
    console.log(`[${requestId}] Final result: ${successCount}/${tokens.length} notifications sent successfully.`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${tokens.length} devices for the account.`,
      data: { sent: successCount, total: tokens.length },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Function error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});