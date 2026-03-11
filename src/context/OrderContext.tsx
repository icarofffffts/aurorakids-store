import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface OrderItem {
    id: number;
    name: string;
    quantity: number;
    size: string;
    color?: string;
    price: number;
    image: string;
}

export interface Order {
    id: string;
    customer: string;
    customerPhone?: string;
    items: OrderItem[];
    subtotal?: number;
    discount?: number;
    couponCode?: string;
    total: number;
    status: "Pendente" | "Preparando" | "Em trânsito" | "Entregue" | "Cancelado";
    date: string;
    paymentMethod: string;
    address: string;
    trackingCode?: string;
    trackingUrl?: string;
    carrierName?: string;
    carrierService?: string;
    shippedAt?: string;
    userId?: string;
}

type CreateOrderResult = {
    orderId: string;
    subtotal: number;
    discount: number;
    total: number;
    couponCode: string | null;
};

interface OrderContextType {
    orders: Order[];
    addOrder: (order: Omit<Order, "id" | "date" | "status">) => Promise<CreateOrderResult>;
    updateOrderStatus: (
        orderId: string,
        status: Order["status"],
        trackingCode?: string,
        shipping?: { carrierName?: string; carrierService?: string; trackingUrl?: string }
    ) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
    const [orders, setOrders] = useState<Order[]>([]);

    type OrderItemRow = {
        id: number;
        order_id: string;
        product_name: string;
        quantity: number;
        size: string;
        price: number;
        image: string;
    };

    const fetchOrders = async () => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
                setOrders([]);
                return;
            }

            const isAdminUi = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
            const url = isAdminUi ? '/api/admin/orders' : '/api/orders/my';

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const raw = await response.text();
            if (!response.ok) {
                throw new Error(raw || `HTTP ${response.status}`);
            }

            const parsed = JSON.parse(raw) as { orders?: Order[] };
            setOrders(Array.isArray(parsed.orders) ? parsed.orders : []);
        } catch (e) {
            console.error('fetchOrders error:', e);
            setOrders([]);
        }
    };

    useEffect(() => {
        fetchOrders();
        const t = setInterval(fetchOrders, 30000);
        return () => clearInterval(t);
    }, []);

    const addOrder = async (newOrderData: Omit<Order, "id" | "date" | "status">): Promise<CreateOrderResult> => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
                throw new Error("Sessao expirada. Faça login novamente.");
            }

            const response = await fetch('/api/orders/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    customer_name: newOrderData.customer,
                    customer_phone: newOrderData.customerPhone || null,
                    address: newOrderData.address,
                    payment_method: newOrderData.paymentMethod,
                    coupon_code: newOrderData.couponCode || null,
                    items: newOrderData.items.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        size: item.size,
                        color: item.color || null,
                    })),
                })
            });

            const raw = await response.text();
            let data: CreateOrderResult | { error?: string };
            try {
                data = JSON.parse(raw) as CreateOrderResult;
            } catch {
                data = { error: raw };
            }

            if (!response.ok || !('orderId' in data)) {
                const errMsg = (data as { error?: string }).error || raw || `HTTP ${response.status}`;
                throw new Error(errMsg);
            }

            return data as CreateOrderResult;
        } catch (error: unknown) {
            console.error("Error creating order:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            toast.error(errorMessage);
            throw error;
        }
    };

    const updateOrderStatus = async (
        orderId: string,
        status: Order["status"],
        trackingCode?: string,
        shipping?: { carrierName?: string; carrierService?: string; trackingUrl?: string }
    ) => {
        try {
            if (!supabase) throw new Error("Cliente Supabase não inicializado.");

            const isAdminUi = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

            // If sending tracking code, route through backend to also notify n8n.
            if (trackingCode !== undefined) {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;
                if (!token) throw new Error("Sessão expirada. Faça login novamente.");

                const response = await fetch("/api/admin/ship_order", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        orderId,
                        trackingCode,
                        status,
                        carrierName: shipping?.carrierName || null,
                        carrierService: shipping?.carrierService || null,
                        trackingUrl: shipping?.trackingUrl || null,
                    })
                });

                const raw = await response.text();
                let data: { ok?: boolean; error?: string };
                try {
                    data = JSON.parse(raw) as { ok?: boolean; error?: string };
                } catch {
                    data = { error: raw };
                }

                if (!response.ok || data.error) {
                    throw new Error(data.error || "Falha ao enviar codigo de rastreio.");
                }

                toast.success("Codigo de rastreio enviado ao cliente!");
                fetchOrders();
                return;
            }

            // Admin status changes should go through backend (bypass RLS + notify customer)
            if (isAdminUi) {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;
                if (!token) throw new Error("Sessão expirada. Faça login novamente.");

                const response = await fetch("/api/admin/update_order_status", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ orderId, status })
                });

                const raw = await response.text();
                let data: { ok?: boolean; error?: string };
                try {
                    data = JSON.parse(raw) as { ok?: boolean; error?: string };
                } catch {
                    data = { error: raw };
                }

                if (!response.ok || data.error) {
                    throw new Error(data.error || "Falha ao atualizar pedido.");
                }

                toast.success(`Pedido atualizado para ${status}`);
                fetchOrders();
                return;
            }

            const updateData: { status: Order["status"]; tracking_code?: string | null } = { status };
            if (trackingCode !== undefined) {
                updateData.tracking_code = trackingCode || null;
            }

            const { error } = await supabase
                .from("orders")
                .update(updateData)
                .eq("id", orderId);

            if (error) throw error;
            toast.success(`Pedido atualizado para ${status}`);
            fetchOrders();
        } catch (error) {
            console.error("Error updating status:", error);
            const message = error instanceof Error ? error.message : "Erro ao atualizar status.";
            toast.error(message);
        }
    };

    return (
        <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrders = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error("useOrders must be used within an OrderProvider");
    }
    return context;
};
