import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, subject, message } = await req.json();

    if (!userEmail || !subject || !message) {
      throw new Error("Dados obrigatórios não fornecidos");
    }

    const emailResponse = await resend.emails.send({
      from: "ControlAI <onboarding@resend.dev>",
      to: ["suporte@finaudy.com.br"],
      subject: `[ControlAI Support] ${subject}`,
      html: `
        <h2>Nova mensagem de suporte - ControlAI</h2>
        <p><strong>De:</strong> ${userName} (${userEmail})</p>
        <p><strong>Assunto:</strong> ${subject}</p>
        <p><strong>Mensagem:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 10px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Esta mensagem foi enviada através do sistema de suporte do ControlAI.
        </p>
      `,
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    // Send confirmation email to user
    await resend.emails.send({
      from: "ControlAI <onboarding@resend.dev>",
      to: [userEmail],
      subject: "Mensagem de suporte recebida - ControlAI",
      html: `
        <h2>Mensagem de suporte recebida</h2>
        <p>Olá ${userName},</p>
        <p>Recebemos sua mensagem de suporte e nossa equipe entrará em contato em breve.</p>
        <p><strong>Assunto:</strong> ${subject}</p>
        <p>Obrigado por usar o ControlAI!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Equipe ControlAI
        </p>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error sending support email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});