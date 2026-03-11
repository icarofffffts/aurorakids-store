import { useState, useMemo } from "react";
import ProductCard from "@/components/shop/ProductCard";
import { categories, Product } from "@/data/products"; // Imported Product
import { useProducts } from "@/hooks/useProducts";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Heart, ShoppingBag, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";

const Products = () => {
    // 1. All Hooks must be at the top level
    const { data: allProducts, isLoading, isError, error, refetch } = useProducts();
    const [searchParams, setSearchParams] = useSearchParams();
    const [priceRange, setPriceRange] = useState([0, 200]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // 2. Computed values
    const currentCategory = searchParams.get('category') || 'all';
    // Hook is now strictly typed
    const products = useMemo(() => allProducts || [], [allProducts]);

    // 3. Derived State (useMemo)
    const allSizes = useMemo(() => {
        if (!products) return [];
        return Array.from(new Set(products.flatMap(p => p.sizes || []))).sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];

        return products.filter(product => {
            // Category Filter
            if (currentCategory !== 'all' && product.category.toLowerCase() !== currentCategory.toLowerCase()) {
                return false;
            }

            // Price Filter
            if (product.price < priceRange[0] || product.price > priceRange[1]) {
                return false;
            }

            // Size Filter
            if (selectedSizes.length > 0) {
                const hasSize = product.sizes.some(size => selectedSizes.includes(size));
                if (!hasSize) return false;
            }

            return true;
        }).sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
    }, [products, currentCategory, priceRange, selectedSizes, sortOrder]);

    const toggleSize = (size: string) => {
        setSelectedSizes(prev =>
            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
        );
    };

    const FiltersContent = () => (
        <div className="space-y-8">
            {/* Category Links */}
            <div>
                <h3 className="font-bold text-slate-900 mb-4">Categorias</h3>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => setSearchParams({ category: 'all' })}
                        className={`text-left px-3 py-2 rounded-lg transition-colors ${currentCategory === 'all' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Todos os Produtos
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSearchParams({ category: cat.name })}
                            className={`text-left px-3 py-2 rounded-lg transition-colors ${currentCategory === cat.name ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <h3 className="font-bold text-slate-900 mb-4">Preço</h3>
                <Slider
                    defaultValue={[0, 200]}
                    max={300}
                    step={10}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="mb-4"
                />
                <div className="flex justify-between text-sm text-slate-600 font-medium">
                    <span>R$ {priceRange[0]}</span>
                    <span>R$ {priceRange[1]}</span>
                </div>
            </div>

            {/* Sizes */}
            <div>
                <h3 className="font-bold text-slate-900 mb-4">Tamanhos</h3>
                <div className="grid grid-cols-4 gap-2">
                    {allSizes.map(size => (
                        <button
                            key={size}
                            onClick={() => toggleSize(size)}
                            className={`
                    h-10 rounded-lg text-sm font-bold border transition-all
                    ${selectedSizes.includes(size)
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-600 hover:border-slate-400'}
                  `}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // 4. Conditional Rendering (AFTER Hooks)
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="ml-4 text-slate-500">Carregando produtos...</p>
            </div>
        );
    }

    if (isError) {
        const isAbort = (error as Error)?.name === 'AbortError' || (error as Error)?.message?.includes('aborted');

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <h2 className="text-xl font-bold text-red-500">
                    {isAbort ? "Conexão interrompida" : "Erro ao carregar produtos"}
                </h2>
                <p className="text-slate-600">
                    {isAbort
                        ? "A conexão foi cancelada. Tente novamente."
                        : (error as Error)?.message || "Erro desconhecido"}
                </p>
                <Button onClick={() => refetch()}>Tentar Novamente</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-nunito flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-fredoka font-bold text-slate-900">
                            {currentCategory === 'all' ? 'Todos os Produtos' : currentCategory}
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {filteredProducts.length} produtos encontrados
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Mobile Filter */}
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="lg:hidden gap-2">
                                    <SlidersHorizontal className="h-4 w-4" /> Filtros
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px]">
                                <SheetHeader>
                                    <SheetTitle className="text-left font-fredoka">Filtros</SheetTitle>
                                </SheetHeader>
                                <div className="py-6">
                                    <FiltersContent />
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* Sort */}
                        <Button
                            variant="outline"
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="gap-2"
                        >
                            <ArrowUpDown className="h-4 w-4" />
                            {sortOrder === 'asc' ? 'Menor Preço' : 'Maior Preço'}
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:block space-y-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit sticky top-24">
                        <FiltersContent />
                    </aside>

                    {/* Products Grid */}
                    <div className="lg:col-span-3">
                        {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <p className="text-xl font-bold text-slate-400">Nenhum produto encontrado 🥲</p>
                                <p className="text-slate-400">Tente limpar os filtros</p>
                                <Button
                                    variant="link"
                                    onClick={() => {
                                        setPriceRange([0, 300]);
                                        setSelectedSizes([]);
                                        setSearchParams({ category: 'all' });
                                    }}
                                >
                                    Limpar Filtros
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                {filteredProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main >
            <Footer />
        </div >
    );
};

export default Products;
