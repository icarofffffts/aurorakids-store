
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Authenticate User
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error("Unauthorized")
        }

        type IncomingItem = {
            name?: unknown;
            quantity?: unknown;
            price?: unknown;
        }

        type IncomingBody = {
            items?: unknown;
            payerEmail?: unknown;
        }

        // Get Request Data
        const body = (await req.json()) as IncomingBody
        const payerEmail = typeof body.payerEmail === 'string' ? body.payerEmail : ''
        const items = Array.isArray(body.items) ? (body.items as IncomingItem[]) : []

        // Mercado Pago API Request
        // Note: We use the Access Token from Env Var for security
        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`
             },
             body: JSON.stringify({
                items: items.map((item) => ({
                    title: typeof item.name === 'string' ? item.name : String(item.name ?? ''),
                    quantity: Number(item.quantity ?? 0),
                    currency_id: 'BRL',
                    unit_price: Number(item.price ?? 0)
                })),
                 payer: {
                     email: payerEmail
                 },
                 back_urls: {
                    success: `${req.headers.get('origin')}/account`,
                    failure: `${req.headers.get('origin')}/payment`,
                    pending: `${req.headers.get('origin')}/payment`
                },
                auto_return: "approved",
            })
        })

        const mpData = await mpResponse.json()

        if (mpData.error) {
            console.error("MP Error:", mpData)
            throw new Error(mpData.message || "Failed to create preference")
        }

        return new Response(
            JSON.stringify({ preferenceId: mpData.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        return new Response(
            JSON.stringify({ error: message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
