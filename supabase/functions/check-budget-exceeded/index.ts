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

    // Verificar se há parâmetros específicos (chamada por transação)
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      // Se não houver body, verificar todos os orçamentos
    }

    const { userId, categoryId, transactionId } = requestBody;

    console.log("🔍 BUDGET CHECK PARAMS:", { userId, categoryId, transactionId, requestBody });

    // Buscar orçamentos da categoria/usuário específicos
    let budgetQuery = supabaseClient
      .from('category_budgets')
      .select('*');

    if (userId && categoryId) {
      budgetQuery = budgetQuery
        .eq('user_id', userId)
        .eq('category_id', categoryId);
    }

    const { data: budgetData, error: budgetError } = await budgetQuery;
    
    if (budgetError) {
      console.error("❌ Error fetching budgets:", budgetError);
      throw budgetError;
    }

    console.log(`📊 Encontrados ${budgetData?.length || 0} orçamentos`);

    // Buscar dados das categorias separadamente e criar budgets array
    const budgets = [];
    for (const budget of budgetData || []) {
      const { data: categoryData } = await supabaseClient
        .from('categories')
        .select('name, icon')
        .eq('id', budget.category_id)
        .single();
      
      budgets.push({
        ...budget,
        category_name: categoryData?.name || 'Unknown',
        category_icon: categoryData?.icon || '📊'
      });
    }

    for (const budget of budgets || []) {
      // Calcular período do orçamento
      const startDate = new Date(budget.period_start);
      const endDate = new Date(budget.period_end);
      const now = new Date();

      // Verificar se estamos no período do orçamento
      if (now < startDate || now > endDate) {
        console.log(`⏰ Orçamento ${budget.category_name} fora do período ativo`);
        continue;
      }

      // Buscar gastos na categoria durante o período (apenas transações criadas após a criação do orçamento)
      const { data: transactions, error: transactionError } = await supabaseClient
        .from('transactions')
        .select('amount, created_at')
        .eq('user_id', budget.user_id)
        .eq('category_id', budget.category_id)
        .eq('type', 'expense')
        .gte('date', budget.period_start)
        .lte('date', budget.period_end)
        .gte('created_at', budget.created_at);

      if (transactionError) {
        console.error("Erro ao buscar transações:", transactionError);
        continue;
      }

      const totalSpent = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const budgetAmount = Number(budget.budget_amount);
      const percentageUsed = (totalSpent / budgetAmount) * 100;

      console.log(`💰 BUDGET ANALYSIS - Categoria ${budget.category_name}: R$ ${totalSpent.toFixed(2)}/R$ ${budgetAmount.toFixed(2)} (${percentageUsed.toFixed(1)}%) - EXCEEDED: ${percentageUsed >= 100}`);

      // Verificar se orçamento foi excedido (100% ou mais)
      if (percentageUsed >= 100) {
        // Para verificação específica por transação, verificar se já foi enviada hoje
        // Para verificação geral, verificar se já foi enviada no período
        const today = new Date().toISOString().split('T')[0];
        
        let notificationCheck = supabaseClient
          .from('notifications')
          .select('id')
          .eq('user_id', budget.user_id)
          .eq('type', 'budget_exceeded')
          .eq('reference_id', budget.id);

        if (transactionId) {
          // Se é verificação por transação, verificar se já foi enviada hoje
          notificationCheck = notificationCheck
            .gte('created_at', today + 'T00:00:00.000Z')
            .lt('created_at', today + 'T23:59:59.999Z');
        } else {
          // Se é verificação geral, verificar se já foi enviada no período
          notificationCheck = notificationCheck
            .gte('created_at', budget.period_start)
            .lte('created_at', budget.period_end);
        }

        const { data: existingNotification } = await notificationCheck.limit(1);

        if (existingNotification && existingNotification.length > 0) {
          console.log(`⚠️ Notificação já enviada para orçamento ${budget.category_name}`);
          continue;
        }

        // Criar notificação de orçamento excedido
        console.log(`🚨 CREATING BUDGET EXCEEDED NOTIFICATION for ${budget.category_name}`);
        
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: budget.user_id,
            title: 'Orçamento Excedido!',
            message: `Você excedeu o orçamento de ${budget.category_name}. Gasto: R$ ${totalSpent.toFixed(2)} / R$ ${budgetAmount.toFixed(2)} (${percentageUsed.toFixed(1)}%)`,
            type: 'budget_exceeded',
            reference_id: budget.id,
            reference_type: 'category_budget',
            navigation_data: {
              category_id: budget.category_id,
              category_name: budget.category_name,
              budget_id: budget.id,
              spent: totalSpent,
              budget_amount: budgetAmount,
              percentage: percentageUsed
            }
          });

        if (notificationError) {
          console.error("❌ ERROR creating notification:", notificationError);
        } else {
          console.log(`✅ IN-APP NOTIFICATION CREATED: Budget exceeded for ${budget.category_name}`);
          
          // Também enviar push notification se possível
          try {
            await supabaseClient.functions.invoke('send-push-notification', {
              body: {
                user_id: budget.user_id,
                title: 'Orçamento Excedido!',
                body: `Você excedeu o orçamento de ${budget.category_name}. Gasto: R$ ${totalSpent.toFixed(2)} / R$ ${budgetAmount.toFixed(2)}`,
                data: { 
                  type: 'budget_exceeded', 
                  category_id: budget.category_id,
                  budget_id: budget.id,
                  category_name: budget.category_name
                }
              }
            });
            console.log(`📱 Push notification enviada para orçamento ${budget.category_name}`);
          } catch (pushError) {
            console.error("❌ Erro ao enviar push notification:", pushError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Verificação de orçamentos concluída" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro na verificação de orçamentos:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});