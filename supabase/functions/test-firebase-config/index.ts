import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleError, handleSuccess } from "../_shared/utils.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId } = await req.json();
    if (!userId) {
      throw new Error("userId é obrigatório no corpo da requisição.");
    }

    console.log(`[TEST-FIREBASE] Iniciando teste de notificação para o usuário: ${userId}`);

    // Invocar a função send-push-notification, que agora contém a lógica robusta
    const { data, error } = await supabaseClient.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title: 'Teste de Notificação  Firebase',
        body: 'Se você recebeu esta notificação, a configuração está funcionando!',
        data: { type: 'test' }
      }
    });

    if (error) {
      throw new Error(`Erro ao invocar send-push-notification: ${error.message}`);
    }

    return handleSuccess({
      message: "Função de teste executada com sucesso. Verifique o dispositivo para a notificação.",
      invokeResult: data
    }, "Teste concluído.");

  } catch (error) {
    return handleError(error, "test-firebase-config");
  }
});