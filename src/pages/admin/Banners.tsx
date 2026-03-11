import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image as ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    BannerPosition,
    CampaignBanner,
    useAdminBanners,
    useCreateBanner,
    useDeleteBanner,
    useUpdateBanner,
} from "@/hooks/useBanners";

function toLocalInputValue(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function fromLocalInputValue(local: string) {
    if (!local) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

const defaultForm: Partial<CampaignBanner> & {
    start_at_local: string;
    end_at_local: string;
} = {
    title: "",
    subtitle: "",
    button_label: "",
    button_url: "",
    image_url: "",
    bg_color: "#1e293b",
    text_color: "#ffffff",
    button_color: "#ffffff",
    button_text_color: "#1e293b",
    position: "hero",
    priority: 0,
    is_active: true,
    start_at_local: toLocalInputValue(new Date().toISOString()),
    end_at_local: "",
};

export default function AdminBanners() {
    const [positionFilter, setPositionFilter] = useState<"all" | BannerPosition>("all");
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<CampaignBanner | null>(null);
    const [form, setForm] = useState(defaultForm);
    const [uploading, setUploading] = useState(false);

    const activeParam = activeFilter === "all" ? undefined : activeFilter === "active";
    const positionParam = positionFilter === "all" ? undefined : positionFilter;

    const { data: banners = [], isLoading, error } = useAdminBanners(positionParam, activeParam);
    const createMutation = useCreateBanner();
    const updateMutation = useUpdateBanner();
    const deleteMutation = useDeleteBanner();

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return banners;
        return banners.filter((b) => {
            const hay = `${b.title || ""} ${b.subtitle || ""}`.toLowerCase();
            return hay.includes(q);
        });
    }, [banners, search]);

    const handlePositionFilterChange = (v: string) => {
        if (v === "all" || v === "hero" || v === "bar" || v === "popup") {
            setPositionFilter(v);
        }
    };

    const handleActiveFilterChange = (v: string) => {
        if (v === "all" || v === "active" || v === "inactive") {
            setActiveFilter(v);
        }
    };

    const resetForm = () => {
        setEditing(null);
        setForm({ ...defaultForm });
    };

    const openCreate = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (banner: CampaignBanner) => {
        setEditing(banner);
        setForm({
            id: banner.id,
            title: banner.title || "",
            subtitle: banner.subtitle || "",
            button_label: banner.button_label || "",
            button_url: banner.button_url || "",
            image_url: banner.image_url || "",
            bg_color: banner.bg_color || "#1e293b",
            text_color: banner.text_color || "#ffffff",
            button_color: banner.button_color || "#ffffff",
            button_text_color: banner.button_text_color || "#1e293b",
            position: banner.position,
            priority: Number(banner.priority || 0),
            is_active: Boolean(banner.is_active),
            start_at_local: toLocalInputValue(banner.start_at),
            end_at_local: toLocalInputValue(banner.end_at),
        });
        setDialogOpen(true);
    };

    const handleUploadImage = async (file: File) => {
        setUploading(true);
        try {
            const ext = file.name.split(".").pop() || "png";
            const filePath = `campaign-banners/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
            const publicUrl = data.publicUrl;
            if (!publicUrl) throw new Error("Falha ao obter URL publica");

            setForm((prev) => ({ ...prev, image_url: publicUrl }));
            toast.success("Imagem enviada com sucesso!");
        } catch (e) {
            console.error(e);
            toast.error("Erro ao enviar imagem. Verifique o bucket 'avatars' no Supabase Storage.");
        } finally {
            setUploading(false);
        }
    };

    const submit = async () => {
        try {
            if (!form.title || String(form.title).trim().length < 2) {
                toast.error("Titulo e obrigatorio (min 2 caracteres)");
                return;
            }

            const payload: Partial<CampaignBanner> = {
                title: String(form.title).trim(),
                subtitle: form.subtitle ? String(form.subtitle).trim() : null,
                button_label: form.button_label ? String(form.button_label).trim() : null,
                button_url: form.button_url ? String(form.button_url).trim() : null,
                image_url: form.image_url ? String(form.image_url).trim() : null,
                bg_color: form.bg_color || "#1e293b",
                text_color: form.text_color || "#ffffff",
                button_color: form.button_color || "#ffffff",
                button_text_color: form.button_text_color || "#1e293b",
                position: (form.position as BannerPosition) || "hero",
                priority: Number(form.priority || 0),
                is_active: Boolean(form.is_active),
                start_at: fromLocalInputValue(form.start_at_local) || new Date().toISOString(),
                end_at: fromLocalInputValue(form.end_at_local),
            };

            if (editing?.id) {
                await updateMutation.mutateAsync({ id: editing.id, ...payload });
                toast.success("Banner atualizado!");
            } else {
                await createMutation.mutateAsync(payload);
                toast.success("Banner criado!");
            }

            setDialogOpen(false);
            resetForm();
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : "Falha ao salvar banner");
        }
    };

    const remove = async (id: string) => {
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Banner removido");
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : "Falha ao remover banner");
        }
    };

    const formatDate = (iso?: string | null) => {
        if (!iso) return "-";
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleString("pt-BR");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Banners de Campanha</h1>
                    <p className="text-slate-500">Hero, faixa fixa e popup (totalmente editavel)</p>
                </div>
                <Button onClick={openCreate} className="font-bold">
                    <Plus className="h-4 w-4 mr-2" /> Novo banner
                </Button>
            </div>

            <Card className="border-slate-100 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Lista
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 md:items-end">
                        <div className="flex-1">
                            <Label>Buscar</Label>
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Titulo ou subtitulo" />
                        </div>
                        <div className="w-full md:w-48">
                            <Label>Posicao</Label>
                            <Select value={positionFilter} onValueChange={handlePositionFilterChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="hero">Hero</SelectItem>
                                    <SelectItem value="bar">Faixa</SelectItem>
                                    <SelectItem value="popup">Popup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-48">
                            <Label>Status</Label>
                            <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="active">Ativos</SelectItem>
                                    <SelectItem value="inactive">Inativos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                            Erro: {error.message}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="py-10 flex items-center justify-center text-slate-600">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">Nenhum banner encontrado.</div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((b) => {
                                const impressions = Number(b.impressions || 0);
                                const clicks = Number(b.clicks || 0);
                                const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

                                return (
                                    <div key={b.id} className="border border-slate-100 rounded-2xl p-4 bg-white">
                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="font-bold text-slate-900 truncate">{b.title}</div>
                                                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                                                        {b.position}
                                                    </Badge>
                                                    {b.is_active ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">ativo</Badge>
                                                    ) : (
                                                        <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200">inativo</Badge>
                                                    )}
                                                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">prio {b.priority}</Badge>
                                                </div>
                                                {b.subtitle && <div className="text-sm text-slate-600 mt-1">{b.subtitle}</div>}
                                                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-500">
                                                    <div>
                                                        <span className="font-bold text-slate-700">Inicio:</span> {formatDate(b.start_at)}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-700">Fim:</span> {formatDate(b.end_at)}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-700">CTR:</span> {ctr.toFixed(1)}% ({clicks}/{impressions})
                                                    </div>
                                                </div>

                                                {b.button_url && (
                                                    <a
                                                        href={b.button_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                                                    >
                                                        Abrir link <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
                                                    <Pencil className="h-4 w-4 mr-1" /> Editar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => remove(b.id)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Preview */}
                                        <div className="mt-4 rounded-2xl overflow-hidden border border-slate-100">
                                            <div
                                                className="p-4 md:p-6"
                                                style={{
                                                    backgroundColor: b.bg_color || "#0f172a",
                                                    color: b.text_color || "#ffffff",
                                                }}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="font-fredoka text-2xl md:text-3xl font-bold">
                                                            {b.title}
                                                        </div>
                                                        {b.subtitle && <div className="opacity-90 mt-1">{b.subtitle}</div>}
                                                    </div>
                                                    {b.button_label && b.button_url && (
                                                        <div>
                                                            <div
                                                                className="inline-flex items-center justify-center rounded-full px-6 py-2 font-bold"
                                                                style={{
                                                                    backgroundColor: b.button_color || "#ffffff",
                                                                    color: b.button_text_color || "#0f172a",
                                                                }}
                                                            >
                                                                {b.button_label}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onOpenChange={(v) => {
                    setDialogOpen(v);
                    if (!v) resetForm();
                }}
            >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="-mx-6 px-6 pb-3 sticky top-0 bg-background z-10 border-b">
                        <DialogTitle>{editing ? "Editar banner" : "Novo banner"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Titulo</Label>
                            <Input
                                value={String(form.title || "")}
                                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                placeholder="Ex: Nova Colecao DeLu"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Posicao</Label>
                            <Select
                                value={(form.position as BannerPosition) || "hero"}
                                onValueChange={(v) => setForm((p) => ({ ...p, position: v as BannerPosition }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hero">Hero</SelectItem>
                                    <SelectItem value="bar">Faixa</SelectItem>
                                    <SelectItem value="popup">Popup</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <Label>Subtitulo / Mensagem</Label>
                            <Textarea
                                value={String(form.subtitle || "")}
                                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                                placeholder="Texto curto para reforcar a campanha"
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Texto do botao</Label>
                            <Input
                                value={String(form.button_label || "")}
                                onChange={(e) => setForm((p) => ({ ...p, button_label: e.target.value }))}
                                placeholder="Ex: Ver ofertas"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>URL do botao</Label>
                            <Input
                                value={String(form.button_url || "")}
                                onChange={(e) => setForm((p) => ({ ...p, button_url: e.target.value }))}
                                placeholder="Ex: /products?category=Promoções"
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <Label>Imagem (URL)</Label>
                            <div className="flex flex-col md:flex-row gap-3 md:items-center">
                                <Input
                                    value={String(form.image_url || "")}
                                    onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                                    placeholder="Cole uma URL publica ou envie um arquivo"
                                />
                                <div className="flex items-center gap-2">
                                    <label className="inline-flex">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) void handleUploadImage(file);
                                            }}
                                        />
                                        <Button type="button" variant="outline" disabled={uploading}>
                                            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                                            Enviar
                                        </Button>
                                    </label>
                                    {form.image_url && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-slate-600"
                                            onClick={() => setForm((p) => ({ ...p, image_url: "" }))}
                                        >
                                            Remover
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {form.image_url && (
                                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                                    <img
                                        src={String(form.image_url)}
                                        alt="Preview"
                                        className="w-full h-40 object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Prioridade (0-100)</Label>
                            <Input
                                type="number"
                                value={String(form.priority ?? 0)}
                                onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ativo</Label>
                            <div className="flex items-center gap-3 h-10">
                                <Switch
                                    checked={Boolean(form.is_active)}
                                    onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                                />
                                <span className="text-sm text-slate-600">{form.is_active ? "Sim" : "Nao"}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Inicio</Label>
                            <Input
                                type="datetime-local"
                                value={String(form.start_at_local || "")}
                                onChange={(e) => setForm((p) => ({ ...p, start_at_local: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fim (opcional)</Label>
                            <Input
                                type="datetime-local"
                                value={String(form.end_at_local || "")}
                                onChange={(e) => setForm((p) => ({ ...p, end_at_local: e.target.value }))}
                            />
                        </div>

                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cor de fundo</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={String(form.bg_color || "")}
                                        onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))}
                                        placeholder="#1e293b"
                                    />
                                    <input
                                        type="color"
                                        value={String(form.bg_color || "#1e293b")}
                                        onChange={(e) => setForm((p) => ({ ...p, bg_color: e.target.value }))}
                                        className="h-10 w-12 rounded-lg border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cor do texto</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={String(form.text_color || "")}
                                        onChange={(e) => setForm((p) => ({ ...p, text_color: e.target.value }))}
                                        placeholder="#ffffff"
                                    />
                                    <input
                                        type="color"
                                        value={String(form.text_color || "#ffffff")}
                                        onChange={(e) => setForm((p) => ({ ...p, text_color: e.target.value }))}
                                        className="h-10 w-12 rounded-lg border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cor do botao</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={String(form.button_color || "")}
                                        onChange={(e) => setForm((p) => ({ ...p, button_color: e.target.value }))}
                                        placeholder="#ffffff"
                                    />
                                    <input
                                        type="color"
                                        value={String(form.button_color || "#ffffff")}
                                        onChange={(e) => setForm((p) => ({ ...p, button_color: e.target.value }))}
                                        className="h-10 w-12 rounded-lg border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Cor do texto do botao</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={String(form.button_text_color || "")}
                                        onChange={(e) => setForm((p) => ({ ...p, button_text_color: e.target.value }))}
                                        placeholder="#1e293b"
                                    />
                                    <input
                                        type="color"
                                        value={String(form.button_text_color || "#1e293b")}
                                        onChange={(e) => setForm((p) => ({ ...p, button_text_color: e.target.value }))}
                                        className="h-10 w-12 rounded-lg border border-slate-200"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 -mx-6 px-6 pt-4 pb-2 sticky bottom-0 bg-background/95 backdrop-blur border-t flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setDialogOpen(false);
                                resetForm();
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={submit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="font-bold"
                        >
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Salvar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
