import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InstallmentRecord {
  id: string
  user_id: string
  purchase_name: string
  installment_amount: number
  current_installment: number
  first_payment_date: string
  is_paid: boolean
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[CHECK-OVERDUE-INSTALLMENTS] Starting overdue installments check')

    // Get all unpaid installments
    const { data: installments, error: installmentsError } = await supabase
      .from('installments')
      .select('id, user_id, purchase_name, installment_amount, current_installment, first_payment_date, is_paid')
      .eq('is_paid', false)

    if (installmentsError) {
      console.error('[CHECK-OVERDUE-INSTALLMENTS] Error fetching installments:', installmentsError)
      throw installmentsError
    }

    console.log(`[CHECK-OVERDUE-INSTALLMENTS] Found ${installments?.length || 0} unpaid installments`)

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset to start of day
    
    const overdueInstallments: InstallmentRecord[] = []

    // Check each installment for overdue status
    for (const installment of installments || []) {
      // Calculate the due date for this specific installment
      const firstPaymentDate = new Date(installment.first_payment_date + 'T00:00:00')
      const dueDate = new Date(firstPaymentDate)
      dueDate.setMonth(dueDate.getMonth() + (installment.current_installment - 1))
      dueDate.setHours(0, 0, 0, 0)

      // Check if installment is overdue (due date is before today)
      if (dueDate < today) {
        console.log(`[CHECK-OVERDUE-INSTALLMENTS] Found overdue installment: ${installment.purchase_name} - installment ${installment.current_installment}, due: ${dueDate.toISOString().split('T')[0]}`)
        overdueInstallments.push(installment)
      }
    }

    console.log(`[CHECK-OVERDUE-INSTALLMENTS] Found ${overdueInstallments.length} overdue installments`)

    // Group overdue installments by user to send notifications
    const userInstallments = new Map<string, InstallmentRecord[]>()
    
    for (const installment of overdueInstallments) {
      if (!userInstallments.has(installment.user_id)) {
        userInstallments.set(installment.user_id, [])
      }
      userInstallments.get(installment.user_id)!.push(installment)
    }

    let notificationCount = 0

    // Send notifications for each user with overdue installments
    for (const [userId, userOverdueInstallments] of userInstallments) {
      try {
        // Check if we already sent a notification today for this user
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        
        const { data: existingNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'installment_overdue')
          .gte('created_at', todayStart.toISOString())
          .limit(1)

        if (existingNotifications && existingNotifications.length > 0) {
          console.log(`[CHECK-OVERDUE-INSTALLMENTS] Notification already sent today for user ${userId}`)
          continue
        }

        const totalOverdueAmount = userOverdueInstallments.reduce((sum, inst) => sum + inst.installment_amount, 0)
        const installmentCount = userOverdueInstallments.length
        
        let title: string
        let message: string
        
        if (installmentCount === 1) {
          const installment = userOverdueInstallments[0]
          title = 'Parcela em Atraso'
          message = `A parcela ${installment.current_installment} de "${installment.purchase_name}" está em atraso - R$ ${installment.installment_amount.toFixed(2)}`
        } else {
          title = 'Parcelas em Atraso'
          message = `Você tem ${installmentCount} parcelas em atraso totalizando R$ ${totalOverdueAmount.toFixed(2)}`
        }

        // Create notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title,
            message,
            type: 'installment_overdue',
            navigation_data: {
              installment_count: installmentCount,
              total_amount: totalOverdueAmount
            }
          })

        if (notificationError) {
          console.error(`[CHECK-OVERDUE-INSTALLMENTS] Error creating notification for user ${userId}:`, notificationError)
        } else {
          console.log(`[CHECK-OVERDUE-INSTALLMENTS] Notification sent to user ${userId} for ${installmentCount} overdue installments`)
          notificationCount++
        }
      } catch (error) {
        console.error(`[CHECK-OVERDUE-INSTALLMENTS] Error processing user ${userId}:`, error)
      }
    }

    console.log(`[CHECK-OVERDUE-INSTALLMENTS] Process completed - sent ${notificationCount} notifications for ${overdueInstallments.length} overdue installments`)

    return new Response(
      JSON.stringify({
        success: true,
        overdue_installments_found: overdueInstallments.length,
        notifications_sent: notificationCount,
        users_notified: userInstallments.size,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('[CHECK-OVERDUE-INSTALLMENTS] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})