import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface StoreSettings {
    id: number;
    store_name: string;
    free_shipping_threshold: number;
    contact_email: string;
    contact_phone: string;
    pix_key?: string;
    pix_owner_name?: string;
    pix_owner_city?: string;
    fixed_shipping_price?: number;
}

export const useStoreSettings = () => {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['store_settings'],
        queryFn: async (): Promise<StoreSettings> => {
            try {
                // Try fetching from Server Proxy
                const response = await fetch('/api/public/store-settings');
                if (!response.ok) throw new Error('Failed to fetch settings');
                return await response.json();
            } catch (error) {
                console.warn("Settings proxy failed, trying Supabase direct...", error);

                if (!supabase) return { id: 0, store_name: "DeLu Kids", free_shipping_threshold: 299, contact_email: "", contact_phone: "" };

                const { data, error: sbError } = await supabase
                    .from('store_settings')
                    .select('*')
                    .single();

                if (sbError || !data) {
                    return {
                        id: 0,
                        store_name: "DeLu Kids",
                        free_shipping_threshold: 299,
                        contact_email: "",
                        contact_phone: "",
                        pix_key: "",
                        pix_owner_name: "",
                        pix_owner_city: "",
                        fixed_shipping_price: 15.00
                    };
                }
                return data;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const updateSettingsMutation = useMutation({
        mutationFn: async (newSettings: Partial<StoreSettings>) => {
            if (!supabase) throw new Error("Supabase não conectado");

            // Check if settings exist, if not insert
            if (!settings || settings.id === 0) {
                const { error } = await supabase
                    .from('store_settings')
                    .insert([newSettings]);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('store_settings')
                    .update(newSettings)
                    .eq('id', settings.id);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store_settings'] });
            toast.success("Configurações atualizadas!");
        },
        onError: () => {
            toast.error("Erro ao salvar configurações.");
        }
    });

    return {
        settings,
        isLoading,
        updateSettings: updateSettingsMutation.mutateAsync
    };
};
