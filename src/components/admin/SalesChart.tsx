import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import { Order } from "@/context/OrderContext";

interface SalesChartProps {
    orders?: Order[];
}

export function SalesChart({ orders = [] }: SalesChartProps) {
    // Process orders to get last 7 days data
    const data = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d;
    }).map(date => {
        const dayStr = date.toLocaleDateString('pt-BR', { weekday: 'short' });
        const dateStr = date.toISOString().split('T')[0];

        const dayOrders = orders.filter(o =>
            o.date.startsWith(dateStr) && o.status !== 'Cancelado'
        );

        return {
            day: dayStr.charAt(0).toUpperCase() + dayStr.slice(1),
            vendas: dayOrders.reduce((sum, o) => sum + o.total, 0),
            pedidos: dayOrders.length
        };
    });
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 animate-slide-up">
            <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Vendas da Semana</h3>
                <p className="text-sm text-slate-500">
                    Desempenho dos últimos 7 dias
                </p>
            </div>
            <div className="p-5">
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#db2777" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#db2777" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b", fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#64748b", fontSize: 12 }}
                            tickFormatter={(value) => `R$${value / 1000}k`}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white border border-slate-100 rounded-lg shadow-xl p-3">
                                            <p className="font-semibold text-slate-800">{label}</p>
                                            <p className="text-sm text-pink-600">
                                                Vendas: R$ {payload[0].value?.toLocaleString("pt-BR")}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                Pedidos: {payload[0].payload.pedidos}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="vendas"
                            stroke="#db2777"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorVendas)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
