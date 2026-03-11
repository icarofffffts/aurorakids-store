import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { ArrowLeft, Heart, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import ShippingCalculator from "@/components/shop/ShippingCalculator";
import Footer from "@/components/layout/Footer";
import { useProduct } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage } from "@/components/ui/safe-image";

const ProductDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [selectedSize, setSelectedSize] = useState<string>("");
    const [selectedColor, setSelectedColor] = useState<string>("");

    const { data: product, isLoading, isError, error } = useProduct(Number(id));

    console.log(`ProductDetails for ID ${id}:`, { product, isLoading, isError, error });

    if (isLoading) {
        // ... (skeleton)
        return (
            <div className="min-h-screen bg-background font-nunito flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8">
                    <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
                        <Skeleton className="aspect-square rounded-3xl" />
                        <div className="space-y-6">
                            <Skeleton className="h-8 w-32" />
                            <Skeleton className="h-12 w-3/4" />
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (isError || !product) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <h2 className="text-2xl font-bold mb-4">Produto não encontrado 😕</h2>
                    <Button onClick={() => navigate("/")}>Voltar para a Home</Button>
                </div>
                <Footer />
            </div>
        );
    }

    const handleAddToCart = () => {
        if (product.sizes && product.sizes.length > 0 && !selectedSize) {
            toast.warning("Por favor, selecione um tamanho!");
            return;
        }
        if (product.colors && product.colors.length > 0 && product.colors[0] !== 'Padrão' && !selectedColor) {
            toast.warning("Por favor, selecione uma cor/variante!");
            return;
        }

        // Add logic to include color in cart item if needed, for now just passing product + size
        // ideally addToCart should accept options
        addToCart(product, selectedSize, selectedColor);
        toast.success("Adicionado à sacola! 🛍️");
    };

    return (
        <div className="min-h-screen bg-background font-nunito flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate("/")}
                    className="mb-6 hover:bg-slate-100 -ml-4"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Voltar
                </Button>

                <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
                    {/* Image Section */}
                    <div className="space-y-4">
                        <div className="aspect-square rounded-3xl overflow-hidden bg-slate-100 shadow-sm relative">
                            {product.isNew && (
                                <span className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold z-10">
                                    NOVIDADE
                                </span>
                            )}
                            <SafeImage
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        {/* Thumbnails (Mock) */}
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="w-20 h-20 rounded-xl bg-slate-100 flex-shrink-0 cursor-pointer hover:ring-2 ring-primary transition-all">
                                    <SafeImage
                                        src={product.image}
                                        alt={`${product.name} - imagem ${i + 1}`}
                                        className="w-full h-full object-cover rounded-xl opacity-70 hover:opacity-100"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 inline-block">
                                    {product.category}
                                </span>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-red-50 hover:text-red-500">
                                    <Heart className="h-6 w-6" />
                                </Button>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-fredoka font-bold text-slate-900 mb-2">
                                {product.name}
                            </h1>
                            <p className="text-3xl font-bold text-primary">
                                R$ {product.price.toFixed(2)}
                            </p>
                        </div>

                        <p className="text-slate-600 leading-relaxed">
                            {product.description}
                        </p>


                        {/* Size Selector */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="font-bold text-slate-900">Tamanho:</label>
                                <button className="text-xs text-blue-500 underline">Guia de Medidas</button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {product.sizes && product.sizes.length > 0 ? (
                                    product.sizes.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all
                                                ${selectedSize === size
                                                    ? 'bg-slate-900 text-white shadow-lg scale-110'
                                                    : 'bg-white border text-slate-600 hover:border-slate-900'}
                                            `}
                                        >
                                            {size}
                                        </button>
                                    ))
                                ) : <span className="text-sm text-slate-500">Tamanho Único</span>}
                            </div>
                        </div>

                        {/* Color Selector */}
                        {product.colors && product.colors.length > 0 && product.colors[0] !== 'Padrão' && (
                            <div className="space-y-3">
                                <label className="font-bold text-slate-900">Cor / Variante:</label>
                                <div className="flex flex-wrap gap-3">
                                    {product.colors.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`
                                                px-4 py-2 rounded-xl flex items-center justify-center font-bold transition-all border
                                                ${selectedColor === color
                                                    ? 'bg-slate-900 text-white shadow-lg scale-105 border-slate-900'
                                                    : 'bg-white text-slate-600 hover:border-slate-900 border-slate-200'}
                                            `}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="pt-6 border-t space-y-4">
                            <Button
                                className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all"
                                onClick={handleAddToCart}
                            >
                                <div className="flex flex-col items-center leading-none">
                                    <span>Adicionar à Sacola</span>
                                    <span className="text-xs font-normal opacity-90 mt-1">Compra 100% Segura</span>
                                </div>
                            </Button>

                            <ShippingCalculator />

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                                <ShieldCheck className="h-6 w-6 text-slate-400" />
                                <div className="text-xs">
                                    <p className="font-bold text-slate-900">Compra Segura</p>
                                    <p className="text-slate-500">Garantia total de 7 dias para troca e devolução</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ProductDetails;
