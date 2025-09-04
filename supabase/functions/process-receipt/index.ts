import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { addMonths, format } from "https://esm.sh/date-fns@4.1.0"
import { toZonedTime, format as formatTz } from "https://esm.sh/date-fns-tz@3.0.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Otimizado: removidos logs para melhor performance

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { ocrText, imageData, accountId } = await req.json()
    
    if (!ocrText) {
      throw new Error('No OCR text provided')
    }

    // Use Groq Llama 4 Maverick to extract transaction data from receipt
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente que extrai dados de recibos/notas fiscais em português. 
            Analise o texto do recibo e extraia as seguintes informações:
            - amount: valor total da compra (sempre positivo, sem símbolo)
            - description: nome do estabelecimento ou descrição principal da compra
            - type: sempre "expense" para recibos
            - category: categorize baseado no estabelecimento: "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Entretenimento", "Compras", "Outros"
            - payment_method: se mencionado no recibo (ex: "Cartão", "Dinheiro", "PIX")
            - installments: se identificar parcelas no texto (ex: "12x de R$ 50,00"), extrair número de parcelas e valor da parcela
            
            Responda APENAS com um JSON válido no formato:
            {"amount": number, "description": "string", "type": "expense", "category": "string", "payment_method": "string", "installments": {"count": number, "value": number} ou null}
            
            Se não conseguir extrair informações claras, retorne:
            {"error": "Não foi possível extrair dados do recibo"}`
          },
          {
            role: 'user',
            content: ocrText
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${await groqResponse.text()}`);
    }

    const groqResult = await groqResponse.json();
    const extractedData = JSON.parse(groqResult.choices[0].message.content);
    
    if (extractedData.error) {
      throw new Error(extractedData.error);
    }

    // Save image to storage if provided
    let receiptUrl = null;
    if (imageData) {
      try {
        // Remove the data URL prefix to get just the base64 data
        const base64Data = imageData.split(',')[1];
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Create file path with user folder structure for RLS policies
        const fileName = `${user.id}/receipt-${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('receipts')
          .upload(fileName, imageBuffer, {
            contentType: 'image/jpeg'
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabaseClient.storage
            .from('receipts')
            .getPublicUrl(fileName);
          receiptUrl = publicUrl;
        }
      } catch (uploadError) {
        // Silently ignore upload errors for better UX
      }
    }

    // Find or create category
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('id')
      .eq('name', extractedData.category)
      .eq('type', 'expense')
      .single();

    let categoryId = categories?.id;
    
    if (!categoryId) {
      // Create default category if not found
      const { data: newCategory } = await supabaseClient
        .from('categories')
        .insert({
          name: extractedData.category,
          type: 'expense',
          is_default: true
        })
        .select('id')
        .single();
      
      categoryId = newCategory?.id;
    }

    // Use the provided accountId or fallback to user.id
    const targetUserId = accountId || user.id;

    // Check if it's an installment purchase OR if payment method is credit card
    const isCreditCard = extractedData.payment_method && 
      (extractedData.payment_method.toLowerCase().includes('cartão') || 
       extractedData.payment_method.toLowerCase().includes('cartao') ||
       extractedData.payment_method.toLowerCase().includes('crédito') ||
       extractedData.payment_method.toLowerCase().includes('credito'));
    
    if ((extractedData.installments && extractedData.installments.count > 1) || isCreditCard) {
      // Create installment purchase (for credit card, default to 1 installment if not specified)
      const installmentAmount = extractedData.installments ? extractedData.installments.value : extractedData.amount;
      const totalInstallments = extractedData.installments ? extractedData.installments.count : 1;
      const totalAmount = extractedData.amount;
      // Use timezone brasileiro para garantir data correta
      const now = toZonedTime(new Date(), 'America/Sao_Paulo');
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-based
      const day = now.getDate().toString().padStart(2, '0');
      const firstPaymentDate = `${year}-${month}-${day}`;
      
      console.log('DEBUG - process-receipt date creation (Brasil timezone):');
      console.log('- Brazil date components: year=', year, 'month=', month, 'day=', day);
      console.log('- Final firstPaymentDate:', firstPaymentDate);
      
      // Check for existing installments with same name but different dates within last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existingInstallments } = await supabaseClient
        .from('installments')
        .select('purchase_name, first_payment_date, total_amount, installment_amount')
        .eq('user_id', targetUserId)
        .eq('purchase_name', extractedData.description)
        .gte('created_at', twentyFourHoursAgo);
      
      // If same name but different date/amount, create new purchase (don't prevent it)
      // This allows multiple purchases with same name on different dates
      console.log('Found existing installments:', existingInstallments?.length || 0);
      
      // Create all installments
      const installmentsToCreate = [];
      
      for (let i = 0; i < totalInstallments; i++) {
        // Parse date correctly to avoid timezone issues
        const [year, month, day] = firstPaymentDate.split('-').map(Number);
        const firstDateLocal = new Date(year, month - 1, day); // month is 0-based
        const paymentDate = addMonths(firstDateLocal, i);
        const paymentDateStr = format(paymentDate, 'yyyy-MM-dd');
        
        installmentsToCreate.push({
          user_id: targetUserId,
          purchase_name: extractedData.description,
          total_amount: totalAmount,
          installment_amount: installmentAmount,
          total_installments: totalInstallments,
          current_installment: i + 1,
          first_payment_date: firstPaymentDate,
          last_payment_date: format(addMonths(firstDateLocal, totalInstallments - 1), 'yyyy-MM-dd'),
          category_id: categoryId,
          receipt_url: receiptUrl, // Add receipt URL to all installments
          is_paid: false // All installments start as unpaid
        });
      }

      const { data: installments, error: installmentError } = await supabaseClient
        .from('installments')
        .insert(installmentsToCreate)
        .select();

      if (installmentError) throw installmentError;
    } else {
      // Check for duplicate transactions in the last 60 seconds to prevent duplicates
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      const { data: existingTransactions } = await supabaseClient
        .from('transactions')
        .select('id, amount, description')
        .eq('user_id', targetUserId)
        .eq('amount', extractedData.amount)
        .eq('description', extractedData.description)
        .gte('created_at', oneMinuteAgo);
      
      if (existingTransactions && existingTransactions.length > 0) {
        throw new Error('Transação duplicada detectada. Esta transação já foi processada recentemente.');
      }
      
      // Regular single transaction
      const { data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .insert({
          user_id: targetUserId,
          amount: extractedData.amount,
          description: extractedData.description,
          type: 'expense',
          category_id: categoryId,
          payment_method: extractedData.payment_method || null,
          receipt_url: receiptUrl,
          date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (transactionError) throw transactionError;
    }

    // Add notification to the logged user (not the account owner)
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Transação adicionada por foto',
        message: `Gasto de R$ ${extractedData.amount} - ${extractedData.description}`,
        type: 'transaction'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        transaction: { amount: extractedData.amount, description: extractedData.description },
        installments: extractedData.installments || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})