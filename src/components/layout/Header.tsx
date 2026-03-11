import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import PromoBar from "@/components/marketing/PromoBar";

const Header = () => {
  const { items, setIsOpen } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { settings } = useStoreSettings();

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
    }
  };

  return (
    <div className="w-full">
      {/* Top Bar */}
      <PromoBar
        fallbackText={`Frete Grátis para todo Brasil em compras acima de R$ ${settings?.free_shipping_threshold || "299"}.00! 🚚`}
      />

      {/* Main Header Container */}
      <header className="bg-white border-b shadow-sm relative z-40">
        <div className="container mx-auto px-3 py-3 md:px-4 md:py-4">

          {/* Mobile Layout: Stacked (Logo Top, Search Bottom) */}
          <div className="md:hidden flex flex-col gap-2">

            {/* Row 1: Logo Centered */}
            <div className="flex justify-center items-center py-1">
              <Link
                to="/"
                className="relative z-10 inline-flex items-center justify-center w-[min(360px,92vw)] h-[96px]"
                aria-label="Voltar para a pagina inicial"
              >
                <img
                  src="/logo-full.png"
                  alt="DeLu Kids"
                  className="h-full w-full object-contain drop-shadow-sm"
                />
              </Link>
            </div>

            {/* Row 2: Search Bar */}
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                placeholder="O que você procura hoje?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-5 pr-12 h-12 rounded-full border-slate-200 bg-slate-50 focus:bg-white focus:border-pink-300 transition-all shadow-sm text-base"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 w-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Desktop Layout: Flex Row */}
          <div className="hidden md:flex gap-8 items-center">

            {/* Logo Column */}
            <div className="flex-shrink-0 py-1 relative z-10 w-60 lg:w-72">
              <Link to="/" className="block">
                <img
                  src="/logo-full.png"
                  alt="DeLu Kids"
                  className="h-24 lg:h-28 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Right Column: Search, Actions, Nav */}
            <div className="flex-1 flex flex-col gap-2 py-1">

              {/* Upper Row: Search & User Actions */}
              <div className="flex items-center gap-8">
                {/* Search */}
                <form onSubmit={handleSearch} className="flex-1 relative max-w-2xl">
                  <Input
                    placeholder="O que você procura hoje?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-6 pr-14 h-11 rounded-full border-slate-200 bg-slate-50 focus:bg-white focus:border-pink-200 transition-all shadow-sm"
                  />
                  <button type="submit" className="absolute right-1 top-1 bottom-1 w-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm">
                    <Search className="h-5 w-5" />
                  </button>
                </form>

                {/* Actions */}
                <div className="flex items-center gap-6">
                  <Link
                    to={isAuthenticated ? "/account" : "/login"}
                    className="flex flex-col items-center text-slate-600 hover:text-primary transition-colors text-xs font-bold gap-1 group"
                  >
                    <div className="p-2 bg-slate-50 rounded-full group-hover:bg-pink-50 transition-colors border border-slate-100">
                      <User className="h-5 w-5" />
                    </div>
                    <span>{isAuthenticated ? `Olá, ${(user?.name || '').split(' ')[0] || 'Cliente'}` : "Entrar"}</span>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-slate-600 hover:text-primary hover:bg-transparent h-auto w-auto p-0 flex flex-col gap-1"
                    onClick={() => setIsOpen(true)}
                  >
                    <div className="p-2 bg-slate-50 rounded-full hover:bg-pink-50 transition-colors border border-slate-100 relative">
                      <ShoppingBag className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                          {cartCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold">Sacola</span>
                  </Button>
                </div>
              </div>

              {/* Lower Row: Navigation Categories */}
              <nav className="flex items-center gap-8 pl-1">
                <Link to="/products?category=Novidades" className="text-sm font-extrabold text-slate-700 hover:text-primary uppercase tracking-wide border-b-2 border-transparent hover:border-primary transition-all pb-1">Novidades</Link>
                <Link to="/products?category=Meninas" className="text-sm font-extrabold text-slate-700 hover:text-primary uppercase tracking-wide border-b-2 border-transparent hover:border-primary transition-all pb-1">Meninas</Link>
                <Link to="/products?category=Meninos" className="text-sm font-extrabold text-slate-700 hover:text-primary uppercase tracking-wide border-b-2 border-transparent hover:border-primary transition-all pb-1">Meninos</Link>
                <Link to="/products?category=Bebês" className="text-sm font-extrabold text-slate-700 hover:text-primary uppercase tracking-wide border-b-2 border-transparent hover:border-primary transition-all pb-1">Bebês</Link>
                <Link to="/products?category=Promoções" className="text-sm font-extrabold text-red-500 hover:text-red-600 uppercase tracking-wide border-b-2 border-transparent hover:border-red-500 transition-all pb-1">Ofertas</Link>
              </nav>

            </div>
          </div>

        </div>
      </header>
    </div>
  );
};

export default Header;
