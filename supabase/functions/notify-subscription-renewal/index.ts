import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-RENEWALS] ${step}${detailsStr}`);
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

    logStep("Iniciando verificação de renovações de assinaturas");

    // Usar timezone de Brasília para garantir data correta
    const today = new Date();
    const brasiliaOffset = -3; // UTC-3
    const brasiliaTime = new Date(today.getTime() + (brasiliaOffset * 60 * 60 * 1000));
    const currentDay = brasiliaTime.getDate();
    const todayString = brasiliaTime.toISOString().split('T')[0];

    logStep("Data de processamento", { 
      utcDate: today.toISOString().split('T')[0],
      brasiliaDate: todayString,
      currentDay 
    });

    // Buscar todas as assinaturas que vencem hoje
    const { data: subscriptionsToday, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('renewal_day', currentDay);

    if (subscriptionError) {
      logStep("Erro ao buscar assinaturas", { error: subscriptionError });
      throw subscriptionError;
    }

    logStep(`Encontradas ${subscriptionsToday?.length || 0} assinaturas para renovação hoje`);

    for (const subscription of subscriptionsToday || []) {
      // Buscar todos os usuários que devem receber notificação (proprietário + contas compartilhadas)
      const { data: sharedAccounts } = await supabaseClient
        .from('shared_accounts')
        .select('shared_with_id')
        .eq('owner_id', subscription.user_id)
        .eq('status', 'accepted');

      // Lista de todos os user_ids que devem receber notificação
      const usersToNotify = [
        subscription.user_id, // Proprietário da conta
        ...(sharedAccounts?.map(sa => sa.shared_with_id) || []) // Usuários compartilhados
      ];

      logStep(`Usuários para notificar sobre assinatura ${subscription.name}`, { 
        owner: subscription.user_id,
        shared: sharedAccounts?.map(sa => sa.shared_with_id) || [],
        total: usersToNotify.length
      });

      for (const userId of usersToNotify) {
        // Verificar se já existe notificação para esta assinatura hoje para este usuário
        const { data: existingNotification } = await supabaseClient
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'subscription')
          .eq('reference_id', subscription.id)
          .gte('created_at', todayString + 'T00:00:00.000Z')
          .lte('created_at', todayString + 'T23:59:59.999Z')
          .limit(1);

        if (existingNotification && existingNotification.length > 0) {
          logStep("Notificação já enviada para assinatura", { 
            subscriptionName: subscription.name,
            userId: userId
          });
          continue;
        }

        // Criar notificação de renovação
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Assinatura será renovada hoje',
            message: `A assinatura ${subscription.name} será renovada em breve por R$ ${Number(subscription.amount).toFixed(2)}`,
            type: 'subscription',
            reference_id: subscription.id,
            reference_type: 'subscription',
            navigation_data: {
              subscription_id: subscription.id,
              subscription_name: subscription.name,
              amount: subscription.amount,
              renewal_day: subscription.renewal_day,
              frequency: subscription.frequency
            }
          });

        if (notificationError) {
          logStep("Erro ao criar notificação", { error: notificationError, subscription: subscription.name, userId });
        } else {
          // Enviar notificação push
          try {
            await supabaseClient.functions.invoke('send-push-notification', {
              body: {
                user_id: userId,
                title: "Renovação de Assinatura",
                body: `${subscription.name} será renovada em breve por R$ ${Number(subscription.amount).toFixed(2)}`,
                data: { 
                  type: 'subscription', 
                  subscription_id: subscription.id,
                  action: 'renewal_notification' 
                }
              }
            });
            logStep("Notificação push enviada", { 
              userId: userId, 
              subscriptionName: subscription.name 
            });
          } catch (pushError) {
            logStep("Erro ao enviar push notification", { error: pushError, userId });
          }

          logStep("Notificação de renovação criada", { 
            subscriptionName: subscription.name,
            userId: userId,
            amount: subscription.amount
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Verificação de renovações concluída",
      subscriptions_notified: subscriptionsToday?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep("ERRO no processamento", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});