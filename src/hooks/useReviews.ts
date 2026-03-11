import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "";

const getAdminToken = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessao expirada. Faça login novamente.");
    return token;
};

export interface Review {
    id: string;
    order_id: string;
    product_id: number;
    customer_id: string;
    customer_name: string;
    rating: number;
    title: string | null;
    comment: string;
    status: "pending" | "approved" | "rejected";
    admin_response: string | null;
    store_reply: string | null;
    created_at: string;
    updated_at: string;
    product_name?: string;
    product_image?: string;
}

export interface ReviewStats {
    total_reviews: number;
    average_rating: number;
    rating_distribution: {
        rating: number;
        count: number;
    }[];
}

export interface ReviewTokenData {
    token: string;
    order_id: string;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    products: {
        id: number;
        name: string;
        image: string;
    }[];
    expires_at: string;
}

export interface SubmitReviewData {
    product_id: number;
    rating: number;
    title?: string;
    comment: string;
}

// Fetch approved reviews (public)
export const usePublicReviews = (productId?: number, limit = 10) => {
    const params = new URLSearchParams();
    if (productId) params.set("product_id", productId.toString());
    params.set("limit", limit.toString());

    return useQuery<Review[], Error>({
        queryKey: ["reviews", "public", productId, limit],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/public/reviews?${params}`);
            if (!res.ok) throw new Error("Failed to fetch reviews");
            const data = await res.json();
            return data.reviews;
        },
        staleTime: 1000 * 60 * 5,
    });
};

// Fetch review stats (public)
export const useReviewStats = (productId?: number) => {
    const params = new URLSearchParams();
    if (productId) params.set("product_id", productId.toString());

    return useQuery<ReviewStats, Error>({
        queryKey: ["reviews", "stats", productId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/public/reviews/stats?${params}`);
            if (!res.ok) throw new Error("Failed to fetch review stats");
            return res.json();
        },
        staleTime: 1000 * 60 * 5,
    });
};

// Validate review token and get order data
export const useReviewToken = (token: string) => {
    return useQuery<ReviewTokenData, Error>({
        queryKey: ["review-token", token],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/api/public/review-token/${token}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Invalid token");
            }
            return res.json();
        },
        enabled: !!token,
        retry: false,
    });
};

// Submit review via token (public, no login required)
export const useSubmitReviewByToken = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ token, reviews }: { token: string; reviews: SubmitReviewData[] }) => {
            const res = await fetch(`${API_BASE}/api/public/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, reviews }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to submit review");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reviews"] });
        },
    });
};

// Admin: Fetch all reviews
export const useAdminReviews = (status?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("limit", limit.toString());

    return useQuery<Review[], Error>({
        queryKey: ["reviews", "admin", status, limit],
        queryFn: async () => {
            const token = await getAdminToken();
            const res = await fetch(`${API_BASE}/api/admin/reviews?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch reviews");
            const data = await res.json();
            return data.reviews;
        },
        staleTime: 1000 * 60 * 2,
    });
};

// Admin: Update review (approve/reject/respond)
export const useUpdateReview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            status,
            admin_response,
        }: {
            id: string;
            status?: "approved" | "rejected";
            admin_response?: string;
        }) => {
            const token = await getAdminToken();
            const res = await fetch(`${API_BASE}/api/admin/reviews/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status, admin_response }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update review");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reviews"] });
        },
    });
};

// Admin: Delete review
export const useDeleteReview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const token = await getAdminToken();
            const res = await fetch(`${API_BASE}/api/admin/reviews/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete review");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["reviews"] });
        },
    });
};

// User: Get review tokens for delivered orders
export interface OrderReviewToken {
    order_id: string;
    token: string | null;
    reviewed: boolean;
    expires_at: string | null;
}

export const useMyReviewTokens = (accessToken: string | null) => {
    return useQuery<OrderReviewToken[], Error>({
        queryKey: ["my-review-tokens", accessToken],
        queryFn: async () => {
            if (!accessToken) return [];
            const res = await fetch(`${API_BASE}/api/my-review-tokens`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!res.ok) {
                if (res.status === 401) return [];
                throw new Error("Failed to fetch review tokens");
            }
            const data = await res.json();
            return data.tokens || [];
        },
        enabled: !!accessToken,
        staleTime: 1000 * 60 * 2,
    });
};
