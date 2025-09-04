import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { toZonedTime, format as formatTz } from "https://esm.sh/date-fns-tz@3.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Process base64 in chunks to prevent memory issues
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

// Transcription function with fallback
async function transcribeAudio(binaryAudio: Uint8Array): Promise<string> {
  // Prepare form data
  const formData = new FormData()
  const blob = new Blob([binaryAudio], { type: 'audio/webm' })
  formData.append('file', blob, 'audio.webm')
  formData.append('language', 'pt')

  // Try Groq first (primary API)
  try {
    console.log('Attempting transcription with Groq Whisper-large-v3...')
    formData.set('model', 'whisper-large-v3')
    
    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
      },
      body: formData,
    })

    if (groqResponse.ok) {
      const result = await groqResponse.json()
      console.log('✅ Groq transcription successful')
      return result.text
    } else {
      const error = await groqResponse.text()
      console.warn('⚠️ Groq transcription failed:', error)
      throw new Error(`Groq API error: ${error}`)
    }
  } catch (groqError) {
    console.warn('🔄 Groq failed, falling back to OpenAI:', groqError.message)
    
    // Fallback to OpenAI
    try {
      console.log('Attempting transcription with OpenAI Whisper-1...')
      formData.set('model', 'whisper-1')
      
      const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: formData,
      })

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text()
        throw new Error(`OpenAI Whisper API error: ${error}`)
      }

      const result = await openaiResponse.json()
      console.log('✅ OpenAI transcription successful (fallback)')
      return result.text
    } catch (openaiError) {
      console.error('❌ Both transcription services failed')
      throw new Error(`Transcription failed: Groq (${groqError.message}) and OpenAI (${openaiError.message})`)
    }
  }
}

