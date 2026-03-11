import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProducts } from "@/hooks/useProducts";
import { ProductForm } from "@/components/admin/ProductForm";

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    image: string;
    description: string;
    stock_quantity: number;
    low_stock_threshold: number;
    sizes?: string[];
    colors?: string[];
}

const AdminProducts = () => {
    const { data: products = [], isLoading, refetch } = useProducts();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [seeding, setSeeding] = useState(false);

    const handleSeedProducts = async () => {
        if (seeding) return;
        if (!confirm('Adicionar varios produtos de exemplo ao catalogo? (Nao remove produtos existentes)')) return;

        setSeeding(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) throw new Error('Sessao expirada. Faça login novamente.');

            const response = await fetch('/api/admin/products/seed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ count: 96 }),
            });

            const raw = await response.text();
            let parsed: { ok?: boolean; inserted?: number; skipped?: number; total?: number; error?: string } = {};
            try {
                parsed = JSON.parse(raw);
            } catch {
                parsed = { error: raw };
            }

            if (!response.ok || parsed.error) {
                throw new Error(parsed.error || `HTTP ${response.status}`);
            }

            toast.success(`Catalogo atualizado: ${parsed.inserted || 0} inseridos, ${parsed.skipped || 0} ja existiam.`);
            refetch();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Falha ao adicionar produtos';
            toast.error(msg);
        } finally {
            setSeeding(false);
        }
    };

    // Filter products
    const filteredProducts = (products as Product[]).filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir este produto?")) return;

        try {
            if (!supabase) throw new Error("Supabase não conectado");

            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", id);

            if (error) throw error;

            toast.success("Produto excluído!");
            refetch();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir produto");
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    };

    const handleSuccess = () => {
        setIsDialogOpen(false);
        setEditingProduct(null);
        refetch();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gerenciar Produtos</h1>
                    <p className="text-slate-500">Total de {products.length} produtos cadastrados</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingProduct(null); // Clear editing state on close
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-pink-600 hover:bg-pink-700" onClick={() => setEditingProduct(null)}>
                            <Plus className="h-4 w-4" /> Novo Produto
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? "Editar Produto" : "Adicionar Novo Produto"}</DialogTitle>
                        </DialogHeader>
                        <ProductForm
                            onSuccess={handleSuccess}
                            initialData={editingProduct}
                            onClose={() => setIsDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>

                <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleSeedProducts}
                    disabled={seeding}
                >
                    {seeding ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adicionando...
                        </>
                    ) : (
                        'Adicionar produtos'
                    )}
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nome ou categoria..."
                    className="pl-10 bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Preço</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                                        <p>Carregando produtos...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                                    <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">Nenhum produto encontrado.</p>
                                    <p className="text-sm opacity-70">Cadastre seu primeiro produto acima!</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-100 overflow-hidden flex-shrink-0">
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/100?text=Foto';
                                                    }}
                                                />
                                            </div>
                                            <span className="truncate max-w-[200px]" title={product.name}>{product.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {product.category}
                                        </span>
                                    </TableCell>
                                    <TableCell className="font-semibold text-slate-700">
                                        R$ {product.price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                            onClick={() => handleEdit(product)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(product.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default AdminProducts;
