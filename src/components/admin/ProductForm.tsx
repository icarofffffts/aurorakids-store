import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming we have this or use Input
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";

// Schema validation
const productSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    price: z.coerce.number().min(0.01, "Preço deve ser maior que zero"),
    category: z.string().min(2, "Categoria obrigatória"),
    image: z.string().url("URL da imagem inválida"),
    description: z.string().optional(),
    stock_quantity: z.coerce.number().min(0, "Estoque não pode ser negativo"),
    low_stock_threshold: z.coerce.number().min(0, "Mínimo deve ser positivo"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    onSuccess: () => void;
    initialData?: ProductFormValues & { id: number; sizes?: string[]; colors?: string[] };
    onClose?: () => void;
}

export function ProductForm({ onSuccess, initialData, onClose }: ProductFormProps) {
    const [loading, setLoading] = useState(false);
    const [sizes, setSizes] = useState<string[]>(initialData?.sizes || ["P", "M", "G"]);
    const [colors, setColors] = useState<string[]>(initialData?.colors || []);
    const [newSize, setNewSize] = useState("");
    const [newColor, setNewColor] = useState("");

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: initialData || {
            name: "",
            price: 0,
            category: "",
            image: "",
            description: "",
            stock_quantity: 0,
            low_stock_threshold: 5,
        },
    });

    const addSize = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();
        if (newSize.trim() && !sizes.includes(newSize.trim())) {
            setSizes([...sizes, newSize.trim()]);
            setNewSize("");
        }
    };

    const removeSize = (sizeToRemove: string) => {
        setSizes(sizes.filter(s => s !== sizeToRemove));
    };

    const addColor = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        e.preventDefault();
        if (newColor.trim() && !colors.includes(newColor.trim())) {
            setColors([...colors, newColor.trim()]);
            setNewColor("");
        }
    };

    const removeColor = (colorToRemove: string) => {
        setColors(colors.filter(c => c !== colorToRemove));
    };

    const onSubmit = async (data: ProductFormValues) => {
        setLoading(true);
        try {
            if (!supabase) throw new Error("Supabase não configurado");

            const productData = {
                name: data.name,
                price: data.price,
                category: data.category,
                image: data.image,
                description: data.description,
                sizes: sizes.length > 0 ? sizes : ["U"],
                colors: colors.length > 0 ? colors : ["Padrão"],
                stock_quantity: data.stock_quantity,
                low_stock_threshold: data.low_stock_threshold,
                rating: 5,
                reviews: 0
            };

            if (initialData) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);
                if (error) throw error;
            }

            toast.success(initialData ? "Produto atualizado com sucesso! 🎉" : "Produto cadastrado com sucesso! 🎉");
            onSuccess();
            onClose?.();
        } catch (error: unknown) {
            console.error("Error saving product:", error);

            // Handle AbortError specifically
            if ((error as Error).name === 'AbortError' || (error as Error).message?.includes('aborted')) {
                toast.error("A conexão foi interrompida. Por favor, tente novamente.");
                return;
            }

            toast.error("Erro ao salvar produto: " + ((error as Error).message || "Erro desconhecido"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome do Produto</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Vestido de Festa Rosa" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="stock_quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estoque Atual</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="low_stock_threshold"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Alerta de Estoque Baixo</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Preço (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="99.90" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoria</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Meninas, Bebês..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Tamanhos */}
                <div className="space-y-2">
                    <Label>Tamanhos Disponíveis</Label>
                    <div className="flex gap-2">
                        <Input
                            value={newSize}
                            onChange={(e) => setNewSize(e.target.value)}
                            onKeyDown={addSize}
                            placeholder="Ex: P, M, 38, 40 (Enter para adicionar)"
                        />
                        <Button type="button" onClick={addSize} variant="secondary">Adicionar</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {sizes.map(size => (
                            <div key={size} className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
                                {size}
                                <button type="button" onClick={() => removeSize(size)} className="text-slate-400 hover:text-red-500">×</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cores */}
                <div className="space-y-2">
                    <Label>Cores / Variantes</Label>
                    <div className="flex gap-2">
                        <Input
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            onKeyDown={addColor}
                            placeholder="Ex: Rosa, Azul, Estampado (Enter para adicionar)"
                        />
                        <Button type="button" onClick={addColor} variant="secondary">Adicionar</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {colors.map(color => (
                            <div key={color} className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
                                {color}
                                <button type="button" onClick={() => removeColor(color)} className="text-slate-400 hover:text-red-500">×</button>
                            </div>
                        ))}
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL da Foto</FormLabel>
                            <FormControl>
                                <div className="flex gap-2">
                                    <span className="flex items-center justify-center w-10 h-10 bg-slate-100 rounded-md border border-slate-200">
                                        {field.value ? (
                                            <SafeImage
                                                src={field.value}
                                                alt="Previa da imagem do produto"
                                                className="w-full h-full object-cover rounded-md"
                                            />
                                        ) : (
                                            <ImageIcon className="text-slate-400 w-5 h-5" />
                                        )}
                                    </span>
                                    <Input placeholder="https://..." {...field} className="flex-1" />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Detalhes do produto, tecido, cuidados..." className="h-20" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700" disabled={loading}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                    Salvar Produto
                </Button>
            </form>
        </Form>
    );
}
