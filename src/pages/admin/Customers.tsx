import { useOrders } from "@/context/OrderContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Users, Search, Mail, Phone, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CustomerProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    created_at: string;
}

const AdminCustomers = () => {
    const { orders } = useOrders();
    const [searchTerm, setSearchTerm] = useState("");
    const [profiles, setProfiles] = useState<CustomerProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error("Error fetching profiles:", error);
            // Fallback: If RLS prevents reading profiles, we might need a different approach
            // But Admin should have access.
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const handleDeleteCustomer = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir o cliente ${name}? Seus dados de perfil serão removidos.`)) {
            try {
                const { error } = await supabase.from('profiles').delete().eq('id', id);
                if (error) throw error;

                toast.success("Cliente removido com sucesso.");
                setProfiles(prev => prev.filter(p => p.id !== id));
            } catch (error) {
                console.error("Error deleting customer:", error);
                toast.error("Erro ao excluir cliente.");
            }
        }
    };

    // Merge logic: Use profiles as base, enrich with order stats
    const customers = profiles.map(profile => {
        const customerOrders = orders.filter(o => o.userId === profile.id);
        const totalSpent = customerOrders.reduce((acc, curr) => acc + Number(curr.total), 0);
        const lastOrder = customerOrders.length > 0
            ? customerOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
            : profile.created_at; // Fallback to joined date

        return {
            ...profile,
            totalSpent,
            ordersCount: customerOrders.length,
            lastOrder,
            avatar: profile.name ? profile.name.substring(0, 2).toUpperCase() : "??"
        };
    });

    const filteredCustomers = customers.filter(c =>
        (c.name && c.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Meus Clientes</h1>
                    <p className="text-slate-500">Base de clientes cadastrados ({customers.length})</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nome ou email..."
                    className="pl-10 bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer) => (
                    <Card key={customer.id} className="p-4 hover:shadow-md transition-shadow border-slate-100 bg-white relative group">

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                                title="Excluir Cliente"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-start justify-between pr-8">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 bg-pink-100 text-pink-600 border border-pink-200">
                                    <AvatarFallback>{customer.avatar}</AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                    <h3 className="font-semibold text-slate-800 truncate" title={customer.name}>{customer.name || "Sem Nome"}</h3>
                                    <p className="text-xs text-slate-500 truncate" title={customer.email}>{customer.email || "Sem Email"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                                <span className="block text-xs text-slate-400 font-medium">Pedidos</span>
                                <span className="font-bold text-slate-700 text-lg">{customer.ordersCount}</span>
                            </div>
                            <div className="bg-green-50 p-2 rounded-lg text-center border border-green-100">
                                <span className="block text-xs text-green-600 font-medium">Gasto Total</span>
                                <span className="font-bold text-green-700 text-lg">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(customer.totalSpent)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <button className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-center gap-1">
                                <Mail className="h-3 w-3" /> Email
                            </button>
                            <button className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors flex items-center justify-center gap-1">
                                <Phone className="h-3 w-3" /> WhatsApp
                            </button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default AdminCustomers;
