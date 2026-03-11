import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Tag, Megaphone, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Coupon {
    id: string;
    name?: string | null;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    active: boolean;
    used_count: number;
    starts_at?: string | null;
    ends_at?: string | null;
    min_subtotal?: number | null;
    max_uses?: number | null;
    max_uses_per_user?: number | null;
    eligible_categories?: string[] | null;
    eligible_product_ids?: number[] | null;
}

type Campaign = {
    id: string;
    title: string;
    message: string;
    image_url?: string | null;
    badge?: string | null;
    cta_text?: string | null;
    cta_url?: string | null;
    show_on_home: boolean;
    show_once: boolean;
    priority: number;
    starts_at: string;
    ends_at?: string | null;
    active: boolean;
};

function toLocalInputValue(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    // datetime-local expects local time; convert ISO (UTC) to local wall time.
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

const getAdminToken = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessao expirada. Faça login novamente.");
    return token;
};

export default function AdminMarketing() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [campaignLoading, setCampaignLoading] = useState(true);
    const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [campaignMetrics, setCampaignMetrics] = useState<Record<string, { views: number; clicks: number; ctr: number }>>({});

    const nowLocal = useMemo(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }, []);

    // New Coupon State
    const [newCoupon, setNewCoupon] = useState({
        name: "",
        code: "",
        discount_type: "percentage",
        discount_value: "",
        starts_at: nowLocal,
        ends_at: "",
        min_subtotal: "",
        max_uses: "",
        max_uses_per_user: "",
        eligible_categories: "",
        eligible_product_ids: "",
    });

    const parseCsv = (v: string) =>
        v
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getAdminToken();
            const response = await fetch('/api/admin/coupons', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const raw = await response.text();
            if (!response.ok) {
                if (response.status === 401) throw new Error('Nao autenticado');
                if (response.status === 403) throw new Error('Sem permissao de admin');
                throw new Error(raw || `HTTP ${response.status}`);
            }
            const data = JSON.parse(raw) as Coupon[];
            setCoupons(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : '';
            if (msg === 'Sem permissao de admin') {
                toast.error('Acesso negado: configure ADMIN_EMAILS/ADMIN_USER_IDS ou profiles.role=admin');
            } else if (msg === 'Nao autenticado') {
                toast.error('Sessao expirada. Faça login novamente.');
            } else {
                toast.error('Erro ao carregar cupons (verifique /api/admin/coupons e supabase_coupons_v2.sql)');
            }
            setCoupons([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCoupons();
    }, [fetchCoupons]);

    const fetchCampaigns = useCallback(async () => {
        setCampaignLoading(true);
        try {
            const token = await getAdminToken();
            const response = await fetch('/api/admin/campaigns', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const raw = await response.text();
            if (!response.ok) {
                if (response.status === 401) throw new Error('Nao autenticado');
                if (response.status === 403) throw new Error('Sem permissao de admin');
                throw new Error(raw || `HTTP ${response.status}`);
            }
            const data = JSON.parse(raw) as Campaign[];
            setCampaigns(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : '';
            if (msg === 'Sem permissao de admin') {
                toast.error('Acesso negado: configure ADMIN_EMAILS/ADMIN_USER_IDS ou profiles.role=admin');
            } else if (msg === 'Nao autenticado') {
                toast.error('Sessao expirada. Faça login novamente.');
            } else if (/failed to fetch|networkerror|fetch failed/i.test(msg)) {
                toast.error('API /api indisponivel. Inicie o backend (`npm run dev:server` ou `npm run dev:full`).');
            } else {
                toast.error("Erro ao carregar campanhas (verifique /api/admin/campaigns e supabase_campaigns.sql)");
            }
            setCampaigns([]);
        } finally {
            setCampaignLoading(false);
        }
    }, []);

    const fetchCampaignMetrics = useCallback(async () => {
        try {
            const token = await getAdminToken();
            const response = await fetch('/api/admin/marketing/metrics?days=30', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const raw = await response.text();
            if (!response.ok) {
                throw new Error(raw || `HTTP ${response.status}`);
            }
            const parsed = JSON.parse(raw) as { campaigns?: Array<{ id: string; views: number; clicks: number; ctr: number }> };
            const map: Record<string, { views: number; clicks: number; ctr: number }> = {};
            for (const c of parsed.campaigns || []) {
                if (!c?.id) continue;
                map[c.id] = {
                    views: Number(c.views || 0),
                    clicks: Number(c.clicks || 0),
                    ctr: Number(c.ctr || 0),
                };
            }
            setCampaignMetrics(map);
        } catch {
            // fail soft
            setCampaignMetrics({});
        }
    }, []);

    useEffect(() => {
        fetchCampaigns();
        fetchCampaignMetrics();
    }, [fetchCampaigns, fetchCampaignMetrics]);

    const handleCreateCoupon = async () => {
        if (!newCoupon.code || !newCoupon.discount_value) {
            toast.error("Preencha os campos obrigatorios");
            return;
        }

        try {
            const token = await getAdminToken();

            const payload = {
                name: newCoupon.name.trim() || null,
                code: newCoupon.code.trim().toUpperCase(),
                discount_type: newCoupon.discount_type,
                discount_value: Number(newCoupon.discount_value),
                active: true,
                starts_at: new Date(newCoupon.starts_at).toISOString(),
                ends_at: newCoupon.ends_at ? new Date(newCoupon.ends_at).toISOString() : null,
                min_subtotal: newCoupon.min_subtotal ? Number(newCoupon.min_subtotal) : 0,
                max_uses: newCoupon.max_uses ? Number(newCoupon.max_uses) : null,
                max_uses_per_user: newCoupon.max_uses_per_user ? Number(newCoupon.max_uses_per_user) : null,
                eligible_categories: newCoupon.eligible_categories ? parseCsv(newCoupon.eligible_categories) : null,
                eligible_product_ids: newCoupon.eligible_product_ids
                    ? parseCsv(newCoupon.eligible_product_ids).map(v => Number(v)).filter(v => Number.isFinite(v))
                    : null,
            };

            const response = await fetch('/api/admin/coupons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const raw = await response.text();
            if (!response.ok) {
                const parsed = (() => {
                    try { return JSON.parse(raw) as { error?: string }; } catch { return null; }
                })();
                throw new Error(parsed?.error || raw || `HTTP ${response.status}`);
            }

            toast.success("Cupom criado com sucesso!");
            setIsDialogOpen(false);
            setNewCoupon({
                name: "",
                code: "",
                discount_type: "percentage",
                discount_value: "",
                starts_at: nowLocal,
                ends_at: "",
                min_subtotal: "",
                max_uses: "",
                max_uses_per_user: "",
                eligible_categories: "",
                eligible_product_ids: "",
            });
            fetchCoupons();
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : '';
            toast.error(msg ? `Erro ao criar cupom: ${msg}` : 'Erro ao criar cupom');
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este cupom?")) return;

        try {
            const token = await getAdminToken();
            const response = await fetch(`/api/admin/coupons/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(await response.text());
            toast.success("Cupom excluído!");
            fetchCoupons();
        } catch (e) {
            console.error(e);
            toast.error("Erro ao excluir cupom");
        }
    };

    const toggleStatus = async (coupon: Coupon) => {
        try {
            const token = await getAdminToken();
            const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ active: !coupon.active })
            });
            if (!response.ok) throw new Error(await response.text());
            fetchCoupons();
        } catch (e) {
            console.error(e);
            toast.error("Erro ao atualizar status");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Marketing</h1>
                    <p className="text-slate-500">Gerencie campanhas e códigos promocionais</p>
                </div>
            </div>

            <Tabs defaultValue="campaigns" className="w-full">
                <TabsList className="bg-white border border-slate-200">
                    <TabsTrigger value="campaigns" className="gap-2">
                        <Megaphone className="h-4 w-4" /> Campanhas
                    </TabsTrigger>
                    <TabsTrigger value="coupons" className="gap-2">
                        <Tag className="h-4 w-4" /> Cupons
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="campaigns" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-pink-500" />
                                Campanhas (Popup)
                            </CardTitle>

                            <Dialog open={isCampaignDialogOpen} onOpenChange={(open) => {
                                setIsCampaignDialogOpen(open);
                                if (!open) setEditingCampaign(null);
                            }}>
                                <DialogTrigger asChild>
                                    <Button className="bg-pink-600 hover:bg-pink-700" onClick={() => setEditingCampaign(null)}>
                                        <Plus className="mr-2 h-4 w-4" /> Nova Campanha
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>{editingCampaign ? 'Editar Campanha' : 'Criar Campanha'}</DialogTitle>
                                    </DialogHeader>

                                    <CampaignForm
                                        initial={editingCampaign}
                                        onClose={() => setIsCampaignDialogOpen(false)}
                                         onSaved={() => {
                                             setIsCampaignDialogOpen(false);
                                             setEditingCampaign(null);
                                             fetchCampaigns();
                                             fetchCampaignMetrics();
                                         }}
                                     />
                                </DialogContent>
                            </Dialog>
                        </CardHeader>

                        <CardContent>
                            {campaignLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-pink-600" /></div>
                            ) : (
                                <Table>
                                     <TableHeader>
                                         <TableRow>
                                             <TableHead>Titulo</TableHead>
                                             <TableHead>Ativa</TableHead>
                                             <TableHead>Inicio</TableHead>
                                             <TableHead>Fim</TableHead>
                                             <TableHead>Metricas (30d)</TableHead>
                                             <TableHead className="text-right">Acoes</TableHead>
                                         </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                        {campaigns.map((c) => {
                                            const m = campaignMetrics[c.id] || { views: 0, clicks: 0, ctr: 0 };
                                            return (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">
                                                    <div className="truncate max-w-[420px]" title={c.title}>{c.title}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[420px]" title={c.message}>{c.message}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={c.active ? 'bg-emerald-500' : 'bg-slate-300'}>
                                                        {c.active ? 'Ativa' : 'Inativa'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">{new Date(c.starts_at).toLocaleString('pt-BR')}</TableCell>
                                                <TableCell className="text-sm text-slate-600">{c.ends_at ? new Date(c.ends_at).toLocaleString('pt-BR') : '-'}</TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    <div className="font-bold">{m.views} views</div>
                                                    <div className="text-xs text-slate-400">{m.clicks} clicks · {m.ctr}%</div>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setEditingCampaign(c);
                                                            setIsCampaignDialogOpen(true);
                                                        }}
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={async () => {
                                                            if (!confirm('Excluir esta campanha?')) return;
                                                            try {
                                                                const token = await getAdminToken();
                                                                const response = await fetch(`/api/admin/campaigns/${c.id}`, {
                                                                    method: 'DELETE',
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                });
                                                                 if (!response.ok) throw new Error(await response.text());
                                                                 toast.success('Campanha excluida');
                                                                 fetchCampaigns();
                                                                 fetchCampaignMetrics();
                                                             } catch (e) {
                                                                 console.error(e);
                                                                 const msg = e instanceof Error ? e.message : '';
                                                                 if (/failed to fetch|networkerror|fetch failed/i.test(msg)) {
                                                                     toast.error('API /api indisponivel. Inicie o backend (`npm run dev:server` ou `npm run dev:full`).');
                                                                 } else {
                                                                     toast.error('Falha ao excluir campanha');
                                                                 }
                                                             }
                                                         }}
                                                         title="Excluir"
                                                     >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                        })}
                                        {campaigns.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                                                    Nenhuma campanha cadastrada. Rode o SQL `supabase_campaigns.sql` e crie sua primeira.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="coupons" className="mt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Tag className="h-5 w-5 text-pink-500" />
                                Cupons
                            </CardTitle>

                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-pink-600 hover:bg-pink-700">
                                        <Plus className="mr-2 h-4 w-4" /> Novo Cupom
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Criar Novo Cupom</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Nome (opcional)</Label>
                                            <Input
                                                placeholder="Ex: Cupom de boas-vindas"
                                                value={newCoupon.name}
                                                onChange={e => setNewCoupon({ ...newCoupon, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Código do Cupom</Label>
                                            <Input
                                                placeholder="Ex: VERAO10"
                                                value={newCoupon.code}
                                                onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Tipo de Desconto</Label>
                                                <Select
                                                    value={newCoupon.discount_type}
                                                    onValueChange={v => setNewCoupon({ ...newCoupon, discount_type: v })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Valor do Desconto</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 10"
                                                    value={newCoupon.discount_value}
                                                    onChange={e => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Inicio</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={newCoupon.starts_at}
                                                    onChange={e => setNewCoupon({ ...newCoupon, starts_at: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Fim (opcional)</Label>
                                                <Input
                                                    type="datetime-local"
                                                    value={newCoupon.ends_at}
                                                    onChange={e => setNewCoupon({ ...newCoupon, ends_at: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>Minimo (R$)</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={newCoupon.min_subtotal}
                                                    onChange={e => setNewCoupon({ ...newCoupon, min_subtotal: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Max usos</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="(opcional)"
                                                    value={newCoupon.max_uses}
                                                    onChange={e => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Max por usuario</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="(opcional)"
                                                    value={newCoupon.max_uses_per_user}
                                                    onChange={e => setNewCoupon({ ...newCoupon, max_uses_per_user: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Categorias elegiveis (CSV)</Label>
                                            <Input
                                                placeholder="Ex: Meninos,Meninas"
                                                value={newCoupon.eligible_categories}
                                                onChange={e => setNewCoupon({ ...newCoupon, eligible_categories: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Produtos elegiveis (IDs, CSV)</Label>
                                            <Input
                                                placeholder="Ex: 1,2,3"
                                                value={newCoupon.eligible_product_ids}
                                                onChange={e => setNewCoupon({ ...newCoupon, eligible_product_ids: e.target.value })}
                                            />
                                            <p className="text-xs text-slate-400">Se categorias e produtos estiverem vazios, o cupom vale para o carrinho inteiro.</p>
                                        </div>

                                        <Button onClick={handleCreateCoupon} className="w-full bg-pink-600 hover:bg-pink-700">
                                            Criar Cupom
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-pink-600" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Desconto</TableHead>
                                            <TableHead>Validade</TableHead>
                                            <TableHead>Regras</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coupons.map((coupon) => (
                                            <TableRow key={coupon.id}>
                                                <TableCell className="font-medium">
                                                    <div className="font-mono text-pink-600">{coupon.code}</div>
                                                    {coupon.name && (
                                                        <div className="text-xs text-slate-500 truncate max-w-[320px]" title={coupon.name}>{coupon.name}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    <div>{coupon.starts_at ? new Date(coupon.starts_at).toLocaleDateString('pt-BR') : '-'}</div>
                                                    <div className="text-xs text-slate-400">{coupon.ends_at ? `ate ${new Date(coupon.ends_at).toLocaleDateString('pt-BR')}` : 'sem fim'}</div>
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600">
                                                    <div>{coupon.min_subtotal ? `Min: R$ ${Number(coupon.min_subtotal).toFixed(2)}` : 'Sem minimo'}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {coupon.max_uses ? `Max: ${coupon.max_uses}` : 'Max: -'}
                                                        {'  '}|{'  '}
                                                        {coupon.max_uses_per_user ? `Por usuario: ${coupon.max_uses_per_user}` : 'Por usuario: -'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={`cursor-pointer ${coupon.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                        onClick={() => toggleStatus(coupon)}
                                                    >
                                                        {coupon.active ? 'Ativo' : 'Inativo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCoupon(coupon.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {coupons.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                                    Nenhum cupom encontrado
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function CampaignForm({
    initial,
    onSaved,
    onClose,
}: {
    initial: Campaign | null;
    onSaved: () => void;
    onClose: () => void;
}) {
    const [submitting, setSubmitting] = useState(false);

    const nowLocal = useMemo(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }, []);

    const [form, setForm] = useState({
        title: initial?.title || "",
        message: initial?.message || "",
        image_url: initial?.image_url || "",
        badge: initial?.badge || "",
        cta_text: initial?.cta_text || "",
        cta_url: initial?.cta_url || "/products?category=Promoções",
        active: initial?.active ?? true,
        show_on_home: initial?.show_on_home ?? true,
        show_once: initial?.show_once ?? true,
        priority: String(initial?.priority ?? 0),
        starts_at: initial?.starts_at ? toLocalInputValue(initial.starts_at) : nowLocal,
        ends_at: initial?.ends_at ? toLocalInputValue(initial.ends_at) : "",
    });

    const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const getAdminToken = async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Sessao expirada. Faça login novamente.");
        return token;
    };

    const submit = async () => {
        if (!form.title.trim() || !form.message.trim()) {
            toast.error('Titulo e mensagem sao obrigatorios');
            return;
        }
        setSubmitting(true);
        try {
            const token = await getAdminToken();
            const payload = {
                title: form.title.trim(),
                message: form.message.trim(),
                image_url: form.image_url.trim() || null,
                badge: form.badge.trim() || null,
                cta_text: form.cta_text.trim() || null,
                cta_url: form.cta_url.trim() || null,
                active: !!form.active,
                show_on_home: !!form.show_on_home,
                show_once: !!form.show_once,
                priority: Number(form.priority || 0),
                starts_at: new Date(form.starts_at).toISOString(),
                ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
            };

            const url = initial ? `/api/admin/campaigns/${initial.id}` : '/api/admin/campaigns';
            const method = initial ? 'PUT' : 'POST';
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 20000);

            let response: Response;
            try {
                response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });
            } finally {
                window.clearTimeout(timeoutId);
            }

            const raw = await response.text();
            if (!response.ok) {
                if (response.status === 401) throw new Error('Nao autenticado');
                if (response.status === 403) throw new Error('Sem permissao de admin');

                let msg = raw;
                try {
                    const parsed = JSON.parse(raw) as { error?: unknown };
                    if (parsed && typeof parsed.error === 'string') msg = parsed.error;
                } catch {
                    // ignore
                }
                throw new Error((msg || `HTTP ${response.status}`).slice(0, 220));
            }

            toast.success(initial ? 'Campanha atualizada' : 'Campanha criada');
            onSaved();
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : '';
            if (e instanceof DOMException && e.name === 'AbortError') {
                toast.error('Tempo esgotado ao salvar. Tente novamente.');
            } else if (/aborted|aborterror/i.test(msg)) {
                toast.error('Tempo esgotado ao salvar. Tente novamente.');
            } else
            if (/failed to fetch|networkerror|fetch failed/i.test(msg)) {
                toast.error('API /api indisponivel. Inicie o backend (`npm run dev:server` ou `npm run dev:full`).');
            } else if (msg === 'Sem permissao de admin') {
                toast.error('Acesso negado: configure ADMIN_EMAILS/ADMIN_USER_IDS ou profiles.role=admin');
            } else if (msg === 'Nao autenticado') {
                toast.error('Sessao expirada. Faça login novamente.');
            } else {
                toast.error(msg ? `Falha ao salvar campanha: ${msg}` : 'Falha ao salvar campanha (execute supabase_campaigns.sql)');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Titulo *</Label>
                    <Input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Ex: Semana de Ofertas" />
                </div>
                <div className="space-y-2">
                    <Label>Selo (badge)</Label>
                    <Input value={form.badge} onChange={e => setField('badge', e.target.value)} placeholder="Ex: 20% OFF" />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Mensagem *</Label>
                <Textarea value={form.message} onChange={e => setField('message', e.target.value)} placeholder="Descreva a promo..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Imagem (URL)</Label>
                    <Input value={form.image_url} onChange={e => setField('image_url', e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Input type="number" value={form.priority} onChange={e => setField('priority', e.target.value)} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>CTA Texto</Label>
                    <Input value={form.cta_text} onChange={e => setField('cta_text', e.target.value)} placeholder="Ver ofertas" />
                </div>
                <div className="space-y-2">
                    <Label>CTA Link</Label>
                    <Input value={form.cta_url} onChange={e => setField('cta_url', e.target.value)} placeholder="/products?category=Promoções" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Inicio</Label>
                    <Input type="datetime-local" value={form.starts_at} onChange={e => setField('starts_at', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Fim (opcional)</Label>
                    <Input type="datetime-local" value={form.ends_at} onChange={e => setField('ends_at', e.target.value)} />
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.active} onChange={e => setField('active', e.target.checked)} />
                    Ativa
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.show_on_home} onChange={e => setField('show_on_home', e.target.checked)} />
                    Mostrar no inicio
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.show_once} onChange={e => setField('show_once', e.target.checked)} />
                    Mostrar uma vez por usuario
                </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
                <Button className="bg-pink-600 hover:bg-pink-700" onClick={submit} disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Salvar'}
                </Button>
            </div>
        </div>
    );
}
