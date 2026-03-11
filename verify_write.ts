
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment before running this script.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function testWrite() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("Tentando criar produto de teste usando CHAVE MESTRA...");

    const { data, error } = await supabase
        .from('products')
        .insert([{
            name: "Produto Teste Write",
            price: 10.00,
            image: "https://via.placeholder.com/150",
            category: "Teste",
            description: "Teste de escrita direta",
            sizes: ["P"],
            colors: ["Teste"],
            rating: 5,
            reviews: 0
        }])
        .select();

    if (error) {
        console.error("❌ FALHA AO GRAVAR:", error.message);
        console.error("Detalhes:", error);
    } else {
        console.log("✅ SUCESSO! Produto gravado com ID:", data[0].id);

        // Clean up
        await supabase.from('products').delete().eq('id', data[0].id);
        console.log("🧹 Produto de teste removido.");
    }
}

testWrite();
