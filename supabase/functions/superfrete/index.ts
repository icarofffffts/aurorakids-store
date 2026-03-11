import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalculatePayload {
  from: string;
  to: string;
  items?: number;
  weight?: number;
}

interface CartPayload {
  from: {
    name: string;
    phone: string;
    email: string;
    document: string;
    address: string;
    complement: string;
    number: string;
    district: string;
    city: string;
    state_abbr: string;
    country_id: string;
    postal_code: string;
  };
  to: {
    name: string;
    phone: string;
    email: string;
    document: string;
    address: string;
    complement: string;
    number: string;
    district: string;
    city: string;
    state_abbr: string;
    country_id: string;
    postal_code: string;
  };
  products: any[];
  volumes: any[];
  options: any;
  services: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, payload } = await req.json()
    const token = Deno.env.get('SUPERFRETE_TOKEN')

    if (!token) {
      throw new Error('SUPERFRETE_TOKEN n\u00e3o configurado')
    }

    // According to the documentation, we'll use Sandbox API for safety first unless the user changes to Production API later.
    // The instructions say the production API is api.superfrete.com
    const apiUrl = 'https://api.superfrete.com/api/v0';

    if (action === 'calculate') {
      const dataPayload = payload as CalculatePayload;
      const itemsCount = dataPayload.items || 1;

      // SuperFrete calculate endpoint requires: from, to, package (or volumes), services, etc.
      const sfPayload = {
        from: { postal_code: dataPayload.from.replace(/\D/g, '') },
        to: { postal_code: dataPayload.to.replace(/\D/g, '') },
        services: "1,2", // Example: 1=PAC, 2=SEDEX, 17=Mini Envios (Correios usually)
        package: {
          height: 5 * itemsCount,
          width: 20,
          length: 15,
          weight: 0.3 * itemsCount
        },
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0
        }
      };

      const response = await fetch(`${apiUrl}/calculator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'DeLu Kids Integracao (contato@delukids.com)',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sfPayload)
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    if (action === 'cart') {
      const cartPayload = payload as CartPayload;
      const response = await fetch(`${apiUrl}/cart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'DeLu Kids Integracao (contato@delukids.com)',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cartPayload)
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    return new Response(JSON.stringify({ error: 'Ac\u00e3o n\u00e3o encontrada. Use action: "calculate" ou "cart"' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
