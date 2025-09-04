import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-AUDIO] ${step}${detailsStr}`);
}

function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    const { audio } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio)
    
    // Prepare form data for OpenAI
    const formData = new FormData()
    const blob = new Blob([binaryAudio], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')

    // Send to OpenAI for transcription
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`)
    }

    const transcriptionResult = await response.json()
    const transcription = transcriptionResult.text;
    
    logStep("Audio transcribed", { transcription });

    // Now use GPT to extract transaction data
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que extrai dados de transações financeiras de texto em português. 
            Analise o texto e extraia as seguintes informações:
            - amount: valor numérico (sempre positivo)
            - description: descrição da transação
            - type: "expense" ou "income"
            - category: uma das categorias: "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Entretenimento", "Compras", "Salário", "Freelance", "Investimentos", "Outros"
            
            Responda APENAS com um JSON válido no formato:
            {"amount": number, "description": "string", "type": "expense|income", "category": "string"}
            
            Se não conseguir extrair informações claras, retorne:
            {"error": "Não foi possível extrair dados da transação"}`
          },
          {
            role: 'user',
            content: transcription
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!gptResponse.ok) {
      throw new Error(`GPT API error: ${await gptResponse.text()}`);
    }

    const gptResult = await gptResponse.json();
    const extractedData = JSON.parse(gptResult.choices[0].message.content);
    
    if (extractedData.error) {
      throw new Error(extractedData.error);
    }
    
    logStep("Transaction data extracted", extractedData);

    // Find or create category
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id')
      .eq('name', extractedData.category)
      .eq('type', extractedData.type)
      .single();

    let categoryId = categories?.id;
    
    if (!categoryId) {
      // Create default category if not found
      const { data: newCategory } = await supabaseClient
        .from('categories')
        .insert({
          name: extractedData.category,
          type: extractedData.type,
          is_default: true
        })
        .select('id')
        .single();
      
      categoryId = newCategory?.id;
    }

    // Insert transaction
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: extractedData.amount,
        description: extractedData.description,
        type: extractedData.type,
        category_id: categoryId,
        date: new Date().toISOString().split('T')[0],
        audio_url: null, // Could store the audio file if needed
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Add notification
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Transação adicionada por áudio',
        message: `${extractedData.type === 'expense' ? 'Gasto' : 'Receita'} de R$ ${extractedData.amount} - ${extractedData.description}`,
        type: 'transaction'
      });

    logStep("Transaction created successfully", { transactionId: transaction.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction: transaction,
        transcription: transcription 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-audio", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})