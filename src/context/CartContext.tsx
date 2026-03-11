import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { Product } from '../data/products';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface CartItem extends Product {
    quantity: number;
    selectedSize: string;
    selectedColor?: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, size: string, color?: string) => void;
    removeFromCart: (productId: number, size: string, color?: string) => void;
    updateQuantity: (productId: number, size: string, color: string | undefined, quantity: number) => void;
    clearCart: () => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    subtotal: number;
    discount: number;
    total: number;
    itemsCount: number;
    couponCode: string;
    applyCoupon: (code: string) => Promise<void>;
    clearCoupon: () => void;
    shippingCost: number;
    shippingName: string;
    setShipping: (cost: number, name: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [shippingCost, setShippingCost] = useState(0);
    const [shippingName, setShippingName] = useState('');

    const COUPON_KEY = 'delu-coupon';

    // Load from LocalStorage
    useEffect(() => {
        const savedCart = localStorage.getItem('delu-cart');
        if (savedCart) {
            try {
                setItems(JSON.parse(savedCart));
            } catch (e) {
                console.error('Error loading cart:', e);
            }
        }

        const savedCoupon = localStorage.getItem(COUPON_KEY);
        if (savedCoupon) {
            try {
                const parsed = JSON.parse(savedCoupon) as { code?: string; discount?: number };
                if (typeof parsed.code === 'string') setCouponCode(parsed.code);
                if (typeof parsed.discount === 'number' && Number.isFinite(parsed.discount)) setDiscount(parsed.discount);
            } catch {
                // ignore
            }
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        localStorage.setItem('delu-cart', JSON.stringify(items));
    }, [items]);

    useEffect(() => {
        try {
            if (!couponCode) {
                localStorage.removeItem(COUPON_KEY);
                return;
            }
            localStorage.setItem(COUPON_KEY, JSON.stringify({ code: couponCode, discount }));
        } catch {
            // ignore
        }
    }, [couponCode, discount]);

    const addToCart = (product: Product, size: string, color?: string) => {
        setItems(prev => {
            const existing = prev.find(item =>
                item.id === product.id &&
                item.selectedSize === size &&
                item.selectedColor === color
            );
            if (existing) {
                toast.success(`Quantidade atualizada: ${product.name}`);
                return prev.map(item =>
                    item.id === product.id && item.selectedSize === size && item.selectedColor === color
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            toast.success(`${product.name} adicionado à sacola!`);
            setIsOpen(true); // Open cart automatically
            return [...prev, { ...product, quantity: 1, selectedSize: size, selectedColor: color }];
        });
    };

    const removeFromCart = (productId: number, size: string, color?: string) => {
        setItems(prev => prev.filter(item => !(
            item.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
        )));
        toast.info('Item removido.');
    };

    const updateQuantity = (productId: number, size: string, color: string | undefined, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId, size, color);
            return;
        }
        setItems(prev => prev.map(item =>
            item.id === productId && item.selectedSize === size && item.selectedColor === color
                ? { ...item, quantity }
                : item
        ));
    };

    const clearCoupon = () => {
        setCouponCode('');
        setDiscount(0);
        try {
            localStorage.removeItem(COUPON_KEY);
        } catch {
            // ignore
        }
    };

    const clearCart = () => {
        setItems([]);
        clearCoupon();
    };

    const subtotal = useMemo(
        () => items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
        [items]
    );

    // Keep discount within bounds.
    useEffect(() => {
        const next = Math.max(0, Math.min(subtotal, discount));
        if (next !== discount) setDiscount(next);
        if (subtotal <= 0 && couponCode) clearCoupon();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subtotal, discount]);

    const total = Math.max(0, subtotal - discount) + shippingCost;
    const itemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

    const applyCoupon = async (codeRaw: string) => {
        const code = String(codeRaw || '').trim().toUpperCase();
        if (!code) {
            toast.error('Digite um cupom');
            return;
        }

        if (!items.length || subtotal <= 0) {
            toast.error('Seu carrinho esta vazio');
            return;
        }

        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;

            const res = await fetch('/api/public/coupons/quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    code,
                    items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
                }),
            });
            const raw = await res.text();
            if (!res.ok) {
                throw new Error(raw || `HTTP ${res.status}`);
            }
            const parsed = JSON.parse(raw) as { valid?: boolean; error?: string; coupon?: { code?: string }; discount?: number };

            if (!parsed?.valid || !parsed.coupon?.code) {
                toast.error(parsed?.error || 'Cupom invalido');
                return;
            }

            const nextDiscount = Number(parsed.discount);
            const bounded = Math.max(0, Math.min(subtotal, Number.isFinite(nextDiscount) ? nextDiscount : 0));

            setCouponCode(String(parsed.coupon.code));
            setDiscount(Number(bounded.toFixed(2)));
            toast.success(`Cupom aplicado: ${String(parsed.coupon.code)}`);
            return;
        } catch (e) {
            console.warn('applyCoupon: backend quote failed; trying Supabase directly', e);
        }

        // Fallback: validate via Supabase (requires coupons SELECT policy)
        const { data, error } = await supabase
            .from('coupons')
            .select('code,discount_type,discount_value,active')
            .eq('code', code)
            .eq('active', true)
            .limit(1)
            .maybeSingle();
        if (error || !data) {
            toast.error('Cupom invalido');
            return;
        }

        const value = Number(data.discount_value);
        const nextDiscount =
            data.discount_type === 'percentage'
                ? (subtotal * value) / 100
                : value;
        const bounded = Math.max(0, Math.min(subtotal, Number.isFinite(nextDiscount) ? nextDiscount : 0));

        setCouponCode(data.code);
        setDiscount(Number(bounded.toFixed(2)));
        toast.success(`Cupom aplicado: ${data.code}`);
    };

    // Re-quote coupon when cart changes to keep rules consistent.
    useEffect(() => {
        if (!couponCode) return;
        if (!items.length || subtotal <= 0) {
            clearCoupon();
            return;
        }

        let cancelled = false;
        const t = setTimeout(async () => {
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token;

                const res = await fetch('/api/public/coupons/quote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        code: couponCode,
                        items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
                    }),
                });

                const raw = await res.text();
                if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
                const parsed = JSON.parse(raw) as { valid?: boolean; error?: string; coupon?: { code?: string }; discount?: number };

                if (cancelled) return;
                if (!parsed?.valid || !parsed.coupon?.code) {
                    const reason = parsed?.error ? `: ${parsed.error}` : '';
                    clearCoupon();
                    toast.info(`Cupom removido${reason}`);
                    return;
                }

                const nextDiscount = Number(parsed.discount);
                const bounded = Math.max(0, Math.min(subtotal, Number.isFinite(nextDiscount) ? nextDiscount : 0));
                if (couponCode !== String(parsed.coupon.code)) setCouponCode(String(parsed.coupon.code));
                if (Number(bounded.toFixed(2)) !== Number(discount.toFixed(2))) setDiscount(Number(bounded.toFixed(2)));
            } catch {
                // ignore: don't break checkout if API is temporarily down
            }
        }, 350);

        return () => {
            cancelled = true;
            clearTimeout(t);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, subtotal, couponCode]);

    return (
        <CartContext.Provider value={{
            items,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            isOpen,
            setIsOpen,
            subtotal,
            discount,
            total,
            itemsCount,
            couponCode,
            applyCoupon,
            clearCoupon,
            shippingCost,
            shippingName,
            setShipping: (cost: number, name: string) => {
                setShippingCost(cost);
                setShippingName(name);
            },
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
