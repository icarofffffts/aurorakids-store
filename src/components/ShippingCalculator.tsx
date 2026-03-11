import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Truck, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ShippingOption {
    name: string;
    price: number;
    days: number;
}

const ShippingCalculator = () => {
    const [cep, setCep] = useState("");
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [options, setOptions] = useState<ShippingOption[]>([]);

    const handleCalculate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cep.length < 8) {
            toast.error("CEP inválido. Digite 8 números.");
            return;
        }

        setLoading(true);
        setOptions([]);
        setAddress(null);

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                toast.error("CEP não encontrado.");
                return;
            }

            setAddress(`${data.logradouro} - ${data.bairro}, ${data.localidade}/${data.uf}`);

            // Mock calculation logic based on region (simulated)
            // In a real app, this would come from an API like Melhor Envio
            const isSP = data.uf === "SP";

            const mockOptions = [
                {
                    name: "PAC (Correios)",
                    price: isSP ? 15.90 : 25.90,
                    days: isSP ? 5 : 8,
                },
                {
                    name: "Sedex (Correios)",
                    price: isSP ? 25.90 : 45.90,
                    days: isSP ? 2 : 4,
                },
                {
                    name: "Transportadora Flash",
                    price: isSP ? 12.90 : 22.90,
                    days: isSP ? 3 : 6,
                },
            ];

            setOptions(mockOptions);
            toast.success("Frete calculado com sucesso!");
        } catch (error) {
            toast.error("Erro ao consultar CEP.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCep = (value: string) => {
        return value.replace(/\D/g, "").slice(0, 8);
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

            {address && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-slate-100 text-sm mb-4">
                    <span className="font-bold text-slate-700">Destino:</span>
                    <span className="text-slate-600 block">{address}</span>
                </div>
            )}

            {options.length > 0 && (
                <div className="space-y-3 mt-4">
                    {options.map((opt, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 hover:border-primary/50 transition-colors cursor-default">
                            <div>
                                <span className="font-bold text-sm text-slate-800 block">{opt.name}</span>
                                <span className="text-xs text-slate-500">Chega em até {opt.days} dias úteis</span>
                            </div>
                            <span className="font-bold text-primary">
                                R$ {opt.price.toFixed(2).replace('.', ',')}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ShippingCalculator;
