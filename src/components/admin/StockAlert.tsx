import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";

interface ProductMinimal {
    id: string;
    name: string;
    stock_quantity: number;
    low_stock_threshold: number;
    image: string;
}

export function StockAlert() {
    const [lowStockProducts, setLowStockProducts] = useState<ProductMinimal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLowStock = async () => {
            // Logic: we can't do complex math comparison in basic Supabase filter easily effectively without exact match or range
            // simplified: fetch all (optimized with limit if needed) and filter in client or use a stored procedure
            // For small stores, filtering client side is fine.
            // Better: select products where stock_quantity <= low_stock_threshold (requires logical operator or RP)
            // Since we can't reliably do "column A <= column B" in standard JS SDK simple query, lets fetch all active products

            const { data } = await supabase.from('products').select('id, name, stock_quantity, low_stock_threshold, image');

            if (data) {
                const alerts = data.filter(p => (p.stock_quantity || 0) <= (p.low_stock_threshold || 5));
                setLowStockProducts(alerts.slice(0, 5)); // show top 5
            }
            setLoading(false);
        };

        fetchLowStock();
    }, []);

    if (loading) return null;
    if (lowStockProducts.length === 0) return null;

    return (
        <Card className="border-l-4 border-l-amber-500 shadow-sm animate-fade-in">
            <CardHeader className="py-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                    Alerta de Estoque Baixo
                </CardTitle>
            </CardHeader>
            <CardContent className="py-4 pt-2">
                <div className="space-y-3">
                    {lowStockProducts.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-2 bg-amber-50 rounded-lg">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 flex-shrink-0 bg-white rounded-md border border-amber-200 overflow-hidden">
                                    <SafeImage src={p.image} alt={p.name} className="h-full w-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium text-sm text-slate-800 truncate">{p.name}</p>
                                    <p className="text-xs text-amber-600 font-semibold">
                                        Restam apenas {p.stock_quantity} un.
                                    </p>
                                </div>
                            </div>
                            <Link to={`/admin/products?edit=${p.id}`}>
                                <Badge variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400">
                                    Repor
                                </Badge>
                            </Link>
                        </div>
                    ))}
                    <Link to="/admin/products" className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 mt-2">
                        Ver todo o inventário <ArrowRight className="h-3 w-3" />
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
