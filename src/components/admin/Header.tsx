import { Bell, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
    return (
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md hidden sm:block">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar produtos, pedidos, clientes..."
                            className="pl-10 bg-slate-100 border-0 focus-visible:ring-1 focus-visible:ring-pink-500"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Notifications */}
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className="h-5 w-5 text-slate-600" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    </Button>

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="gap-2 pl-2 pr-3 hover:bg-slate-100">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="" />
                                    <AvatarFallback className="bg-pink-600 text-white text-xs font-semibold">
                                        AD
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-left hidden sm:block">
                                    <p className="text-sm font-medium text-slate-700">Admin</p>
                                    <p className="text-xs text-slate-500">Gerente</p>
                                </div>
                                <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer">Perfil</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Configurações</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">Suporte</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 cursor-pointer">
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
