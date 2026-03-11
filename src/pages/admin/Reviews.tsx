import { useState } from "react";
import {
    Star,
    CheckCircle2,
    XCircle,
    Clock,
    Trash2,
    MessageSquare,
    Loader2,
    Filter,
    Search,
} from "lucide-react";
import { useAdminReviews, useUpdateReview, useDeleteReview, Review } from "@/hooks/useReviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const AdminReviews = () => {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [responseText, setResponseText] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const { data: reviews, isLoading } = useAdminReviews(statusFilter === "all" ? undefined : statusFilter);
    const updateMutation = useUpdateReview();
    const deleteMutation = useDeleteReview();

    const filteredReviews = reviews?.filter((r) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            r.customer_name.toLowerCase().includes(q) ||
            r.comment.toLowerCase().includes(q) ||
            (r.product_name && r.product_name.toLowerCase().includes(q))
        );
    });

    const handleApprove = async (id: string) => {
        await updateMutation.mutateAsync({ id, status: "approved" });
    };

    const handleReject = async (id: string) => {
        await updateMutation.mutateAsync({ id, status: "rejected" });
    };

    const handleRespond = async () => {
        if (!selectedReview || !responseText.trim()) return;
        await updateMutation.mutateAsync({
            id: selectedReview.id,
            admin_response: responseText,
            status: "approved",
        });
        setSelectedReview(null);
        setResponseText("");
    };

    const handleDelete = async (id: string) => {
        await deleteMutation.mutateAsync(id);
        setDeleteConfirm(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprovada
                    </Badge>
                );
            case "rejected":
                return (
                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejeitada
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                    </Badge>
                );
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Avaliacoes</h1>
                    <p className="text-slate-500">Gerencie as avaliacoes dos clientes</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-48"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="pending">Pendentes</SelectItem>
                            <SelectItem value="approved">Aprovadas</SelectItem>
                            <SelectItem value="rejected">Rejeitadas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total", count: reviews?.length || 0, color: "bg-slate-100 text-slate-700" },
                    {
                        label: "Pendentes",
                        count: reviews?.filter((r) => r.status === "pending").length || 0,
                        color: "bg-yellow-100 text-yellow-700",
                    },
                    {
                        label: "Aprovadas",
                        count: reviews?.filter((r) => r.status === "approved").length || 0,
                        color: "bg-green-100 text-green-700",
                    },
                    {
                        label: "Rejeitadas",
                        count: reviews?.filter((r) => r.status === "rejected").length || 0,
                        color: "bg-red-100 text-red-700",
                    },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl p-4 ${stat.color}`}>
                        <p className="text-2xl font-bold">{stat.count}</p>
                        <p className="text-sm opacity-80">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Reviews List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : !filteredReviews?.length ? (
                <div className="text-center py-12 bg-white rounded-xl">
                    <Star className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhuma avaliacao encontrada</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReviews.map((review) => (
                        <div key={review.id} className="bg-white rounded-xl p-5 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-semibold text-slate-800">{review.customer_name}</span>
                                        {getStatusBadge(review.status)}
                                        <span className="text-xs text-slate-400">{formatDate(review.created_at)}</span>
                                    </div>

                                    <div className="flex items-center gap-1 mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 ${
                                                    i < review.rating
                                                        ? "fill-yellow-400 text-yellow-400"
                                                        : "text-slate-200"
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    {review.title && <p className="font-medium text-slate-700 mb-1">{review.title}</p>}
                                    <p className="text-slate-600">{review.comment}</p>

                                    {review.product_name && (
                                        <p className="text-sm text-primary mt-2">Produto: {review.product_name}</p>
                                    )}

                                    {(review.store_reply || review.admin_response) && (
                                        <div className="mt-3 pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-r-lg">
                                            <p className="text-sm font-medium text-primary">Resposta da loja:</p>
                                            <p className="text-sm text-slate-600">{review.store_reply || review.admin_response}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {review.status === "pending" && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                                onClick={() => handleApprove(review.id)}
                                                disabled={updateMutation.isPending}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Aprovar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleReject(review.id)}
                                                disabled={updateMutation.isPending}
                                            >
                                                <XCircle className="h-4 w-4 mr-1" />
                                                Rejeitar
                                            </Button>
                                        </>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setSelectedReview(review);
                                            setResponseText(review.store_reply || review.admin_response || "");
                                        }}
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => setDeleteConfirm(review.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Respond Dialog */}
            <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Responder Avaliacao</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                            <p className="font-medium text-slate-700">{selectedReview?.customer_name}</p>
                            <p className="text-sm text-slate-600">{selectedReview?.comment}</p>
                        </div>
                        <Textarea
                            placeholder="Escreva sua resposta..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedReview(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleRespond} disabled={!responseText.trim() || updateMutation.isPending}>
                            {updateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Enviar Resposta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Avaliacao</DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-600">Tem certeza que deseja excluir esta avaliacao? Esta acao nao pode ser desfeita.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminReviews;
