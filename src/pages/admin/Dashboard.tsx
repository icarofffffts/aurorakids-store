
import {
    ShoppingCart,
    Package,
    Users,
    DollarSign,
    TrendingUp,
    Calendar,
} from "lucide-react";
import { MetricCard } from "@/components/admin/MetricCard";
import { RecentOrders } from "@/components/admin/RecentOrders";
import { TopProducts } from "@/components/admin/TopProducts";
import { SalesChart } from "@/components/admin/SalesChart";
import { StockAlert } from "@/components/admin/StockAlert";
import { Button } from "@/components/ui/button";
import { useOrders } from "@/context/OrderContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AdminDashboard = () => {
    const { orders } = useOrders();
    const [stats, setStats] = useState({
        products: 0,
        customers: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
            const { count: customerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            setStats({
                products: productCount || 0,
                customers: customerCount || 0
            });
        };
        fetchStats();
    }, []);

    // Derived stats from orders
    const validOrders = orders.filter(o => o.status !== 'Cancelado');
    const totalRevenue = validOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length; // Count all, or just valid? Usually all orders count as "orders", revenue is what varies. Let's keep total orders.

    // Calculate simple stats vs "last month" (mock comparison logic for now or implement real if easy)
    // For now, static labels for comparison or simple logic
    const todayOrders = orders.filter(o => {
        const today = new Date().toISOString().split('T')[0];
        return o.date.startsWith(today);
    }).length;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Olá, Admin! 👋
                    </h1>
                    <p className="text-slate-500">
                        Aqui está o resumo da sua loja hoje
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50">
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">Hoje: {new Date().toLocaleDateString()}</span>
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Receita Total"
                    value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                    change="Vendas aprovadas"
                    changeType="positive"
                    icon={DollarSign}
                    variant="primary"
                />
                <MetricCard
                    title="Pedidos"
                    value={totalOrders.toString()}
                    change={`+${todayOrders} hoje`}
                    changeType="positive"
                    icon={ShoppingCart}
                    variant="secondary"
                />
                <MetricCard
                    title="Produtos"
                    value={stats.products.toString()}
                    change="Cadastrados"
                    changeType="neutral"
                    icon={Package}
                    variant="accent"
                />
                <MetricCard
                    title="Clientes"
                    value={stats.customers.toString()}
                    change="Registrados"
                    changeType="positive"
                    icon={Users}
                    variant="success"
                />
            </div>

            {/* Charts and Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart - 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    <StockAlert />
                    <SalesChart orders={orders} />
                </div>

                {/* Top Products - 1 column */}
                <div>
                    <TopProducts orders={orders} />
                </div>

                {/* Recent Orders - Full width */}
                <div className="lg:col-span-3">
                    <RecentOrders />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
