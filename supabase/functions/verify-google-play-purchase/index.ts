import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import { google } from 'https://esm.sh/googleapis@105.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting Google Play purchase verification');
    
    const { purchaseToken, subscriptionId } = await req.json();
    
    if (!purchaseToken || !subscriptionId) {
      console.error('❌ Missing required fields: purchaseToken or subscriptionId');
      return new Response(JSON.stringify({ error: 'Missing purchaseToken or subscriptionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📱 Verifying purchase - Subscription: ${subscriptionId}, Token: ${purchaseToken.substring(0, 20)}...`);

    // Initialize Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError?.message);
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`👤 Authenticated user: ${user.id}`);

    // Get Google Play service account credentials
    const serviceAccountKey = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_KEY');
    const packageName = Deno.env.get('ANDROID_PACKAGE_NAME');
    
    if (!serviceAccountKey || !packageName) {
      console.error('❌ Missing Google Play configuration');
      return new Response(JSON.stringify({ error: 'Google Play configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Configure Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(serviceAccountKey),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: auth,
    });

    console.log('🔐 Google Auth configured, verifying purchase with Google servers...');

    // Verify subscription with Google servers
    const res = await androidPublisher.purchases.subscriptions.get({
      packageName: packageName,
      subscriptionId: subscriptionId,
      token: purchaseToken,
    });

    console.log(`✅ Google API Response Status: ${res.status}`);
    console.log(`📊 Purchase data:`, JSON.stringify(res.data, null, 2));

    // Check if verification was successful
    if (res.status === 200 && res.data) {
      const purchaseData = res.data;
      
      // Check if subscription is valid (not expired, not cancelled)
      const isValid = purchaseData.paymentState === 1; // 1 = received, 0 = pending
      const isActive = !purchaseData.cancelReason && !purchaseData.expiryTimeMillis || 
                      (purchaseData.expiryTimeMillis && parseInt(purchaseData.expiryTimeMillis) > Date.now());

      console.log(`🔍 Subscription validation - Valid: ${isValid}, Active: ${isActive}`);

      if (!isValid || !isActive) {
        console.warn('⚠️ Subscription is not valid or active');
        return new Response(JSON.stringify({ 
          error: 'Subscription is not active or payment is pending',
          details: {
            paymentState: purchaseData.paymentState,
            cancelReason: purchaseData.cancelReason,
            expiryTime: purchaseData.expiryTimeMillis
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Determine subscription tier
      const newTier = subscriptionId.includes('vip') ? 'vip' : 'premium';
      console.log(`🎯 Setting subscription tier to: ${newTier}`);

      // Initialize admin Supabase client for database updates
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Update subscriber status
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('subscribers')
        .upsert({
          user_id: user.id,
          email: user.email || '',
          subscribed: true,
          subscription_tier: newTier,
          is_vip: newTier === 'vip',
          subscription_end: new Date(parseInt(purchaseData.expiryTimeMillis || '0')).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Database update failed:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update subscription status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Subscription status updated successfully');

      // Create success notification
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Assinatura Ativada',
          message: `Sua assinatura ${newTier === 'vip' ? 'VIP' : 'Premium'} foi ativada com sucesso!`,
          type: 'subscription'
        });

      return new Response(JSON.stringify({ 
        success: true, 
        tier: newTier,
        message: 'Subscription verified and activated successfully',
        expiryDate: purchaseData.expiryTimeMillis
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      console.error('❌ Google API verification failed');
      return new Response(JSON.stringify({ error: 'Purchase verification failed with Google' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('💥 Error in verify-google-play-purchase function:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Verification failed';
    if (error.message.includes('invalid_grant')) {
      errorMessage = 'Google Play service account credentials are invalid';
    } else if (error.message.includes('Invalid Value')) {
      errorMessage = 'Invalid purchase token or subscription ID';
    } else if (error.message.includes('The subscription purchase token is invalid')) {
      errorMessage = 'Purchase token is invalid or expired';
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});