import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Baby,
    Store,
    TicketPercent,
    Star,
    Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Package, label: "Produtos", path: "/admin/products" },
    { icon: ShoppingCart, label: "Pedidos", path: "/admin/orders" },
    { icon: Users, label: "Clientes", path: "/admin/customers" },
    { icon: Star, label: "Avaliacoes", path: "/admin/reviews" },
    { icon: ImageIcon, label: "Banners", path: "/admin/banners" },
    { icon: TicketPercent, label: "Marketing", path: "/admin/marketing" },
    { icon: Settings, label: "Configuracoes", path: "/admin/settings" },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    return (
        <>
            {/* Mobile Menu Button */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-40 transition-all duration-300 flex flex-col shadow-lg",
                    collapsed ? "w-20" : "w-64",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo */}
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="DeLu Kids" className={cn("transition-all duration-300", collapsed ? "h-8 w-8 object-contain" : "h-10 w-auto")} />
                        {!collapsed && (
                            <div className="animate-fade-in">
                                <p className="text-xs text-slate-500">Painel Admin</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Collapse Button (Desktop Only) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm hidden lg:flex hover:bg-slate-50"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <Menu className="h-3 w-3 text-slate-500" />
                </Button>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group",
                                    isActive
                                        ? "bg-pink-50 text-pink-600"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-pink-600" : "text-slate-400 group-hover:text-slate-600")} />
                                {!collapsed && (
                                    <span className="animate-fade-in">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Store Info */}
                <div className="p-3 border-t border-slate-100">
                    <div
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-lg bg-slate-50",
                            collapsed && "justify-center"
                        )}
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Store className="h-4 w-4 text-blue-600" />
                        </div>
                        {!collapsed && (
                            <div className="animate-fade-in flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                    DeLu Kids
                                </p>
                                <p className="text-xs text-emerald-600 flex items-center gap-1 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Online
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Logout */}
                <div className="p-3 border-t border-slate-100">
                    <Link
                        to="/"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full",
                            collapsed && "justify-center"
                        )}
                    >
                        <LogOut className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="animate-fade-in">Sair</span>}
                    </Link>
                </div>
            </aside>
        </>
    );
}
