import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Store, Truck, CreditCard, Lock, Loader2, CheckCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

const AdminSettings = () => {
    const { settings, isLoading, updateSettings } = useStoreSettings();
    interface StoreSettingsForm {
        store_name: string;
        contact_email: string;
        contact_phone: string;
        free_shipping_threshold: string;
        fixed_shipping_price: string;
    }

    const { register, handleSubmit, reset } = useForm<StoreSettingsForm>();

    useEffect(() => {
        if (settings) {
            reset({
                ...settings,
                free_shipping_threshold: String(settings.free_shipping_threshold),
                fixed_shipping_price: String(settings.fixed_shipping_price)
            });
        }
    }, [settings, reset]);

    const onSubmit = async (data: StoreSettingsForm) => {
        await updateSettings({
            ...data,
            free_shipping_threshold: Number(data.free_shipping_threshold),
            fixed_shipping_price: Number(data.fixed_shipping_price)
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-pink-500" /></div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Configurações da Loja</h1>
                <p className="text-slate-500">Gerencie as informações principais do seu negócio</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="bg-white border-b border-slate-200 w-full justify-start rounded-none h-12 p-0">
                    <TabsTrigger value="general" className="h-12 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600">
                        <Store className="h-4 w-4 mr-2" /> Geral
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="h-12 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600">
                        <Truck className="h-4 w-4 mr-2" /> Frete
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="h-12 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600">
                        <CreditCard className="h-4 w-4 mr-2" /> Pagamentos
                    </TabsTrigger>
                    <TabsTrigger value="security" className="h-12 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-pink-600 data-[state=active]:text-pink-600">
                        <Lock className="h-4 w-4 mr-2" /> Segurança
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="general">
                        <Card>
                            <CardHeader>
                                <CardTitle>Informações da Loja</CardTitle>
                                <CardDescription>Detalhes visíveis para seus clientes no rodapé e e-mails.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Nome da Loja</Label>
                                            <Input {...register("store_name")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>E-mail de Contato</Label>
                                            <Input {...register("contact_email")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Telefone / WhatsApp</Label>
                                            <Input {...register("contact_phone")} />
                                        </div>
                                    </div>
                                    <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                                        <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="shipping">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configurações de Frete</CardTitle>
                                <CardDescription>Defina regras de frete grátis e valores fixos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Frete Grátis acima de (R$)</Label>
                                            <Input type="number" step="0.01" {...register("free_shipping_threshold")} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valor do Frete Fixo (R$)</Label>
                                            <Input type="number" step="0.01" {...register("fixed_shipping_price")} />
                                        </div>
                                    </div>
                                    <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
                                        <Save className="h-4 w-4 mr-2" /> Salvar Regras
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="payments">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configurações de Pagamento</CardTitle>
                                <CardDescription>Gerencie suas integrações de pagamento.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex items-start gap-3">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <CheckCircle className="h-5 w-5 text-green-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-green-800">Mercado Pago Ativado</h3>
                                        <p className="text-sm text-green-700 mt-1">
                                            Seus pagamentos via Pix e Cartão estão sendo processados automaticamente pelo Mercado Pago.
                                        </p>
                                    </div>
                                </div>

                                <div className="text-sm text-slate-500">
                                    Para alterar suas chaves de API, entre em contato com o suporte técnico.
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>Segurança</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100">
                                    Alterar Senha de Admin
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default AdminSettings;
