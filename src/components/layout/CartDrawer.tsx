import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/context/CartContext";
import { Trash2, ShoppingBag, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { SafeImage } from "@/components/ui/safe-image";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const CartDrawer = () => {
    const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, subtotal, discount, total, couponCode, applyCoupon, clearCoupon } = useCart();
    const [couponInput, setCouponInput] = useState('');

    const navigate = useNavigate(); // Add this import at the top if missing, or use browser API

    const handleCheckout = () => {
        setIsOpen(false); // Close the drawer
        navigate("/checkout"); // Navigate to checkout page
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 font-fredoka text-2xl">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                        Sua Sacola
                    </SheetTitle>
                </SheetHeader>

                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                            <ShoppingBag className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800">Sua sacola está vazia</h3>
                        <p className="text-slate-500 max-w-xs">Explore nossas categorias e encha sua sacola com looks incríveis!</p>
                        <Button onClick={() => setIsOpen(false)} variant="outline" className="mt-4">
                            Continuar Comprando
                        </Button>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 -mx-6 px-6 py-4">
                            <div className="space-y-6">
                                {items.map((item) => (
                                    <div key={`${item.id}-${item.selectedSize}-${item.selectedColor || 'default'}`} className="flex gap-4">
                                        <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                                            <SafeImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                                            <div className="flex gap-2 text-xs text-slate-500 mb-2">
                                                <span>Tam: {item.selectedSize}</span>
                                                {item.selectedColor && <span>• Cor: {item.selectedColor}</span>}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-primary">R$ {item.price.toFixed(2)}</span>

                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, item.quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-white rounded transition-colors"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.selectedSize, item.selectedColor, item.quantity + 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:bg-white rounded transition-colors"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
                                            className="text-slate-300 hover:text-red-500 self-start transition-colors px-2"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <div className="text-sm font-bold text-slate-900">Cupom</div>
                                {couponCode ? (
                                    <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                                        <div className="text-sm">
                                            <span className="font-extrabold text-emerald-700">{couponCode}</span>
                                            <span className="text-emerald-700"> — -R$ {discount.toFixed(2)}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={clearCoupon} className="text-emerald-800">
                                            Remover
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value)}
                                            placeholder="Digite seu cupom"
                                            className="h-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 font-bold"
                                            onClick={() => applyCoupon(couponInput)}
                                        >
                                            Aplicar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span className="text-primary">R$ {total.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Subtotal</span>
                                    <span>R$ {subtotal.toFixed(2)}</span>
                                </div>
                            )}
                            <SheetFooter>
                                <Button onClick={handleCheckout} className="w-full h-12 text-base font-bold bg-green-500 hover:bg-green-600 shadow-none">
                                    Finalizar Compra
                                </Button>
                            </SheetFooter>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default CartDrawer;
