import { useState } from "react";
import { useCart } from "@/context/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { MapPin, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { SafeImage } from "@/components/ui/safe-image";

import { useOrders } from "@/context/OrderContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

const Checkout = () => {

    const { items, subtotal, discount, total, couponCode, applyCoupon, clearCoupon, clearCart, shippingCost, shippingName } = useCart();
    const { addOrder } = useOrders();
    const navigate = useNavigate();
    const { user, isAuthenticated, loading: authLoading } = useAuth(); // Get Auth Source

    // Redirect if not logged in
    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated && items.length > 0) {
            toast.info("Faça login para finalizar sua compra");
            navigate("/login", { state: { from: "/checkout" } });
        }
    }, [authLoading, isAuthenticated, items, navigate]);

    const [formData, setFormData] = useState({
        name: user?.name || "",
        phone: user?.phone || "",
        address: user?.address_street || "",
        number: user?.address_number || "",
        complement: user?.address_complement || "",
        city: user?.address_city || "",
    });
    const [loading, setLoading] = useState(false);
    const [couponInput, setCouponInput] = useState('');

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
                <h2 className="text-2xl font-bold text-slate-800">Seu carrinho está vazio 😕</h2>
                <Button onClick={() => navigate("/")}>Voltar a Loja</Button>
            </div>
        );
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Save to Supabase (Pending)
            const created = await addOrder({
                customer: formData.name,
                customerPhone: formData.phone,
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    size: item.selectedSize,
                    color: item.selectedColor,
                    price: item.price,
                    image: item.image
                })),
                subtotal,
                discount,
                couponCode: couponCode || undefined,
                total,
                paymentMethod: "A Combinar (WhatsApp)",
                address: `${formData.address}, ${formData.number} - ${formData.city} (Frete: ${shippingName})`
            });

            // If a shipping method was selected, register cart on SuperFrete automatically so merchant can print labels later
            if (shippingCost > 0) {
                try {
                    await fetch('/api/superfrete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: "cart",
                            payload: {
                                from: {
                                    name: "DeLu Kids", // Assuming store information
                                    phone: "31995398002",
                                    email: "contato@delukids.com",
                                    document: "12345678000199", // ToDo: replace with actual document if known
                                    address: "Rua Exemplo",
                                    complement: "",
                                    number: "100",
                                    district: "Centro",
                                    city: "Belo Horizonte",
                                    state_abbr: "MG",
                                    country_id: "BR",
                                    postal_code: "30140071"
                                },
                                to: {
                                    name: formData.name,
                                    phone: formData.phone.replace(/\D/g, ''),
                                    email: user?.email || "contato@delukids.com",
                                    document: "00000000000", // Needs a valid CPF later
                                    address: formData.address,
                                    complement: formData.complement,
                                    number: formData.number,
                                    district: "Centro",
                                    city: formData.city.split("-")[0]?.trim() || formData.city,
                                    state_abbr: formData.city.split("-")[1]?.trim() || "SP",
                                    country_id: "BR",
                                    postal_code: "00000000" // We'd ideally need the user's CEP here. 
                                },
                                services: shippingName.includes("PAC") ? "1" : "2",
                                options: { receipt: false, own_hand: false, insurance_value: 0 },
                                volumes: items.map(i => ({
                                    height: 5 * i.quantity,
                                    width: 20,
                                    length: 15,
                                    weight: 0.3 * i.quantity
                                }))
                            }
                        })
                    });
                } catch (sfErr) {
                    console.error("Superfrete cart failed (non-blocking): ", sfErr);
                }
            }

            // Clear cart immediately as order is persisted
            clearCart();

            toast.success("Pedido realizado com sucesso!");

            // Navigate to Payment page
            setTimeout(() => {
                navigate("/payment", {
                    state: {
                        orderId: created.orderId,
                        total: created.total,
                        customerName: formData.name
                    }
                });
            }, 1000);

        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen bg-slate-50 font-nunito flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <h1 className="text-3xl font-fredoka font-bold text-slate-900 mb-8 flex items-center gap-2">
                    Finalizar Compra 🛍️
                </h1>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Form Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
                                <User className="h-5 w-5" /> Seus Dados
                            </h2>
                            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo *</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            placeholder="Ex: Maria Silva"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            required
                                            placeholder="(11) 99999-9999"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-primary pt-2">
                                    <MapPin className="h-5 w-5" /> Endereço de Entrega
                                </h2>

                                <div className="grid md:grid-cols-4 gap-4">
                                    <div className="space-y-2 md:col-span-3">
                                        <Label htmlFor="address">Rua/Avenida *</Label>
                                        <Input
                                            id="address"
                                            name="address"
                                            required
                                            placeholder="Ex: Av. Paulista"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="number">Número *</Label>
                                        <Input
                                            id="number"
                                            name="number"
                                            required
                                            placeholder="1000"
                                            value={formData.number}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="complement">Complemento</Label>
                                        <Input
                                            id="complement"
                                            name="complement"
                                            placeholder="Apto 101, Bloco B"
                                            value={formData.complement}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">Cidade/Estado *</Label>
                                        <Input
                                            id="city"
                                            name="city"
                                            required
                                            placeholder="São Paulo - SP"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 sticky top-24">
                            <h2 className="text-xl font-bold mb-6">Resumo do Pedido</h2>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {items.map((item) => (
                                    <div key={`${item.id}-${item.selectedSize}-${item.selectedColor || ''}`} className="flex gap-3">
                                        <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <SafeImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                            <p className="text-xs text-slate-500">
                                                Tam: {item.selectedSize}
                                                {item.selectedColor ? ` | Cor: ${item.selectedColor}` : ''}
                                                {' '}| Qtd: {item.quantity}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-slate-800">
                                            R$ {(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-bold text-slate-900">Cupom</div>
                                </div>

                                {couponCode ? (
                                    <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                        <div className="text-sm">
                                            <div className="font-extrabold text-emerald-700">{couponCode}</div>
                                            <div className="text-emerald-700">Desconto: -R$ {discount.toFixed(2)}</div>
                                        </div>
                                        <Button type="button" variant="outline" className="font-bold" onClick={clearCoupon}>
                                            Remover
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <Input
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value)}
                                            placeholder="Digite seu cupom"
                                        />
                                        <Button type="button" variant="outline" className="font-bold" onClick={() => applyCoupon(couponInput)}>
                                            Aplicar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span>
                                    <span>R$ {subtotal.toFixed(2)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-emerald-700 font-medium">
                                        <span>Desconto</span>
                                        <span>-R$ {discount.toFixed(2)}</span>
                                    </div>
                                )}
                                {shippingCost > 0 ? (
                                    <div className="flex justify-between text-slate-700 font-medium">
                                        <span>Frete ({shippingName})</span>
                                        <span>R$ {shippingCost.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    <div className="flex justify-between text-orange-600 font-medium text-sm">
                                        <span>Frete</span>
                                        <span>Preencha o CEP no carrinho</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold text-slate-900 pt-2">
                                    <span>Total</span>
                                    <span>R$ {total.toFixed(2)}</span>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                form="checkout-form"
                                className={`w-full h-14 text-lg font-bold rounded-xl mt-6 shadow-xl shadow-green-500/20 bg-green-500 hover:bg-green-600 transition-all ${loading ? 'opacity-80 cursor-wait' : ''}`}
                                disabled={loading}
                            >
                                {loading ? "Enviando..." : "Confirmar Pedido ✅"}
                            </Button>

                            <p className="text-xs text-center text-slate-400 mt-4">
                                Ao confirmar, entraremos em contato para finalizar o pagamento.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Checkout;
