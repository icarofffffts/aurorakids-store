import { TrendingUp } from "lucide-react";

import { Order } from "@/context/OrderContext";

interface TopProductsProps {
    orders?: Order[];
}

export function TopProducts({ orders = [] }: TopProductsProps) {
    // Aggregate products from orders
    const productStats: Record<string, { name: string, category: string, sales: number, revenue: number, image: string }> = {};

    orders.forEach(order => {
        if (order.status === 'Cancelado') return;
        order.items.forEach(item => {
            if (!productStats[item.name]) {
                productStats[item.name] = {
                    name: item.name,
                    category: "Geral", // We might need to fetch real category if available in item, else "Geral"
                    sales: 0,
                    revenue: 0,
                    image: item.image || "📦"
                };
            }
            productStats[item.name].sales += item.quantity;
            productStats[item.name].revenue += item.price * item.quantity;
        });
    });

    const products = Object.values(productStats)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)
        .map(p => ({
            ...p,
            revenue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.revenue)
        }));

    if (products.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 animate-slide-up p-5 text-center text-slate-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50 text-pink-300" />
                <p>Nenhum produto vendido ainda.</p>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 animate-slide-up">
            <div className="p-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-pink-500" />
                    <h3 className="font-semibold text-slate-800">Produtos Mais Vendidos</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                    Top produtos do mês
                </p>
            </div>
            <div className="p-4 space-y-3">
                {products.map((product, index) => (
                    <div
                        key={product.name}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100 text-2xl">
                            {product.image}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                                {product.name}
                            </p>
                            <p className="text-sm text-slate-500">{product.category}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold text-slate-900">{product.revenue}</p>
                            <p className="text-xs text-slate-500">
                                {product.sales} vendas
                            </p>
                        </div>
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-bold">
                            {index + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
