import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useOrders } from "@/context/OrderContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusStyles: Record<string, string> = {
    "Entregue": "bg-green-100 text-green-700 border-green-200",
    "Em trânsito": "bg-blue-100 text-blue-700 border-blue-200",
    "Preparando": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Pendente": "bg-orange-100 text-orange-700 border-orange-200",
    "Cancelado": "bg-red-100 text-red-700 border-red-200",
};

export function RecentOrders() {
    const { orders } = useOrders();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 animate-slide-up">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-slate-800">Pedidos Recentes</h3>
                    <p className="text-sm text-slate-500">
                        Últimas transações da sua loja
                    </p>
                </div>
                <span className="text-xs font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-600">
                    {orders.length} pedidos
                </span>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold">Pedido</TableHead>
                            <TableHead className="font-semibold">Cliente</TableHead>
                            <TableHead className="font-semibold">Produtos</TableHead>
                            <TableHead className="font-semibold">Valor</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold text-right">Data</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    Nenhum pedido realizado ainda.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-medium text-sky-700">
                                        {order.id}
                                    </TableCell>
                                    <TableCell className="font-medium">{order.customer}</TableCell>
                                    <TableCell className="max-w-[200px] truncate text-slate-500">
                                        {order.items.length > 1
                                            ? `${order.items[0].name} +${order.items.length - 1}`
                                            : order.items[0]?.name}
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-700">
                                        R$ {order.total.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`${statusStyles[order.status] || "bg-slate-100"} border shadow-sm`}
                                        >
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-500 text-sm">
                                        {new Date(order.date).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
