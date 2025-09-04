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

    console.log("🔍 Verificando assinaturas em atraso...");

    // Buscar todas as assinaturas
    const { data: subscriptions, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('*');

    if (subscriptionError) {
      console.error("Erro ao buscar assinaturas:", subscriptionError);
      throw subscriptionError;
    }

    console.log(`📱 Encontradas ${subscriptions?.length || 0} assinaturas`);

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const subscription of subscriptions || []) {
      const renewalDay = subscription.renewal_day;
      
      // Calcular data de renovação esperada para este mês
      let expectedRenewalDate = new Date(currentYear, currentMonth, renewalDay);
      
      // Se o dia de renovação já passou neste mês, verificar se foi pago
      if (currentDay > renewalDay) {
        // Buscar se existe pagamento desta assinatura neste mês
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const { data: payments, error: paymentError } = await supabaseClient
          .from('transactions')
          .select('id, amount, date')
          .eq('user_id', subscription.user_id)
          .eq('type', 'expense')
          .gte('date', startOfMonth.toISOString().split('T')[0])
          .lte('date', endOfMonth.toISOString().split('T')[0])
          .ilike('description', `%${subscription.name}%`);

        if (paymentError) {
          console.error("Erro ao buscar pagamentos:", paymentError);
          continue;
        }

        const hasPaymentThisMonth = payments && payments.length > 0;
        
        if (!hasPaymentThisMonth) {
          // Calcular dias em atraso
          const daysOverdue = currentDay - renewalDay;
          
          console.log(`⚠️ Assinatura ${subscription.name} está ${daysOverdue} dias em atraso`);

          // Verificar se já existe notificação de atraso para esta assinatura este mês
          const { data: existingNotification } = await supabaseClient
            .from('notifications')
            .select('id')
            .eq('user_id', subscription.user_id)
            .eq('type', 'subscription_overdue')
            .eq('reference_id', subscription.id)
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString())
            .limit(1);

          if (existingNotification && existingNotification.length > 0) {
            console.log(`📲 Notificação já enviada para assinatura ${subscription.name}`);
            continue;
          }

          // Criar notificação de assinatura em atraso
          const { error: notificationError } = await supabaseClient
            .from('notifications')
            .insert({
              user_id: subscription.user_id,
              title: 'Assinatura em Atraso',
              message: `Sua assinatura ${subscription.name} está ${daysOverdue} dias em atraso. Valor: R$ ${Number(subscription.amount).toFixed(2)}`,
              type: 'subscription_overdue',
              reference_id: subscription.id,
              reference_type: 'subscription',
              navigation_data: {
                subscription_id: subscription.id,
                subscription_name: subscription.name,
                amount: subscription.amount,
                days_overdue: daysOverdue,
                renewal_day: renewalDay
              }
            });

          if (notificationError) {
            console.error("Erro ao criar notificação:", notificationError);
          } else {
            console.log(`🚨 Notificação criada: Assinatura ${subscription.name} em atraso`);
          }
        } else {
          console.log(`✅ Assinatura ${subscription.name} está paga neste mês`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Verificação de assinaturas concluída" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na verificação de assinaturas:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});