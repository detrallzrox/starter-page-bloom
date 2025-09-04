import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Default categories to ensure exist globally
    const defaultCategories = [
      {
        name: 'Renda Fixa',
        type: 'savings' as const,
        icon: '📊',
        color: '#3b82f6'
      },
      {
        name: 'Reserva de Emergência',
        type: 'savings' as const,
        icon: '🛡️',
        color: '#10b981'
      }
    ]

    const createdCategories = []

    for (const category of defaultCategories) {
      // Check if default category exists globally (not tied to any user)
      const { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('name', category.name)
        .eq('type', category.type)
        .eq('is_default', true)
        .is('user_id', null)
        .single()

      if (!existingCategory) {
        // Create global default category
        const { error } = await supabaseClient
          .from('categories')
          .insert({
            name: category.name,
            type: category.type,
            icon: category.icon,
            color: category.color,
            is_default: true,
            user_id: null
          })

        if (error) {
          console.error(`Error creating ${category.name} category:`, error)
          return new Response(
            JSON.stringify({ error: error.message }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        createdCategories.push(category.name)
        console.log(`Created default category: ${category.name}`)
      } else {
        console.log(`Default category already exists: ${category.name}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: createdCategories.length > 0 
          ? `Categories created: ${createdCategories.join(', ')}` 
          : 'All default categories already exist',
        created: createdCategories
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in ensure-default-categories function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})