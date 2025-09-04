import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verificar se RESEND_API_KEY está configurado
const resendKey = Deno.env.get("RESEND_API_KEY");
if (!resendKey) {
  console.error("RESEND_API_KEY não encontrado nas variáveis de ambiente");
}
const resend = resendKey ? new Resend(resendKey) : null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteEmail, ownerName } = await req.json();

    if (!inviteEmail) {
      throw new Error("Email do convite é obrigatório");
    }

    // Criar cliente Supabase
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

    // CRÍTICO: Verificar se o usuário é proprietário da conta ou está usando conta compartilhada
    const { data: sharedAccountCheck, error: sharedCheckError } = await supabaseAdmin
      .from('shared_accounts')
      .select('*')
      .eq('shared_with_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (sharedCheckError) {
      console.error('Erro ao verificar conta compartilhada:', sharedCheckError);
    }

    if (sharedAccountCheck) {
      throw new Error("Acesso negado: você está usando uma conta compartilhada. Apenas o proprietário original pode enviar convites.");
    }

    // Verificar se já existe algum compartilhamento ativo para este usuário como proprietário
    const { data: existingOwnership, error: ownershipError } = await supabaseAdmin
      .from('shared_accounts')
      .select('*')
      .eq('owner_id', user.id)
      .in('status', ['pending', 'accepted', 'pending_registration']);

    if (ownershipError) {
      console.error('Erro ao verificar compartilhamentos existentes:', ownershipError);
    }

    if (existingOwnership && existingOwnership.length > 0) {
      throw new Error("Você já possui um compartilhamento ativo. Remova o compartilhamento atual antes de convidar outra pessoa.");
    }

    // Verificar se o email já está vinculado a algum compartilhamento ativo
    const { data: existingSharing, error: sharingCheckError } = await supabaseAdmin
      .from('shared_accounts')
      .select('*')
      .eq('invited_email', inviteEmail)
      .in('status', ['pending', 'accepted', 'pending_registration'])
      .maybeSingle();

    if (sharingCheckError) {
      console.error('Erro ao verificar compartilhamento existente:', sharingCheckError);
    }

    if (existingSharing) {
      throw new Error(`Este email já está vinculado a outro compartilhamento de conta. Cada email pode estar vinculado a apenas um compartilhamento por vez.`);
    }

    console.log(`Verificando se o email ${inviteEmail} existe no sistema...`);
    
    let targetUser = null;
    let userSearchError = null;

    try {
      // Buscar usuário usando RPC para verificar se existe
      const { data: existingProfile, error: profileError } = await supabaseAdmin
        .rpc('get_user_by_email', { email_to_search: inviteEmail });
      
      if (profileError) {
        console.log(`Usuário não encontrado para email: ${inviteEmail} - ${profileError.message}`);
        targetUser = null;
      } else if (existingProfile && existingProfile.length > 0) {
        targetUser = { id: existingProfile[0].id, email: existingProfile[0].email };
        console.log(`Usuário encontrado: ${targetUser.id} para ${inviteEmail}`);
      } else {
        console.log(`Usuário não encontrado para email: ${inviteEmail}`);
        targetUser = null;
      }
    } catch (error) {
      console.error('Erro inesperado ao buscar usuário:', error);
      // Em caso de erro, assumir que usuário não existe e continuar o fluxo
      targetUser = null;
    }
    
    if (!targetUser) {
      console.log('Usuário não encontrado, criando convite pending_registration...');
      
      // Verificar se já existe um convite pendente para este email usando admin client
      const { data: existingInvite, error: checkError } = await supabaseAdmin
        .from('shared_accounts')
        .select('*')
        .eq('owner_id', user.id)
        .eq('invited_email', inviteEmail)
        .eq('status', 'pending_registration')
        .maybeSingle();

      if (checkError) {
        console.error('Erro ao verificar convite existente:', checkError);
      }

      if (existingInvite) {
        console.log('Convite pendente já existe, reenviando email...');
      } else {
        // Criar um convite pendente com o email usando admin client
        const { error: pendingShareError } = await supabaseAdmin
          .from('shared_accounts')
          .insert({
            owner_id: user.id,
            shared_with_id: null, // Usuário ainda não existe
            status: 'pending_registration',
            invited_email: inviteEmail
          });

        if (pendingShareError) {
          console.error('Erro ao criar convite pendente:', pendingShareError);
          throw new Error('Erro ao criar convite: ' + pendingShareError.message);
        }
        
        console.log('Convite pendente criado com sucesso');
      }

      // Enviar email de convite para se registrar (se configurado)
      if (resend) {
        try {
          await resend.emails.send({
            from: "ControlAI <noreply@controlai.app>",
            to: [inviteEmail],
            subject: "Convite para compartilhar conta no ControlAI",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Você foi convidado para compartilhar uma conta no ControlAI!</h2>
                <p>${ownerName || user.email} convidou você para compartilhar a conta dele no ControlAI.</p>
                
                <h3>Como aceitar o convite:</h3>
                <ol style="line-height: 1.6;">
                  <li>Clique no botão abaixo para criar sua conta</li>
                  <li>Use o mesmo email: <strong>${inviteEmail}</strong></li>
                  <li>Complete o cadastro</li>
                  <li>O compartilhamento será ativado automaticamente</li>
                </ol>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${req.headers.get('origin') || 'https://controlai.app'}/auth" 
                     style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                    Criar Conta e Aceitar Convite
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Após criar sua conta, você poderá ver e gerenciar as finanças compartilhadas.
                </p>
              </div>
            `,
          });
          console.log('Email enviado com sucesso');
        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError);
          // Continuar mesmo se email falhar
        }
      } else {
        console.log('Serviço de email não configurado, convite criado sem envio de email');
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Convite enviado! O usuário precisa criar uma conta primeiro.",
        type: "pending_registration"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verificar se já existe compartilhamento usando admin client
    const { data: existingShare, error: shareCheckError } = await supabaseAdmin
      .from('shared_accounts')
      .select('*')
      .or(`and(owner_id.eq.${user.id},shared_with_id.eq.${targetUser.id}),and(owner_id.eq.${targetUser.id},shared_with_id.eq.${user.id})`)
      .maybeSingle();

    if (shareCheckError) {
      console.error('Erro ao verificar compartilhamento existente:', shareCheckError);
    }

    if (existingShare) {
      throw new Error("Compartilhamento já existe com este usuário");
    }

    // Criar convite na tabela shared_accounts usando admin client
    const { error: shareError } = await supabaseAdmin
      .from('shared_accounts')
      .insert({
        owner_id: user.id,
        shared_with_id: targetUser.id,
        status: 'pending'
      });

    if (shareError) {
      console.error('Erro ao criar convite para usuário existente:', shareError);
      throw new Error('Erro ao criar convite: ' + shareError.message);
    }

    console.log('Convite para usuário existente criado com sucesso');

    // Criar notificação in-app para o usuário convidado
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: targetUser.id,
        title: 'Convite de Compartilhamento',
        message: `${ownerName || user.email} quer compartilhar a conta financeira com você!`,
        type: 'sharing_invite',
        reference_id: user.id,
        reference_type: 'sharing_invite'
      });

    // Enviar notificação push separadamente
    await supabaseAdmin.functions.invoke('send-push-notification', {
      body: {
        user_id: targetUser.id,
        title: 'Convite de Compartilhamento',
        body: `${ownerName || user.email} quer compartilhar a conta financeira com você!`,
        data: { type: 'sharing_invite', owner_id: user.id }
      }
    });

    // Enviar email de notificação para usuário existente (se configurado)
    if (resend) {
      try {
        await resend.emails.send({
          from: "ControlAI <noreply@controlai.app>",
          to: [inviteEmail],
          subject: "Convite para compartilhar conta no ControlAI",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Você foi convidado para compartilhar uma conta no ControlAI!</h2>
              <p>${ownerName || user.email} convidou você para compartilhar a conta dele no ControlAI.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${req.headers.get('origin') || 'https://controlai.app'}" 
                   style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                  Aceitar Convite
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Entre na sua conta do ControlAI para aceitar o convite e começar a compartilhar finanças.
              </p>
            </div>
          `,
        });
        console.log('Email enviado com sucesso para usuário existente');
      } catch (emailError) {
        console.error('Erro ao enviar email para usuário existente:', emailError);
        // Continuar mesmo se email falhar
      }
    } else {
      console.log('Serviço de email não configurado, convite criado sem envio de email');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Convite enviado com sucesso!",
      type: "existing_user"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in invite-shared-account function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});