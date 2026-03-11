
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://supabase.arxsolutions.cloud";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY; // User set this to Service Role key

if (!SUPABASE_KEY) {
    console.error("❌ Erro: VITE_SUPABASE_ANON_KEY não encontrada no .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testWrite() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log("Tentando criar produto com a chave do .env...");

    const { data, error } = await supabase
        .from('products')
        .insert([{
            name: "Produto Teste Final",
            price: 99.90,
            image: "https://via.placeholder.com/150",
            category: "Teste",
            description: "Teste final de escrita",
            sizes: ["U"],
            colors: ["Unica"],
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
