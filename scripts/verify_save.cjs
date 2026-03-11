
const { createClient } = require('@supabase/supabase-js');

// Custom fetch implementation with 60s timeout
const customFetch = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s hard timeout

    try {
        console.log(`[CustomFetch] Requesting: ${url}`);
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log(`[CustomFetch] Response: ${response.status}`);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[CustomFetch] Error: ${error.name} - ${error.message}`);
        throw error;
    }
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment before running this script.');
}

console.log('Initializing Supabase Client...');
const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        fetch: customFetch
    }
});

async function verifyConnection() {
    console.log('Starting verification...');
    const start = Date.now();

    try {
        // Attempt a simple read first
        console.log('Attempting READ from "products"...');
        const readResult = await supabase.from('products').select('count').limit(1);

        if (readResult.error) {
            console.error('READ FAILED:', readResult.error);
        } else {
            console.log('READ SUCCESS:', readResult.data);
        }

        // Attempt a write (simulate save)
        // We'll insert a dummy product and then delete it immediately
        // Note: This requires the service role key ideally, or we might hit RLS.
        // But let's try with the KEY we have. If it hits RLS, that's fine, connection is still proved.
        // Wait, the key is 'service_role' based on the JWT payload 'role: service_role'.
        // So RLS should be bypassed or allowed.

        console.log('Attempting WRITE to "products"...');
        const dummyProduct = {
            name: 'Verification Bot Test',
            price: 1.00,
            category: 'Meninos',
            description: 'Temporary test product',
            sizes: ['P'],
            colors: ['Azul'],
            image_url: 'https://placehold.co/100',
            stock_quantity: 1
        };

        const writeResult = await supabase.from('products').insert([dummyProduct]).select();

        if (writeResult.error) {
            console.error('WRITE FAILED:', writeResult.error);
        } else {
            console.log('WRITE SUCCESS:', writeResult.data);

            // Clean up
            if (writeResult.data && writeResult.data.length > 0) {
                const newId = writeResult.data[0].id;
                console.log(`Cleaning up (Deleting ID: ${newId})...`);
                await supabase.from('products').delete().eq('id', newId);
                console.log('Cleanup DONE.');
            }
        }

    } catch (err) {
        console.error('UNEXPECTED EXCEPTION:', err);
    } finally {
        const duration = (Date.now() - start) / 1000;
        console.log(`Verification completed in ${duration}s`);
    }
}

verifyConnection();
