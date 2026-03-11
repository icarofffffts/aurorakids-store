import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Menu, X, User } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Input } from "./ui/input";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { items, setIsOpen } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { settings } = useStoreSettings();

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="w-full">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2 text-xs md:text-sm font-medium text-center px-4">
        <span>Frete Grátis para todo Brasil em compras acima de R$ {settings?.free_shipping_threshold || "299"}.00! 🚚</span>
      </div>

      {/* Main Header Container */}
      <header className="bg-white border-b shadow-sm relative z-40">
        <div className="container mx-auto px-4 py-4 md:py-6">

          {/* Mobile Layout: Stacked (Logo Top, Search Bottom) */}
          <div className="md:hidden flex flex-col gap-4">

            {/* Row 1: Logo Centered & Large */}
            <div className="flex justify-center items-center py-2">
              <Link to="/" className="block">
                <img
                  src="/logo.png"
                  alt="DeLu Kids"
                  className="h-28 w-auto object-contain drop-shadow-sm"
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
              <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 w-10 bg-primary text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform">
                <Search className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* Desktop Layout: Flex Row */}
          <div className="hidden md:flex gap-8 items-center">

            {/* Logo Column */}
            <div className="flex-shrink-0">
              <Link to="/" className="block">
                <img src="/logo.png" alt="DeLu Kids" className="h-40 w-auto object-contain hover:scale-105 transition-transform duration-300" />
              </Link>
            </div>

            {/* Right Column: Search, Actions, Nav */}
            <div className="flex-1 flex flex-col gap-4 py-2">

              {/* Upper Row: Search & User Actions */}
              <div className="flex items-center gap-8">
                {/* Search */}
                <form onSubmit={handleSearch} className="flex-1 relative max-w-2xl">
                  <Input
                    placeholder="O que você procura hoje?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-6 pr-14 h-12 rounded-full border-slate-200 bg-slate-50 focus:bg-white focus:border-pink-200 transition-all shadow-sm"
                  />
                  <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 w-11 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm">
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
                    <span>{isAuthenticated ? `Olá, ${user?.name.split(' ')[0]}` : "Entrar"}</span>
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
