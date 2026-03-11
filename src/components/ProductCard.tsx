import { Link } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { Product } from "@/data/products";
import { Button } from "./ui/button";

interface ProductCardProps {
    product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
    return (
        <Link
            to={`/product/${product.id}`}
            className="group block relative bg-white rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
        >
            {/* Image Container - No Internal Borders */}
            <div className="relative aspect-[4/5] overflow-hidden bg-brand-warm/30">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.isNew && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-acid text-brand-navy shadow-sm">
                            NOVO
                        </span>
                    )}
                    {/* Mock Discount Badge if needed logic */}
                    {/* <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary text-brand-navy shadow-sm">-20%</span> */}
                </div>

                {/* Floating Actions */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                    <button
                        className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-secondary hover:bg-white shadow-lg transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            // Logic for wishlist
                        }}
                    >
                        <Heart className="h-5 w-5 fill-current" />
                    </button>
                    <button
                        className="w-10 h-10 bg-brand-navy text-white rounded-full flex items-center justify-center shadow-lg hover:bg-brand-orange transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            // Logic for Quick Add
                        }}
                    >
                        <ShoppingBag className="h-5 w-5" />
                    </button>
                </div>

                {/* Quick Add Overlay (Mobile Friendly / Desktop Hover) */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 md:hidden">
                    <Button size="sm" className="w-full bg-white text-brand-navy font-bold hover:bg-brand-acid">
                        Espiar
                    </Button>
                </div>
            </div>

            {/* Content - Minimalist */}
            <div className="p-5 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{product.category}</p>
                <h3 className="font-fredoka text-lg font-bold text-brand-navy leading-tight mb-2 line-clamp-1 group-hover:text-brand-orange transition-colors">
                    {product.name}
                </h3>
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-brand-navy">
                            R$ {product.price.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                            R$ {(product.price * 1.2).toFixed(2).replace(".", ",")}
                        </span>
                    </div>
                    {/* Mini add button for mobile/list view */}
                    <div className="w-8 h-8 rounded-full bg-brand-warm flex items-center justify-center text-brand-orange group-hover:bg-brand-orange group-hover:text-white transition-colors">
                        <ShoppingBag className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
