import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-background pt-12 pb-20 md:pt-20 md:pb-32">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl animate-float opacity-70" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-3xl animate-float opacity-60 delay-1000" />
        <div className="absolute bottom-[10%] left-[20%] w-[20%] h-[20%] bg-accent/20 rounded-full blur-3xl animate-pulse opacity-50 delay-500" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">

          {/* Left Content (Text) */}
          <div className="space-y-8 animate-fade-in z-10 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-secondary/50 shadow-sm text-foreground text-sm font-bold tracking-wide uppercase">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Nova Coleção 2025</span>
            </div>

            <h1 className="font-fredoka text-5xl md:text-7xl lg:text-8xl font-black text-foreground leading-[0.9] tracking-tight drop-shadow-sm">
              Estilo Que <br />
              <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-accent">
                Conta Histórias
                <svg className="absolute w-full h-4 -bottom-2 left-0 text-secondary -z-10 opacity-60" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 12 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>

            <p className="text-slate-600 text-lg md:text-xl max-w-lg leading-relaxed font-medium">
              Roupas pensadas para <span className="text-primary font-bold">brincar</span>, <span className="text-secondary-foreground font-bold">pular</span> e <span className="text-accent-foreground font-bold">sonhar</span>. Conforto premium com aquele toque de magia.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/products?category=Novidades">
                <Button size="lg" className="h-14 rounded-full px-10 text-lg font-bold bg-primary text-white hover:bg-primary/90 hover:scale-105 transition-all shadow-primary hover:shadow-lg hover:shadow-primary/50">
                  Ver Novidades
                  <ArrowRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
              <Link to="/products?category=Promoções">
                <Button variant="outline" size="lg" className="h-14 rounded-full px-10 text-lg font-bold border-2 border-primary/20 text-foreground bg-white/50 hover:bg-white hover:border-primary/50 transition-all">
                  Ofertas
                </Button>
              </Link>
            </div>

            {/* Social Proof Mini */}
            <div className="flex items-center gap-4 pt-6 opacity-90">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-[3px] border-white shadow-md bg-slate-200 overflow-hidden hover:-translate-y-1 transition-transform">
                     <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="Cliente" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-medium text-slate-600">
                <span className="text-primary font-bold text-lg">5.000+</span><br />mães felizes
              </div>
            </div>
          </div>

          {/* Right Content (Image Composition) */}
          <div className="relative h-[500px] md:h-[700px] hidden md:block perspective-1000">
            {/* Blob Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-br from-primary/20 to-accent/20 blur-[80px] rounded-full opacity-60 animate-pulse" />

            {/* Main Image */}
            <div className="absolute inset-0 z-10 rounded-[3rem] overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-all duration-700 hover:shadow-primary/20 border-8 border-white/40">
              <img
                src="https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800&auto=format&fit=crop"
                alt="Criança feliz"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
              />

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Floating Cards with Glassmorphism */}
            <div className="absolute -bottom-8 -left-8 z-20 bg-white/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl animate-float border border-white/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl shadow-inner">🌿</div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Material</p>
                  <p className="font-bold text-foreground text-lg">100% Algodão</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-8 -right-8 z-20 bg-white/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl animate-float delay-700 border border-white/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl shadow-inner">⚡</div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Entrega</p>
                  <p className="font-bold text-foreground text-lg">Super Rápida</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Image (Simple) */}
          <div className="md:hidden relative rounded-3xl overflow-hidden shadow-xl h-[400px] border-4 border-white">
            <img
              src="https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=800&auto=format&fit=crop"
              alt="Criança feliz"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg text-center">
              <p className="font-fredoka font-bold text-primary">Conforto para brincar!</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
