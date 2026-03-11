import { Facebook, Instagram, Youtube, CreditCard, ShieldCheck, Truck, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const N8N_URL = "https://n8n.arxsolutions.cloud/webhook/newsletter";
      await fetch(N8N_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      toast.success("Inscrito com sucesso! Cheque seu e-mail.");
      setEmail("");
    } catch (err) {
      console.error("Newsletter error", err);
      toast.error("Erro ao se inscrever. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="bg-foreground text-background">
      {/* Trust bar */}
      <div className="border-b border-background/10">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-12 h-12 bg-background/10 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Frete Grátis</p>
                <p className="text-sm opacity-70">Em compras acima de R$150</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-12 h-12 bg-background/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Compra Segura</p>
                <p className="text-sm opacity-70">Seus dados protegidos</p>
              </div>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-12 h-12 bg-background/10 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">Até 6x Sem Juros</p>
                <p className="text-sm opacity-70">Parcele suas compras</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="block">
              <img src="/logo.png" alt="DeLu Kids" className="h-14 w-auto brightness-0 invert opacity-90" />
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
              Vestindo sonhos e criando memórias desde 2020.
              Roupas confortáveis para crianças felizes.
            </p>
            <div className="flex gap-4">
              {/* Social Icons - Updated to placeholders */}
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-orange hover:text-white transition-all">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-orange hover:text-white transition-all">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-brand-orange hover:text-white transition-all">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-fredoka text-lg font-bold mb-6 text-white">Explorar</h4>
            <ul className="space-y-4 text-sm text-slate-300">
              <li><Link to="/products?category=Novidades" className="hover:text-brand-orange transition-colors flex items-center gap-2">✨ Novidades</Link></li>
              <li><Link to="/products?category=Promoções" className="hover:text-brand-orange transition-colors flex items-center gap-2">🔥 Ofertas</Link></li>
              <li><Link to="/products?category=Meninas" className="hover:text-brand-orange transition-colors">Meninas</Link></li>
              <li><Link to="/products?category=Meninos" className="hover:text-brand-orange transition-colors">Meninos</Link></li>
              <li><Link to="/products?category=Bebês" className="hover:text-brand-orange transition-colors">Bebês</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-fredoka text-lg font-bold mb-6 text-white">Precisa de Ajuda?</h4>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-acid/20 flex items-center justify-center text-brand-acid">
                  <Phone className="w-4 h-4" />
                </div>
                <span>(11) 99999-9999</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-acid/20 flex items-center justify-center text-brand-acid">
                  <Mail className="w-4 h-4" />
                </div>
                <span>contato@delukids.com.br</span>
              </li>
              <li className="pt-4">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white underline decoration-brand-orange decoration-2 underline-offset-4"
                >
                  Fale Conosco
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter / Social Proof */}
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h4 className="font-fredoka text-lg font-bold mb-2 text-white">Receba Ofertas VIP</h4>
            <p className="text-xs text-slate-400 mb-4">Entre para o nosso clube e ganhe 10% OFF na primeira compra.</p>

            <form className="space-y-3" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                required
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-lg h-10"
              >
                {isLoading ? "Enviando..." : "Cadastrar Agora"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-sm opacity-50">
            © 2025 DeLu Kids. Todos os direitos reservados. v2.0
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
