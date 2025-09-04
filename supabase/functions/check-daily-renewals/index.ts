import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CHECK-RENEWALS] Iniciando verificação de renovações diárias');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Obter data atual no fuso horário de Brasília
    const now = new Date();
    const brasiliaOffset = -3; // UTC-3
    const brasiliaTime = new Date(now.getTime() + (brasiliaOffset * 60 * 60 * 1000));
    const currentDate = brasiliaTime.toISOString().split('T')[0];
    const currentDay = brasiliaTime.getDate();

    console.log('[CHECK-RENEWALS] Data de verificação', { 
      utcDate: now.toISOString().split('T')[0],
      brasiliaDate: currentDate,
      currentDay 
    });

    // Buscar assinaturas que devem ser renovadas hoje
    const { data: subscriptions, error: subscriptionsError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .or(`renewal_date.eq.${currentDate},renewal_day.eq.${currentDay}`)
      .order('created_at', { ascending: true });

    if (subscriptionsError) {
      console.error('[CHECK-RENEWALS] Erro ao buscar assinaturas:', subscriptionsError);
      throw subscriptionsError;
    }

    console.log('[CHECK-RENEWALS] Assinaturas encontradas para renovação:', subscriptions?.length || 0);

    let subscriptionsProcessed = 0;
    let notificationsSent = 0;

    for (const subscription of subscriptions || []) {
      try {
        // Verificar se já foi renovada hoje
        const lastCharged = subscription.last_charged ? new Date(subscription.last_charged) : null;
        const today = new Date(currentDate);
        
        if (lastCharged && lastCharged.toDateString() === today.toDateString()) {
          console.log('[CHECK-RENEWALS] Assinatura já renovada hoje', {
            subscriptionId: subscription.id,
            name: subscription.name,
            lastCharged: lastCharged.toISOString()
          });
          continue;
        }

        console.log('[CHECK-RENEWALS] Processando renovação da assinatura', {
          subscriptionId: subscription.id,
          userId: subscription.user_id,
          name: subscription.name,
          amount: subscription.amount,
          frequency: subscription.frequency
        });

        // Enviar notificação push
        try {
          const { error: pushError } = await supabaseClient.functions.invoke('send-push-notification', {
            body: {
              user_id: subscription.user_id,
              title: 'Assinatura Renovada',
              body: `${subscription.name} será renovada em breve por R$ ${subscription.amount.toFixed(2)}`,
              data: {
                type: 'subscription_renewal',
                subscription_id: subscription.id,
                amount: subscription.amount,
                name: subscription.name
              }
            }
          });

          if (pushError) {
            console.error('[CHECK-RENEWALS] Erro ao enviar notificação push:', pushError);
          } else {
            console.log('[CHECK-RENEWALS] Notificação push enviada com sucesso', {
              userId: subscription.user_id,
              subscriptionName: subscription.name
            });
            notificationsSent++;
          }
        } catch (pushNotificationError) {
          console.error('[CHECK-RENEWALS] Erro no envio de notificação push:', pushNotificationError);
        }

        // Criar notificação in-app
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: subscription.user_id,
            title: 'Assinatura Renovada',
            message: `${subscription.name} será renovada em breve por R$ ${subscription.amount.toFixed(2)}`,
            type: 'subscription',
            reference_id: subscription.id,
            reference_type: 'subscription'
          });

        if (notificationError) {
          console.error('[CHECK-RENEWALS] Erro ao criar notificação in-app:', notificationError);
        }

        // Calcular próxima data de renovação
        let nextRenewalDate = new Date(currentDate);
        
        switch (subscription.frequency) {
          case 'daily':
            nextRenewalDate.setDate(nextRenewalDate.getDate() + 1);
            break;
          case 'weekly':
            nextRenewalDate.setDate(nextRenewalDate.getDate() + 7);
            break;
          case 'monthly':
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
            break;
          case 'semiannually':
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 6);
            break;
          case 'annually':
            nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
            break;
          default:
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
        }

        // Atualizar assinatura com nova data de renovação
        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .update({
            last_charged: new Date().toISOString(),
            renewal_date: nextRenewalDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error('[CHECK-RENEWALS] Erro ao atualizar assinatura:', updateError);
        } else {
          console.log('[CHECK-RENEWALS] Assinatura atualizada com sucesso', {
            subscriptionId: subscription.id,
            nextRenewalDate: nextRenewalDate.toISOString().split('T')[0]
          });
        }

        subscriptionsProcessed++;

      } catch (subscriptionError) {
        console.error('[CHECK-RENEWALS] Erro ao processar assinatura:', subscriptionError, {
          subscriptionId: subscription.id,
          userId: subscription.user_id
        });
      }
    }

    const result = {
      subscriptionsProcessed,
      notificationsSent,
      processedDate: currentDate
    };

    console.log('[CHECK-RENEWALS] Verificação concluída', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[CHECK-RENEWALS] Erro geral:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});