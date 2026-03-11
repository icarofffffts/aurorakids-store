import { Button } from "./ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-brand-warm pt-8 pb-12 md:pt-12 md:pb-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">

          {/* Left Content (Text) */}
          <div className="space-y-6 md:space-y-8 animate-fade-in z-10 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-acid/20 text-brand-navy text-sm font-bold tracking-wider uppercase border border-brand-acid/50">
              <Sparkles className="w-4 h-4 text-brand-orange" />
              <span>Nova Coleção 2025</span>
            </div>

            <h1 className="font-fredoka text-5xl md:text-7xl font-bold text-brand-navy leading-tight tracking-tight">
              Estilo Que <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-secondary relative">
                Conta Histórias
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-brand-acid -z-10 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-slate-600 text-lg md:text-xl max-w-lg leading-relaxed">
              Roupas pensadas para brincar, pular e sonhar. Conforto premium com aquele toque de magia que só a DeLu tem.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/products?category=Novidades">
                <Button size="lg" className="rounded-full px-8 py-6 text-lg font-bold bg-brand-navy text-white hover:bg-brand-navy/90 hover:scale-105 transition-transform shadow-xl shadow-brand-navy/20">
                  Ver Novidades
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/products?category=Promoções">
                <Button variant="outline" size="lg" className="rounded-full px-8 py-6 text-lg font-bold border-2 border-brand-navy text-brand-navy hover:bg-brand-navy/5">
                  Ofertas
                </Button>
              </Link>
            </div>

            {/* Social Proof Mini */}
            <div className="flex items-center gap-4 pt-4 opacity-80">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-slate-600">
                <span className="text-brand-orange font-bold">5000+</span> mães felizes
              </div>
            </div>
          </div>

          {/* Right Content (Image Composition) */}
          <div className="relative h-[400px] md:h-[600px] hidden md:block">
            {/* Blob Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-acid/30 blur-3xl rounded-full opacity-60 animate-pulse" />

            {/* Main Image */}
            <div className="absolute inset-0 z-10 rounded-[2rem] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-all duration-700">
              <img
                src="https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800&auto=format&fit=crop"
                alt="Criança feliz"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating Cards */}
            <div className="absolute -bottom-6 -left-6 z-20 bg-white p-4 rounded-xl shadow-xl animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">🌿</div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Material</p>
                  <p className="font-bold text-brand-navy">100% Algodão</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-6 -right-6 z-20 bg-white p-4 rounded-xl shadow-xl animate-float delay-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-orange/20 rounded-full flex items-center justify-center text-brand-orange">⚡</div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase">Entrega</p>
                  <p className="font-bold text-brand-navy">Super Rápida</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Image (Simple) */}
          <div className="md:hidden relative rounded-2xl overflow-hidden shadow-lg h-[300px]">
            <img
              src="https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800&auto=format&fit=crop"
              alt="Criança feliz"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
