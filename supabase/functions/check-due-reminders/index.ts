import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[CHECK-DUE-REMINDERS] Esta função foi desativada para evitar notificações duplicadas. A lógica agora é centralizada em "process-bill-notifications".');
  
  return new Response(JSON.stringify({ 
    success: true, 
    message: "Função desativada para evitar duplicidade." 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
})