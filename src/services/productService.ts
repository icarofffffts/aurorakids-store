import { supabase } from "@/lib/supabase";
import { Product } from "@/data/products";

// Fallback data for when Supabase is not connected yet
import { products as localProducts } from "@/data/products";

export const getProducts = async (): Promise<Product[]> => {
    try {
        // Try fetching from the Server Proxy (Bypasses RLS)
        const response = await fetch('/api/public/products');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data || [];
    } catch (error) {
        console.warn("API proxy failed, falling back to Supabase direct (or local)...", error);

        // Fallback: Try Supabase direct (might fail if RLS is strict)
        const isConfigured = !!supabase;
        if (isConfigured) {
            const { data, error: sbError } = await supabase!.from('products').select('*');
            if (!sbError && data) return data as Product[];
        }

        // Final Fallback: Local Data
        return localProducts;
    }
};

export const getProductById = async (id: number): Promise<Product | undefined> => {
    try {
        // Try fetching from Server Proxy
        const response = await fetch(`/api/public/products/${id}`);
        if (!response.ok) {
            // If 404, return undefined
            if (response.status === 404) return undefined;
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.warn(`Product ${id} proxy failed, falling back...`, error);

        const isConfigured = !!supabase;
        if (isConfigured) {
            const { data, error: sbError } = await supabase!
                .from('products')
                .select('*')
                .eq('id', id)
                .single();
            if (!sbError && data) return data;
        }

        return localProducts.find(p => p.id === Number(id)); // Ensure ID type match
    }
};
