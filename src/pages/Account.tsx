import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useOrders, Order, OrderItem } from "@/context/OrderContext";
import { useMyReviewTokens } from "@/hooks/useReviews";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, User, LogOut, MapPin, Camera, Save, Loader2, Copy, Star, MessageSquare } from "lucide-react";
import InputMask from "react-input-mask";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SafeImage } from "@/components/ui/safe-image";

const Account = () => {
    // Removed 'profile' distinct from 'user', assuming 'user' holds definitions of UserProfile.
    const { user, logout, updateProfile, uploadAvatar } = useAuth();
    const { orders } = useOrders();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Get access token for API calls
    useEffect(() => {
        const getToken = async () => {
            const { data } = await supabase.auth.getSession();
            setAccessToken(data.session?.access_token || null);
        };
        getToken();
    }, [user]);

    // Fetch review tokens for delivered orders
    const { data: reviewTokens } = useMyReviewTokens(accessToken);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        address_zip: "",
        address_street: "",
        address_number: "",
        address_complement: "",
        address_district: "",
        address_city: "",
        address_state: ""
    });

    // Populate form data when user loads. User IS the profile.
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                cpf: user.cpf || "",
                address_zip: user.address_zip || "",
                address_street: user.address_street || "",
                address_number: user.address_number || "",
                address_complement: user.address_complement || "",
                address_district: user.address_district || "",
                address_city: user.address_city || "",
                address_state: user.address_state || ""
            });
        }
    }, [user]);

    // Handle CEP blur to auto-fill address
    const handleZipBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const zip = e.target.value.replace(/\D/g, "");
        if (zip.length === 8) {
            setIsLoading(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address_street: data.logradouro,
                        address_district: data.bairro,
                        address_city: data.localidade,
                        address_state: data.uf
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateProfile({
                name: formData.name,
                phone: formData.phone,
                cpf: formData.cpf,
                // Passing flat fields directly as per UserProfile interface
                address_zip: formData.address_zip,
                address_street: formData.address_street,
                address_number: formData.address_number,
                address_complement: formData.address_complement,
                address_district: formData.address_district,
                address_city: formData.address_city,
                address_state: formData.address_state
            });
            toast({
                title: "Perfil atualizado!",
                description: "Suas informações foram salvas com sucesso.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar",
                description: "Não foi possível salvar suas informações.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            await uploadAvatar(file);
            toast({ title: "Foto atualizada com sucesso!" });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao atualizar foto", description: "Tente novamente." });
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
    };

    const formatDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleString('pt-BR');
    };

    const copyToClipboard = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast({ title: `${label} copiado!` });
        } catch {
            toast({ variant: "destructive", title: "Nao foi possivel copiar" });
        }
    };

    // Filter orders for current user (supports older orders without userId)
    const myOrders = orders.filter(o => {
        if (!user) return false;
        if (o.userId) return o.userId === user.id;
        return o.customer === user.name;
    });

    // Calculate pending reviews
    const pendingReviewOrders = useMemo(() => {
        if (!reviewTokens) return [];
        return reviewTokens.filter(t => !t.reviewed && t.token);
    }, [reviewTokens]);

    // Get review token for a specific order
    const getReviewToken = (orderId: string) => {
        if (!reviewTokens) return null;
        const tokenInfo = reviewTokens.find(t => t.order_id === orderId);
        if (tokenInfo && !tokenInfo.reviewed && tokenInfo.token) {
            return tokenInfo.token;
        }
        return null;
    };

    // Check if order was already reviewed
    const isOrderReviewed = (orderId: string) => {
        if (!reviewTokens) return false;
        const tokenInfo = reviewTokens.find(t => t.order_id === orderId);
        return tokenInfo?.reviewed ?? false;
    };

    const handleCancelOrder = async (orderId: string) => {
        toast({ title: "Solicitação enviada", description: `Cancelamento solicitado para o pedido #${orderId}` });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-fredoka flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Left Sidebar - Profile Card */}
                    <div className="w-full md:w-80 space-y-6">
                        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden text-center p-6 bg-white">
                            <div className="relative mx-auto w-24 h-24 mb-4 group">
                                <Avatar className="w-24 h-24 border-4 border-pink-50">
                                    <AvatarImage src={user?.avatar_url || ""} />
                                    <AvatarFallback className="bg-pink-100 text-pink-400 text-2xl font-bold">
                                        {user?.name?.substring(0, 2).toUpperCase() || "US"}
                                    </AvatarFallback>
                                </Avatar>
                                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                                    <Camera className="h-6 w-6" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                </label>
                            </div>
                            <h2 className="font-bold text-xl text-slate-800">{user?.name || "Olá, Visitante"}</h2>
                            <p className="text-sm text-slate-500 mb-6">{user?.email}</p>

                            <Button variant="outline" className="w-full border-slate-200 text-slate-600 hover:text-red-500 hover:bg-red-500 hover:border-red-200" onClick={logout}>
                                <LogOut className="mr-2 h-4 w-4" /> Sair da conta
                            </Button>
                        </Card>
                    </div>

                    {/* Main Content Tabs */}
                    <div className="flex-1 w-full">
                        <Tabs defaultValue="orders" className="w-full">
                            <TabsList className="w-full justify-start bg-transparent p-0 border-b border-slate-200 mb-6 rounded-none h-auto">
                                <TabsTrigger value="orders" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-bold text-slate-500 data-[state=active]:text-primary text-base">
                                    <Package className="mr-2 h-4 w-4" /> Meus Pedidos
                                </TabsTrigger>
                                <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-bold text-slate-500 data-[state=active]:text-primary text-base">
                                    <User className="mr-2 h-4 w-4" /> Meus Dados
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="orders" className="mt-0 focus-visible:ring-0">
                                {/* Review Reminder Banner */}
                                {pendingReviewOrders.length > 0 && (
                                    <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Star className="h-6 w-6 text-yellow-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">
                                                {pendingReviewOrders.length === 1
                                                    ? "Voce tem 1 pedido aguardando avaliacao!"
                                                    : `Voce tem ${pendingReviewOrders.length} pedidos aguardando avaliacao!`}
                                            </h3>
                                            <p className="text-sm text-slate-600">
                                                Sua opiniao e muito importante para nos e ajuda outras familias a escolherem.
                                            </p>
                                        </div>
                                        <MessageSquare className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                                    </div>
                                )}

                                {myOrders.length === 0 ? (
                                    <Card className="p-12 text-center rounded-3xl border-slate-100 shadow-sm">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Package className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum pedido ainda</h3>
                                        <p className="text-slate-500">Faça sua primeira compra e acompanhe tudo por aqui!</p>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {myOrders.map((order) => (
                                            <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant={
                                                                order.status === 'Entregue' ? 'default' :
                                                                    order.status === 'Cancelado' ? 'destructive' :
                                                                        'secondary'
                                                            } className={
                                                                order.status === 'Entregue' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                                                    order.status === 'Cancelado' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                                                        'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                            }>
                                                                {order.status}
                                                            </Badge>
                                                            <span className="text-xs text-slate-400">#{order.id.slice(0, 8)}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-500">Realizado em {new Date(order.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-900 text-lg mr-2">
                                                            {formatCurrency(Number(order.total))}
                                                        </span>

                                                        {order.status === 'Pendente' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-100"
                                                                onClick={() => handleCancelOrder(order.id)}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                        )}

                                                        {/* Review Button for delivered orders */}
                                                        {order.status === 'Entregue' && (
                                                            (() => {
                                                                const token = getReviewToken(order.id);
                                                                const reviewed = isOrderReviewed(order.id);
                                                                if (reviewed) {
                                                                    return (
                                                                        <Badge className="bg-green-50 text-green-600 border border-green-200">
                                                                            <Star className="h-3 w-3 mr-1 fill-green-500" />
                                                                            Avaliado
                                                                        </Badge>
                                                                    );
                                                                }
                                                                if (token) {
                                                                    return (
                                                                        <Link to={`/review/${token}`}>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 border-yellow-200"
                                                                            >
                                                                                <Star className="h-4 w-4 mr-1" />
                                                                                Avaliar
                                                                            </Button>
                                                                        </Link>
                                                                    );
                                                                }
                                                                return null;
                                                            })()
                                                        )}

                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedOrder(order);
                                                                setIsDetailsOpen(true);
                                                            }}
                                                        >
                                                            Ver Detalhes
                                                        </Button>
                                                    </div>
                                                </div>

                                                    <div className="flex gap-2 border-t pt-4 overflow-x-auto pb-2">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="flex-shrink-0 w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden relative group">
                                                                <SafeImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                                <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[10px] px-1 rounded-tl-md">x{item.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="profile" className="mt-0 focus-visible:ring-0">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h1 className="text-2xl font-bold text-slate-900">Meus Dados</h1>
                                    </div>

                                    <form onSubmit={handleSaveProfile} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 border-b pb-2">
                                                <User className="h-5 w-5 text-primary" /> Informações Pessoais
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Nome Completo</Label>
                                                    <Input
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        placeholder="Seu nome completo"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>E-mail</Label>
                                                    <Input value={formData.email} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>CPF</Label>
                                                    <InputMask
                                                        mask="999.999.999-99"
                                                        value={formData.cpf}
                                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                                    >
                                                        {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => (
                                                            <Input
                                                                {...inputProps}
                                                                placeholder="000.000.000-00"
                                                            />
                                                        )}
                                                    </InputMask>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Telefone / WhatsApp</Label>
                                                    <InputMask
                                                        mask="(99) 99999-9999"
                                                        value={formData.phone}
                                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    >
                                                        {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => (
                                                            <Input
                                                                {...inputProps}
                                                                placeholder="(11) 99999-9999"
                                                            />
                                                        )}
                                                    </InputMask>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4">
                                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 border-b pb-2">
                                                <MapPin className="h-5 w-5 text-primary" /> Endereço de Entrega
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="space-y-2 md:col-span-1">
                                                    <Label>CEP</Label>
                                                    <InputMask
                                                        mask="99999-999"
                                                        value={formData.address_zip}
                                                        onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                                                        onBlur={handleZipBlur}
                                                    >
                                                        {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => (
                                                            <Input
                                                                {...inputProps}
                                                                placeholder="00000-000"
                                                            />
                                                        )}
                                                    </InputMask>
                                                </div>
                                                <div className="space-y-2 md:col-span-3">
                                                    <Label>Cidade (UF)</Label>
                                                    <div className="flex gap-2">
                                                        <Input className="flex-1" value={formData.address_city} readOnly placeholder="Cidade" />
                                                        <Input className="w-16 text-center" value={formData.address_state} readOnly placeholder="UF" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 md:col-span-3">
                                                    <Label>Rua / Logradouro</Label>
                                                    <Input
                                                        value={formData.address_street}
                                                        onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-1">
                                                    <Label>Número</Label>
                                                    <Input
                                                        value={formData.address_number}
                                                        onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-2 md:col-span-2">
                                                    <Label>Complemento</Label>
                                                    <Input
                                                        value={formData.address_complement}
                                                        onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                                                        placeholder="Apto, Bloco, etc."
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label>Bairro</Label>
                                                    <Input
                                                        value={formData.address_district}
                                                        onChange={(e) => setFormData({ ...formData, address_district: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto min-w-[200px] font-bold">
                                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Salvar Alterações
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            {/* Order Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-lg bg-white rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
                        <DialogDescription>
                            Acompanhe status, entrega e itens.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedOrder && (
                        <ScrollArea className="max-h-[70vh] pr-4">
                            <div className="space-y-4">
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <Badge variant={
                                            selectedOrder.status === 'Entregue' ? 'default' :
                                                selectedOrder.status === 'Cancelado' ? 'destructive' :
                                                    'secondary'
                                        } className={
                                            selectedOrder.status === 'Entregue' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                                selectedOrder.status === 'Cancelado' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                                    'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        }>
                                            {selectedOrder.status}
                                        </Badge>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Total</p>
                                            <p className="font-bold text-slate-900">{formatCurrency(Number(selectedOrder.total))}</p>
                                        </div>
                                    </div>

                                    <Separator className="my-3" />

                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-slate-500">Data</span>
                                            <span className="font-medium text-slate-800">{formatDateTime(selectedOrder.date)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-slate-500">Pagamento</span>
                                            <span className="font-medium text-slate-800">{selectedOrder.paymentMethod || 'Nao informado'}</span>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="text-slate-500">Entrega</span>
                                            <span className="font-medium text-slate-800 text-right">{selectedOrder.address || 'Nao informado'}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-slate-500">Rastreio</span>
                                            {selectedOrder.trackingCode ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs bg-white border border-slate-200 rounded-lg px-2 py-1">{selectedOrder.trackingCode}</span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 px-2"
                                                        onClick={() => copyToClipboard(selectedOrder.trackingCode!, 'Codigo de rastreio')}
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">Aguardando</span>
                                            )}
                                        </div>

                                        {(selectedOrder.carrierName || selectedOrder.carrierService) && (
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-slate-500">Transportadora</span>
                                                <span className="font-medium text-slate-800 text-right">
                                                    {selectedOrder.carrierName || 'Nao informado'}
                                                    {selectedOrder.carrierService ? ` (${selectedOrder.carrierService})` : ''}
                                                </span>
                                            </div>
                                        )}

                                        {selectedOrder.trackingUrl && (
                                            <div className="flex items-start justify-between gap-3">
                                                <span className="text-slate-500">Link</span>
                                                <a
                                                    href={selectedOrder.trackingUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm font-bold text-sky-700 hover:underline break-all text-right"
                                                >
                                                    Abrir rastreio
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900">Itens</h3>
                                    <span className="text-xs text-slate-500">{selectedOrder.items.length} item(ns)</span>
                                </div>
                                {selectedOrder.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 border-b border-slate-50 pb-4 last:border-0">
                                        <div className="h-16 w-16 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                            <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                                            <div className="flex justify-between items-center mt-1">
                                                <p className="text-xs text-slate-500">
                                                    {item.size && <span className="mr-2">Tam: {item.size}</span>}
                                                    {item.color && <span className="mr-2">Cor: {item.color}</span>}
                                                    <span>Qtd: {item.quantity}</span>
                                                </p>
                                                <p className="font-bold text-primary text-sm">
                                                    {formatCurrency(item.price)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Separator className="my-2" />

                                {selectedOrder.subtotal !== undefined && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-sm">Subtotal</span>
                                        <span className="font-bold text-slate-900">{formatCurrency(Number(selectedOrder.subtotal))}</span>
                                    </div>
                                )}

                                {selectedOrder.discount !== undefined && Number(selectedOrder.discount) > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500 text-sm">Desconto{selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ''}</span>
                                        <span className="font-bold text-emerald-700">- {formatCurrency(Number(selectedOrder.discount))}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-sm">Total do pedido</span>
                                    <span className="font-bold text-slate-900">{formatCurrency(Number(selectedOrder.total))}</span>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
            <Footer />
        </div>
    );
};

export default Account;
