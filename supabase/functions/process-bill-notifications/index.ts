import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-BILLS] ${step}${detailsStr}`);
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
    logStep("Iniciando processamento de notificações");

    // Usar timezone de Brasília para garantir data correta
    const today = new Date();
    const brasiliaOffset = -3; // UTC-3
    const brasiliaTime = new Date(today.getTime() + (brasiliaOffset * 60 * 60 * 1000));
    const todayString = brasiliaTime.toISOString().split('T')[0];
    const currentDay = brasiliaTime.getDate();
    const currentHour = brasiliaTime.getHours();
    const currentMinute = brasiliaTime.getMinutes();

    logStep("Data de processamento", { 
      utcDate: today.toISOString().split('T')[0],
      brasiliaDate: todayString,
      currentDay 
    });

    let billsProcessed = 0;
    let subscriptionsProcessed = 0;

    // Processar lembretes de contas com recorrência ativada (notificação hoje)
    const { data: billsDueToday, error: billsError } = await supabaseClient
      .from("bill_reminders")
      .select("*")
      .eq("recurring_enabled", true)
      .eq("next_notification_date", todayString);

    if (billsError) throw billsError;

    for (const bill of billsDueToday || []) {
      // Verificar se deve enviar notificação baseado no horário
      const reminderTime = bill.reminder_time || '19:50:00';
      const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);
      
      // Só enviar se o horário atual for igual ou posterior ao horário configurado
      const shouldSendNow = (currentHour > reminderHour) || 
                           (currentHour === reminderHour && currentMinute >= reminderMinute);
      
      if (shouldSendNow) {
        // Verificação robusta de duplicatas
        const startOfDay = todayString + "T00:00:00.000Z";
        const endOfDay = todayString + "T23:59:59.999Z";
        
        const { data: existingNotifications } = await supabaseClient
          .from("notifications")
          .select("id")
          .eq("user_id", bill.user_id)
          .eq("type", "reminder")
          .eq("reference_id", bill.id)
          .eq("reference_type", "bill_reminder")
          .gte("created_at", startOfDay)
          .lte("created_at", endOfDay);
        
        if (!existingNotifications || existingNotifications.length === 0) {
          try {
            // Inserir notificação
            const { data: insertedNotification, error: insertError } = await supabaseClient
              .from("notifications")
              .insert({
                user_id: bill.user_id,
                title: bill.reminder_name,
                message: bill.comment,
                type: "reminder",
                reference_id: bill.id,
                reference_type: "bill_reminder"
              })
              .select()
              .single();

            if (insertError) {
              // Se deu erro de constraint violation, provavelmente já existe
              if (insertError.code === '23505') {
                logStep("Notificação já existe (constraint violation)", { 
                  userId: bill.user_id, 
                  reminderName: bill.reminder_name 
                });
              } else {
                logStep("Erro ao criar notificação", { 
                  error: insertError.message,
                  userId: bill.user_id, 
                  reminderName: bill.reminder_name 
                });
              }
            } else if (insertedNotification) {
              // Só enviar push se a notificação foi realmente inserida
              try {
                await supabaseClient.functions.invoke('send-push-notification', {
                  body: {
                    user_id: bill.user_id,
                    title: bill.reminder_name,
                    body: bill.comment,
                    data: { type: 'reminder', reminder_id: bill.id }
                  }
                });
                logStep("Notificação push enviada", { userId: bill.user_id });
              } catch (pushError) {
                logStep("Erro ao enviar push notification", { 
                  error: pushError.message,
                  userId: bill.user_id 
                });
              }
              
              logStep("Notificação de lembrete criada com sucesso", { 
                userId: bill.user_id, 
                reminderName: bill.reminder_name,
                sentAt: `${currentHour}:${currentMinute}`
              });
              
              billsProcessed++;
            }
          } catch (error) {
            logStep("Erro geral ao processar notificação", { 
              error: error.message,
              userId: bill.user_id, 
              reminderName: bill.reminder_name 
            });
          }
          
          // Calcular próxima data de notificação baseada na frequência
          let nextDate = new Date(brasiliaTime);
          
          switch (bill.frequency) {
            case 'daily':
              nextDate.setDate(brasiliaTime.getDate() + 1);
              break;
            case 'weekly':
              nextDate.setDate(brasiliaTime.getDate() + 7);
              break;
            case 'monthly':
              // Para mensais, manter a mesma data no próximo mês
              nextDate.setMonth(brasiliaTime.getMonth() + 1);
              // Se o dia não existir no próximo mês, usar o último dia do mês
              if (nextDate.getDate() !== brasiliaTime.getDate()) {
                nextDate.setDate(0); // Vai para o último dia do mês anterior
              }
              break;
            case 'semiannually':
              nextDate.setMonth(brasiliaTime.getMonth() + 6);
              break;
            case 'annually':
              nextDate.setFullYear(brasiliaTime.getFullYear() + 1);
              break;
          }
          
          const nextDateString = nextDate.toISOString().split('T')[0];
          
          // Atualizar próxima data de notificação
          await supabaseClient
            .from("bill_reminders")
            .update({ 
              next_notification_date: nextDateString
            })
            .eq("id", bill.id);
          
          logStep("Próxima data de notificação atualizada", { 
            userId: bill.user_id, 
            reminderName: bill.reminder_name,
            nextNotificationDate: nextDateString
          });
        } else {
          logStep("Notificação já enviada hoje", { 
            userId: bill.user_id, 
            reminderName: bill.reminder_name
          });
        }
      } else {
        logStep("Horário de notificação ainda não chegou", { 
          userId: bill.user_id, 
          reminderName: bill.reminder_name,
          scheduledTime: `${reminderHour}:${reminderMinute}`,
          currentTime: `${currentHour}:${currentMinute}`
        });
      }
    }

    // Processar notificações de renovação de assinaturas (sem criar transação)
    const { data: subscriptionsToday, error: subsError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("renewal_day", currentDay);

    if (subsError) throw subsError;

    for (const subscription of subscriptionsToday || []) {
      // Verificar se já foi notificado hoje para evitar duplicatas
      const { data: existingNotifications } = await supabaseClient
        .from("notifications")
        .select("id")
        .eq("user_id", subscription.user_id)
        .eq("type", "subscription")
        .eq("reference_id", subscription.id)
        .gte("created_at", todayString + "T00:00:00.000Z")
        .lt("created_at", todayString + "T23:59:59.999Z");

      if (!existingNotifications || existingNotifications.length === 0) {
        try {
          // Inserir notificação de renovação
          const { data: insertedNotification, error: insertError } = await supabaseClient
            .from("notifications")
            .insert({
              user_id: subscription.user_id,
              title: "Renovação de Assinatura",
              message: `Sua assinatura do ${subscription.name} será renovada em breve por R$ ${subscription.amount.toFixed(2)}`,
              type: "subscription",
              reference_id: subscription.id,
              reference_type: "subscription",
              navigation_data: {
                subscription_id: subscription.id,
                subscription_name: subscription.name,
                amount: subscription.amount,
                renewal_day: subscription.renewal_day
              }
            })
            .select()
            .single();

          if (insertError) {
            logStep("Erro ao criar notificação de renovação", { 
              error: insertError.message,
              userId: subscription.user_id, 
              subscriptionName: subscription.name 
            });
          } else if (insertedNotification) {
            // Só enviar push se a notificação foi realmente inserida
            try {
              await supabaseClient.functions.invoke('send-push-notification', {
                body: {
                  user_id: subscription.user_id,
                  title: "Renovação de Assinatura",
                  body: `Sua assinatura do ${subscription.name} será renovada em breve por R$ ${subscription.amount.toFixed(2)}`,
                  data: { type: 'subscription', subscription_id: subscription.id }
                }
              });
              logStep("Notificação push de renovação enviada", { userId: subscription.user_id });
            } catch (pushError) {
              logStep("Erro ao enviar push notification de renovação", { 
                error: pushError.message,
                userId: subscription.user_id 
              });
            }
            
            logStep("Notificação de renovação criada com sucesso", { 
              userId: subscription.user_id, 
              subscriptionName: subscription.name,
              amount: subscription.amount
            });
            
            subscriptionsProcessed++;
          }
        } catch (error) {
          logStep("Erro geral ao processar notificação de renovação", { 
            error: error.message,
            userId: subscription.user_id, 
            subscriptionName: subscription.name 
          });
        }
      } else {
        logStep("Notificação de renovação já enviada hoje", { 
          userId: subscription.user_id, 
          subscriptionName: subscription.name
        });
      }
    }

    const totalProcessed = billsProcessed + subscriptionsProcessed;
    
    logStep("Processamento concluído", { 
      totalProcessed,
      billsNotified: billsProcessed,
      subscriptionsProcessed: subscriptionsProcessed
    });

    return new Response(JSON.stringify({ 
      success: true, 
      processed: totalProcessed 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no processamento", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});