// Analysis function with fallback
async function analyzeText(transcribedText: string, categories: any[]): Promise<any> {
  const categoryOptions = categories.map((cat: any) => `${cat.name} (${cat.type})`).join(', ')
  
  const analysisPrompt = `
Analise o texto e identifique a AÇÃO: TRANSAÇÃO ou INVESTIMENTO.

Texto: "${transcribedText}"
Categorias: ${categoryOptions}

IDENTIFICAÇÃO PRIORITÁRIA - CARTÃO DE CRÉDITO:
💳 CARTÃO/PARCELAMENTO (PRIORIDADE MÁXIMA): "cartão", "crédito", "parcelado", "parcelamento", "vezes", "parcelas", "no cartão", "do cartão", "pelo cartão", "no crédito", "parcelei", "parcelado em", "3x", "4x", "5x", "6x", "10x", "12x" (qualquer número + "x" ou "vezes")

CATEGORIAS PARA CARTÃO:
- Alimentação: comida, mercado, supermercado, restaurante, lanchonete, delivery, ifood, açaí, pizza
- Transporte: uber, combustível, gasolina, ônibus, metrô, estacionamento, táxi
- Moradia: casa, móveis, eletrodomésticos, decoração, construção, reforma
- Saúde: farmácia, médico, dentista, hospital, exame, medicamento, consulta
- Educação: curso, livro, escola, faculdade, material escolar, aula
- Entretenimento: cinema, show, festa, bar, balada, netflix, spotify, jogo
- Compras: roupa, sapato, bolsa, perfume, eletrônico, celular, TV, presente, loja

→ Quando detectar cartão: {"action_type": "transaction", "payment_method": "Cartão de Crédito", "category": "categoria_específica_do_item", "installments": {"count": número_parcelas, "value": valor_parcela}}

OUTRAS IDENTIFICAÇÕES:
🏦 TRANSAÇÕES SIMPLES: "comprei", "gastei", "paguei", "recebi", "ganhei", "vendi" + familiares ("da minha vó/mãe/pai") SEM termos de cartão
💰 INVESTIMENTOS: "investi", "investimento", "apliquei", "poupança", "renda fixa", "ações", "reserva de emergência"

REGRAS ESPECIAIS:
- SEMPRE verificar primeiro se há termos de CARTÃO/PARCELAMENTO
- Se detectar "cartão" ou "crédito" ou "parcelado" → SEMPRE payment_method = "Cartão de Crédito"
- Se mencionar número de parcelas (ex: "3 vezes", "5x", "parcelado em 4") → SEMPRE inclua installments
- Se não mencionar parcelas mas mencionar cartão → installments = {"count": 1, "value": amount}
- RECEITAS familiares → "Freelance"
- INVESTIMENTOS sem categoria específica → "reserva de emergência"

FORMATOS:
CARTÃO/PARCELAMENTO: {"action_type": "transaction", "type": "expense", "amount": número_total, "description": "texto", "category": "categoria", "payment_method": "Cartão de Crédito", "installments": {"count": número_parcelas, "value": valor_parcela}, "payment_day": null}
TRANSAÇÃO SIMPLES: {"action_type": "transaction", "type": "income|expense", "amount": número, "description": "texto", "category": "categoria", "payment_method": null, "installments": null, "payment_day": null, "family_source": null}
INVESTIMENTO: {"action_type": "investment", "amount": número, "description": "texto", "investment_type": "tipo"}

Responda APENAS com JSON válido.
`

  // Try Groq first (primary API)
  try {
    console.log('Attempting analysis with Groq Llama 3.1...')
    
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise de transações financeiras. Sempre responda apenas com JSON válido.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      }),
    })

    if (groqResponse.ok) {
      const result = await groqResponse.json()
      console.log('✅ Groq analysis successful')
      return result.choices[0]?.message?.content
    } else {
      const error = await groqResponse.text()
      console.warn('⚠️ Groq analysis failed:', error)
      throw new Error(`Groq API error: ${error}`)
    }
  } catch (groqError) {
    console.warn('🔄 Groq failed, falling back to OpenAI:', groqError.message)
    
    // Fallback to OpenAI
    try {
      console.log('Attempting analysis with OpenAI GPT-4o-mini...')
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente especializado em análise de transações financeiras. Sempre responda apenas com JSON válido.'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 200
        }),
      })

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text()
        throw new Error(`OpenAI analysis API error: ${error}`)
      }

      const result = await openaiResponse.json()
      console.log('✅ OpenAI analysis successful (fallback)')
      return result.choices[0]?.message?.content
    } catch (openaiError) {
      console.error('❌ Both analysis services failed')
      throw new Error(`Analysis failed: Groq (${groqError.message}) and OpenAI (${openaiError.message})`)
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, categories } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    console.log('🎙️ Processing audio data...')
    
    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio)
    
    // Transcribe audio with fallback
    const transcribedText = await transcribeAudio(binaryAudio)

    console.log('Transcribed text:', transcribedText)

    if (!transcribedText || transcribedText.trim().length === 0) {
      throw new Error('Nenhum texto foi transcrito do áudio')
    }

    // Analyze text with fallback
    const analysisText = await analyzeText(transcribedText, categories)

    console.log('Analysis result:', analysisText)

    if (!analysisText) {
      throw new Error('Não foi possível analisar o texto')
    }

    // Parse the JSON response
    let transactionData
    try {
      // Remove markdown code blocks if present
      let cleanedText = analysisText.trim()
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      transactionData = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Raw analysis text:', analysisText)
      throw new Error('Erro ao processar a análise do texto')
    }

    console.log('Parsed action data:', transactionData)

    // Process different action types
    let result: any = {
      text: transcribedText,
      action_type: transactionData.action_type
    }

    if (transactionData.action_type === 'transaction') {
      // Find the matching category ID for transactions
      let matchingCategory = categories.find((cat: any) => 
        cat.name.toLowerCase() === transactionData.category?.toLowerCase() &&
        cat.type === transactionData.type
      )

      // If specific category not found, try to find a fallback category
      if (!matchingCategory) {
        // For family source income, try to find any income category
        if (transactionData.type === 'income' && transactionData.family_source) {
          matchingCategory = categories.find((cat: any) => cat.type === 'income')
        }
        
        // For general transactions, try to find "Outros" category
        if (!matchingCategory) {
          matchingCategory = categories.find((cat: any) => 
            cat.name.toLowerCase() === 'outros' && cat.type === transactionData.type
          )
        }
        
        // If still no match, use the first category of the same type
        if (!matchingCategory) {
          matchingCategory = categories.find((cat: any) => cat.type === transactionData.type)
        }
        
        if (!matchingCategory) {
          console.error('No category found for type:', transactionData.type)
          throw new Error(`Nenhuma categoria encontrada para ${transactionData.type}`)
        }
        
        console.log('Using fallback category:', matchingCategory.name)
      }

      result.transaction = {
        type: transactionData.type,
        amount: transactionData.amount,
        description: transactionData.description,
        category_id: matchingCategory.id,
        category_name: matchingCategory.name,
        payment_method: transactionData.payment_method || null,
        installments: transactionData.installments || null,
        payment_day: transactionData.payment_day || null,
        family_source: transactionData.family_source || null
      }
    } else if (transactionData.action_type === 'investment') {
      result.investment = {
        amount: transactionData.amount,
        description: transactionData.description,
        investment_type: transactionData.investment_type
      }
    }

    console.log('Final result:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in smart-voice-processor:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})