import { useOrders, type Order } from "@/context/OrderContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, ShoppingBag, Truck, CheckCircle, Clock, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AdminOrders = () => {
    const { orders, updateOrderStatus } = useOrders();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOrders = orders.filter(o =>
        o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toString().includes(searchTerm)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Pendente": return "bg-yellow-100 text-yellow-800";
            case "Preparando": return "bg-blue-100 text-blue-800";
            case "Em trânsito": return "bg-sky-100 text-sky-800";
            case "Entregue": return "bg-green-100 text-green-800";
            case "Cancelado": return "bg-red-100 text-red-800";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    const getNextStatus = (current: Order["status"]): Order["status"] | null => {
        if (current === "Pendente") return "Preparando";
        if (current === "Preparando") return "Em trânsito";
        if (current === "Em trânsito") return "Entregue";
        return null; // End of flow
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gerenciar Pedidos</h1>
                    <p className="text-slate-500">Acompanhe as vendas em tempo real</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por cliente ou ID..."
                    className="pl-10 bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Card className="border-slate-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                    <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    Nenhum pedido encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders.map((order) => (
                                <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-mono text-xs opacity-70">
                                        #{order.id.slice(0, 8)}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {order.customer}
                                        <div className="text-xs text-slate-400 font-normal">{order.items.length} itens</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <Clock className="h-3 w-3" />
                                            {new Date(order.date).toLocaleDateString('pt-BR')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={cn("font-medium", getStatusColor(order.status))}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-800">
                                        R$ {order.total.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {(() => {
                                                const nextStatus = getNextStatus(order.status);
                                                if (!nextStatus) return null;

                                                return nextStatus === "Em trânsito" ? (
                                                    <div className="flex gap-2 flex-wrap justify-end">
                                                        <Input
                                                            placeholder="Cód. Rastreio"
                                                            className="w-32 h-8 text-xs"
                                                            id={`tracking-${order.id}`}
                                                        />
                                                        <Input
                                                            placeholder="Transportadora"
                                                            className="w-32 h-8 text-xs"
                                                            id={`carrier-${order.id}`}
                                                        />
                                                        <Input
                                                            placeholder="Servico"
                                                            className="w-28 h-8 text-xs"
                                                            id={`service-${order.id}`}
                                                        />
                                                        <Input
                                                            placeholder="Link (opcional)"
                                                            className="w-40 h-8 text-xs"
                                                            id={`url-${order.id}`}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                              className="h-8 text-xs gap-1 border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200"
                                                            onClick={() => {
                                                                const input = document.getElementById(`tracking-${order.id}`) as HTMLInputElement;
                                                                const code = input?.value;
                                                                if (!code) {
                                                                    alert("Por favor, insira o código de rastreio para enviar.");
                                                                    return;
                                                                }
                                                                const carrier = (document.getElementById(`carrier-${order.id}`) as HTMLInputElement | null)?.value || '';
                                                                const service = (document.getElementById(`service-${order.id}`) as HTMLInputElement | null)?.value || '';
                                                                const url = (document.getElementById(`url-${order.id}`) as HTMLInputElement | null)?.value || '';
                                                                updateOrderStatus(order.id, "Em trânsito", code, {
                                                                    carrierName: carrier,
                                                                    carrierService: service,
                                                                    trackingUrl: url,
                                                                });
                                                            }}
                                                        >
                                                            <Truck className="h-3 w-3" />
                                                            Enviar
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs gap-1 border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                                                        onClick={() => updateOrderStatus(order.id, nextStatus)}
                                                    >
                                                        <CheckCircle className="h-3 w-3" />
                                                        Mover p/ {nextStatus}
                                                    </Button>
                                                );
                                            })()}

                                            {order.status !== "Cancelado" && order.status !== "Entregue" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                                    onClick={() => {
                                                        if (confirm("Tem certeza que deseja cancelar este pedido?")) {
                                                            updateOrderStatus(order.id, "Cancelado");
                                                        }
                                                    }}
                                                    title="Cancelar Pedido"
                                                >
                                                    <XCircle className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

export default AdminOrders;
