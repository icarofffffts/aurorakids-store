import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "";

async function readErrorMessage(res: Response) {
    const status = typeof res.status === "number" ? res.status : 0;
    let raw = "";
    try {
        raw = await res.text();
    } catch {
        raw = "";
    }

    const trimmed = (raw || "").trim();
    if (!trimmed) return `HTTP ${status}`;

    try {
        const parsed = JSON.parse(trimmed) as unknown;

        if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
        if (parsed && typeof parsed === "object") {
            const obj = parsed as Record<string, unknown>;
            const msg = obj.error ?? obj.message ?? obj.details;
            if (typeof msg === "string" && msg.trim()) return msg.trim();
        }
        if (trimmed !== "{}" && trimmed !== "[]") return trimmed;
        return `HTTP ${status}`;
    } catch {
        if (trimmed === "{}" || trimmed === "[]") return `HTTP ${status}`;
        return trimmed;
    }
}

const getAdminToken = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessao expirada. Faça login novamente.");
    return token;
};

export interface CampaignBanner {
    id: string;
    title: string;
    subtitle: string | null;
    button_label: string | null;
    button_url: string | null;
    image_url: string | null;
    bg_color: string;
    text_color: string;
    button_color: string;
    button_text_color: string;
    position: "hero" | "bar" | "popup";
    priority: number;
    is_active?: boolean;
    start_at?: string;
    end_at?: string | null;
    impressions?: number;
    clicks?: number;
    created_at?: string;
    updated_at?: string;
}

export type BannerPosition = "hero" | "bar" | "popup";

// Public: Fetch active banners by position
export const usePublicBanners = (position?: BannerPosition) => {
    const params = new URLSearchParams();
    if (position) params.set("position", position);

    return useQuery<CampaignBanner[], Error>({
        queryKey: ["banners", "public", position],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/public/banners?${params}`);
            if (!res.ok) throw new Error(await readErrorMessage(res));
            const data = await res.json();
            return data.banners || [];
        },
        staleTime: 1000 * 60 * 5,
    });
};

// Track banner impression
export const trackBannerImpression = async (bannerId: string) => {
    try {
        await fetch(`${API_BASE}/api/public/banners/${bannerId}/impression`, {
            method: "POST",
        });
    } catch {
        // Silent fail - don't block UX for metrics
    }
};

// Track banner click
export const trackBannerClick = async (bannerId: string) => {
    try {
        await fetch(`${API_BASE}/api/public/banners/${bannerId}/click`, {
            method: "POST",
        });
    } catch {
        // Silent fail
    }
};

// Admin: Fetch all banners
export const useAdminBanners = (position?: BannerPosition, active?: boolean) => {
    const params = new URLSearchParams();
    if (position) params.set("position", position);
    if (active !== undefined) params.set("active", String(active));

    return useQuery<CampaignBanner[], Error>({
        queryKey: ["banners", "admin", position, active],
        queryFn: async () => {
            const token = await getAdminToken();
            const res = await fetch(`${API_BASE}/api/admin/banners?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await readErrorMessage(res));
            const data = await res.json();
            return data.banners || [];
        },
        staleTime: 1000 * 60 * 2,
    });
};

// Admin: Create banner
export const useCreateBanner = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (banner: Partial<CampaignBanner>) => {
            const token = await getAdminToken();
            const res = await fetch(`${API_BASE}/api/admin/banners`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(banner),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["banners"] });
        },
    });
};

// Admin: Update banner
export const useUpdateBanner = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<CampaignBanner> & { id: string }) => {
            const token = await getAdminToken();
            const res = await fetch(`${API_BASE}/api/admin/banners/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error(await readErrorMessage(res));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["banners"] });
        },
    });
};

// Admin: Delete banner
export const useDeleteBanner = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const token = await getAdminToken();
            const res = await fetch(`${API_BASE}/api/admin/banners/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(await readErrorMessage(res));
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["banners"] });
        },
    });
};
