import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-BUDGET] ${step}${detailsStr}`);
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
    const { userId, categoryId, transactionId } = await req.json();
    
    if (!userId || !categoryId || !transactionId) {
      throw new Error("Parâmetros obrigatórios: userId, categoryId, transactionId");
    }

    logStep("Verificando orçamento excedido", { userId, categoryId, transactionId });

    // Buscar orçamentos ativos para esta categoria e usuário
    const { data: budgets, error: budgetError } = await supabaseClient
      .from('category_budgets')
      .select(`
        *,
        categories!inner(name, icon)
      `)
      .eq('user_id', userId)
      .eq('category_id', categoryId);

    if (budgetError) throw budgetError;

    if (!budgets || budgets.length === 0) {
      logStep("Nenhum orçamento encontrado para esta categoria");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Nenhum orçamento para verificar" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    for (const budget of budgets) {
      // Verificar se o período está ativo
      const today = new Date().toISOString().split('T')[0];
      if (today < budget.period_start || today > budget.period_end) {
        continue; // Pular orçamentos que não estão no período ativo
      }

      // Calcular total gasto na categoria durante o período
      const { data: transactions, error: transError } = await supabaseClient
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('type', 'expense')
        .gte('date', budget.period_start)
        .lte('date', budget.period_end)
        .gte('created_at', budget.created_at);

      if (transError) throw transError;

      const totalSpent = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const budgetAmount = Number(budget.budget_amount);
      const percentageUsed = (totalSpent / budgetAmount) * 100;

      logStep("Orçamento analisado", {
        categoryName: budget.categories.name,
        spent: totalSpent,
        budget: budgetAmount,
        percentage: percentageUsed.toFixed(2)
      });

      // Verificar se excedeu 100% do orçamento
      if (percentageUsed >= 100) {
        // Verificar se já foi enviada notificação de orçamento excedido hoje
        const { data: existingNotifications } = await supabaseClient
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'budget_exceeded')
          .eq('reference_id', budget.id)
          .eq('reference_type', 'category_budget')
          .gte('created_at', today + 'T00:00:00.000Z')
          .lt('created_at', today + 'T23:59:59.999Z');

        if (!existingNotifications || existingNotifications.length === 0) {
          // Criar notificação in-app
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: userId,
              title: 'Orçamento Excedido!',
              message: `Você excedeu o orçamento de ${budget.categories.name}. Gasto: R$ ${totalSpent.toFixed(2)} / R$ ${budgetAmount.toFixed(2)} (${percentageUsed.toFixed(1)}%)`,
              type: 'budget_exceeded',
              reference_id: budget.id,
              reference_type: 'category_budget',
              navigation_data: {
                category_id: categoryId,
                budget_id: budget.id,
                category_name: budget.categories.name,
                spent: totalSpent,
                budget_amount: budgetAmount,
                percentage: percentageUsed
              }
            });

          // Enviar notificação push
          try {
            await supabaseClient.functions.invoke('send-push-notification', {
              body: {
                user_id: userId,
                title: 'Orçamento Excedido!',
                body: `Você excedeu o orçamento de ${budget.categories.name}. Gasto: R$ ${totalSpent.toFixed(2)} / R$ ${budgetAmount.toFixed(2)}`,
                data: { 
                  type: 'budget_exceeded', 
                  category_id: categoryId,
                  budget_id: budget.id,
                  category_name: budget.categories.name
                }
              }
            });
            logStep("Notificação push de orçamento excedido enviada", { userId, categoryName: budget.categories.name });
          } catch (pushError) {
            console.error("❌ Erro ao enviar push notification de orçamento:", pushError);
          }

          logStep("Notificação de orçamento excedido criada", { 
            userId, 
            categoryName: budget.categories.name,
            percentage: percentageUsed.toFixed(2)
          });
        } else {
          logStep("Notificação de orçamento excedido já enviada hoje", { 
            userId, 
            categoryName: budget.categories.name 
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Verificação de orçamento concluída" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO na verificação de orçamento", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});