import { Home, Search, ShoppingBag, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const MobileNav = () => {
    const { pathname } = useLocation();
    const { items, setIsOpen } = useCart();
    const { isAuthenticated } = useAuth();

    const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

    const navItems = [
        { icon: Home, label: "Início", path: "/" },
        { icon: Search, label: "Buscar", path: "/products" },
        {
            icon: ShoppingBag,
            label: "Sacola",
            action: () => setIsOpen(true),
            badge: cartCount
        },
        { icon: User, label: "Conta", path: isAuthenticated ? "/account" : "/login" },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe pt-2 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 rounded-t-2xl">
            <div className="flex justify-between items-end pb-2">
                {navItems.map((item, index) => {
                    const isActive = item.path === pathname;
                    const Icon = item.icon;

                    if (item.action) {
                        return (
                            <button
                                key={index}
                                onClick={item.action}
                                className={`relative flex flex-col items-center gap-1 min-w-[60px] p-2 transition-colors ${isActive ? 'text-brand-orange' : 'text-slate-400 hover:text-brand-navy'}`}
                            >
                                <div className="relative">
                                    <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                    {item.badge ? (
                                        <span className="absolute -top-1 -right-2 bg-brand-orange text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </div>
                                <span className={`text-[10px] font-bold ${isActive ? 'text-brand-orange' : 'text-slate-400'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={index}
                            to={item.path!}
                            className={`relative flex flex-col items-center gap-1 min-w-[60px] p-2 transition-colors ${isActive ? 'text-brand-orange' : 'text-slate-400 hover:text-brand-navy'}`}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            <span className={`text-[10px] font-bold ${isActive ? 'text-brand-orange' : 'text-slate-400'}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileNav;
