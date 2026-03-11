import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Truck, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

interface ShippingOption {
    name: string;
    price: number;
    days: number;
    company: string;
}

const ShippingCalculator = () => {
    const [cep, setCep] = useState("");
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<ShippingOption[]>([]);

    // Store original string CEP for shipping context
    const [searchedCep, setSearchedCep] = useState("");

    const { itemsCount, setShipping, shippingName } = useCart();

    const handleCalculate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cep.length < 8) {
            toast.error("CEP inválido. Digite 8 números.");
            return;
        }

        setLoading(true);
        setOptions([]);

        try {
            // CEP da Loja de Origem (Configure according to your store)
            const CEP_ORIGEM = "30140071";

            const response = await fetch('/api/superfrete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: "calculate",
                    payload: {
                        from: CEP_ORIGEM,
                        to: cep,
                        items: itemsCount > 0 ? itemsCount : 1
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao consultar a API");
            }

            const data = await response.json();

            // Format received data
            // Superfrete API usually returns an array of elements
            const fetchedOptions: ShippingOption[] = (Array.isArray(data) ? data : []).map((srv: any) => ({
                name: `${srv.name}`,
                company: srv.company?.name || "Correios",
                price: parseFloat(srv.price || srv.custom_price || 0),
                days: parseInt(srv.delivery_time || srv.custom_delivery_time || 0)
            })).filter(o => o.price > 0);

            if (fetchedOptions.length === 0) {
                toast.error("Nenhuma opção de frete encontrada para este CEP.");
                return;
            }

            setOptions(fetchedOptions);
            setSearchedCep(cep);
            toast.success("Frete calculado com sucesso!");
        } catch (error: any) {
            toast.error("Erro ao consultar CEP.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCep = (value: string) => {
        return value.replace(/\D/g, "").slice(0, 8);
    };

    const handleSelectShipping = (opt: ShippingOption) => {
        setShipping(opt.price, opt.name);
        toast.success(`Frete ${opt.name} selecionado!`);
    };

    return (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mt-6">
            <div className="flex items-center gap-2 mb-4 text-slate-700 font-bold">
                <Truck className="h-5 w-5 text-primary" />
                <h3>Calcular Frete e Prazo</h3>
            </div>

            <form onSubmit={handleCalculate} className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => setCep(formatCep(e.target.value))}
                        className="bg-white pl-10"
                        maxLength={8}
                    />
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                <Button type="submit" disabled={loading} variant="outline" className="font-bold">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                </Button>
            </form>

            <a
                href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 mt-2 block hover:underline"
            >
                Não sei meu CEP
            </a>

            {options.length > 0 && (
                <div className="space-y-3 mt-4">
                    <p className="text-xs text-slate-500 font-medium mb-2">Selecione uma opção:</p>
                    {options.map((opt, idx) => {
                        const isSelected = shippingName === opt.name;
                        return (
                            <div
                                key={idx}
                                onClick={() => handleSelectShipping(opt)}
                                className={`flex justify-between items-center p-3 bg-white rounded-xl border transition-all cursor-pointer ${isSelected
                                    ? 'border-primary ring-1 ring-primary/50 bg-primary/5'
                                    : 'border-slate-100 hover:border-primary/50'
                                    }`}
                            >
                                <div className="flex gap-3 items-center">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm text-slate-800 block">{opt.name} ({opt.company})</span>
                                        <span className="text-xs text-slate-500">Chega em até {opt.days} dias úteis</span>
                                    </div>
                                </div>
                                <span className="font-bold text-primary">
                                    R$ {opt.price.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default ShippingCalculator;
