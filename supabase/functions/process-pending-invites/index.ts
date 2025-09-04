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
    // Criar cliente Supabase admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter usuário autenticado do header
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

    console.log(`Processando convites pendentes para: ${user.email}`);

    // Buscar convites pendentes para este email
    const { data: pendingInvites, error: invitesError } = await supabaseAdmin
      .from('shared_accounts')
      .select('*')
      .eq('invited_email', user.email)
      .eq('status', 'pending_registration');

    if (invitesError) {
      console.error('Erro ao buscar convites pendentes:', invitesError);
      throw invitesError;
    }

    console.log(`Encontrados ${pendingInvites?.length || 0} convites pendentes`);

    if (pendingInvites && pendingInvites.length > 0) {
      console.log(`Processando ${pendingInvites.length} convites:`);
      pendingInvites.forEach(invite => {
        console.log(`- Convite ID: ${invite.id}, Owner: ${invite.owner_id}, Email: ${invite.invited_email}`);
      });
      
      // Atualizar convites para status 'pending' e definir o shared_with_id
      for (const invite of pendingInvites) {
        console.log(`Atualizando convite ${invite.id}...`);
        
        const { error: updateError } = await supabaseAdmin
          .from('shared_accounts')
          .update({
            shared_with_id: user.id,
            status: 'pending',
            invited_email: null // Limpar o campo já que agora temos o user_id
          })
          .eq('id', invite.id);

        if (updateError) {
          console.error(`Erro ao atualizar convite ${invite.id}:`, updateError);
        } else {
          console.log(`Convite ${invite.id} atualizado com sucesso para status 'pending'`);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `${pendingInvites.length} convite(s) pendente(s) processado(s)`,
        processedInvites: pendingInvites.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Nenhum convite pendente encontrado",
      processedInvites: 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in process-pending-invites function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});