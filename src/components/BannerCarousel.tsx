import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const banners = [
    {
        id: 1,
        image: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=1600&auto=format&fit=crop",
        title: "Nova Coleção DeLu",
        subtitle: "Estilo e conforto para os pequenos",
        cta: "Ver Novidades",
        link: "/products?category=Novidades",
        color: "bg-sunny"
    },
    {
        id: 2,
        image: "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?q=80&w=1600&auto=format&fit=crop",
        title: "Ofertas Especiais",
        subtitle: "Aproveite nossos preços incríveis",
        cta: "Confira Ofertas",
        link: "/products?category=Promoções",
        color: "bg-mint"
    },
    {
        id: 3,
        image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1600&auto=format&fit=crop",
        title: "Mundo Infantil",
        subtitle: "Tudo que seu filho precisa",
        cta: "Ver Tudo",
        link: "/products",
        color: "bg-coral"
    }
];

const BannerCarousel = () => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const next = () => setCurrent((prev) => (prev + 1) % banners.length);
    const prev = () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

    return (
        <section className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-slate-100">
            <div
                className="flex transition-transform duration-700 ease-out h-full"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {banners.map((banner) => (
                    <div key={banner.id} className="w-full h-full flex-shrink-0 relative">
                        {/* Background Image */}
                        <img
                            src={banner.image}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/20" />

                        {/* Content */}
                        <div className="absolute inset-0 flex items-center justify-center text-center">
                            <div className="container px-4 animate-fade-in-up">
                                <span className={`inline-block px-4 py-1 rounded-full text-sm font-bold mb-4 text-slate-900 ${banner.color}`}>
                                    Destaque
                                </span>
                                <h2 className="font-fredoka text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-md">
                                    {banner.title}
                                </h2>
                                <p className="text-white/90 text-lg md:text-xl mb-8 max-w-lg mx-auto drop-shadow">
                                    {banner.subtitle}
                                </p>
                                <Link to={banner.link}>
                                    <Button size="lg" className="rounded-full px-8 text-lg font-bold shadow-lg bg-white text-slate-900 hover:bg-slate-100">
                                        {banner.cta}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            >
                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
            </button>
            <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            >
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                {banners.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrent(index)}
                        className={`transition-all duration-300 rounded-full ${current === index
                            ? "w-8 h-3 bg-white"
                            : "w-3 h-3 bg-white/50 hover:bg-white/70"
                            }`}
                    />
                ))}
            </div>
        </section>
    );
};

export default BannerCarousel;
