import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shareId } = await req.json();

    if (!shareId) {
      throw new Error("ID do compartilhamento é obrigatório");
    }

    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter usuário autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autorização necessário");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar o compartilhamento
    const { data: sharedAccount, error: shareError } = await supabaseAdmin
      .from('shared_accounts')
      .select('*')
      .eq('id', shareId)
      .eq('shared_with_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (shareError) {
      console.error('Erro ao buscar compartilhamento:', shareError);
      throw new Error('Erro ao buscar compartilhamento');
    }

    if (!sharedAccount) {
      throw new Error('Compartilhamento não encontrado ou já foi processado');
    }

    // Aceitar o compartilhamento
    const { error: updateError } = await supabaseAdmin
      .from('shared_accounts')
      .update({ status: 'accepted' })
      .eq('id', shareId);

    if (updateError) {
      console.error('Erro ao aceitar compartilhamento:', updateError);
      throw new Error('Erro ao aceitar compartilhamento');
    }

    // Buscar dados do dono da conta para notificação
    const { data: ownerData, error: ownerError } = await supabaseAdmin
      .from('profiles')
      .select('name')
      .eq('id', sharedAccount.owner_id)
      .maybeSingle();

    const userName = ownerData?.name || user.email || 'Usuário';

    // Verificar se já existe notificação de aceite para evitar duplicatas
    const { data: existingNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', sharedAccount.owner_id)
      .eq('type', 'sharing_accepted')
      .eq('reference_id', shareId)
      .eq('reference_type', 'sharing_accepted');

    if (!existingNotifications || existingNotifications.length === 0) {
      // Criar notificação in-app para o dono da conta
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: sharedAccount.owner_id,
          title: 'Convite Aceito',
          message: `${userName} aceitou seu convite para compartilhar a conta financeira.`,
          type: 'sharing_accepted',
          reference_id: shareId,
          reference_type: 'sharing_accepted'
        });

      // Enviar notificação push separadamente
      await supabaseAdmin.functions.invoke('send-push-notification', {
        body: {
          user_id: sharedAccount.owner_id,
          title: 'Convite Aceito',
          body: `${userName} aceitou o convite de compartilhamento!`,
          data: { type: 'sharing_accepted', accepted_by: user.id }
        }
      });
    } else {
      console.log('Notificação de aceite já existe para este compartilhamento');
    }

    console.log('Compartilhamento aceito com sucesso');

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Compartilhamento aceito com sucesso!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in accept-shared-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});