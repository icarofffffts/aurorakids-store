import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CampaignBanner, trackBannerClick, trackBannerImpression, usePublicBanners } from "@/hooks/useBanners";

const fallbackBanners: CampaignBanner[] = [
    {
        id: "fallback-1",
        image_url: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=1600&auto=format&fit=crop",
        title: "Nova Colecao DeLu",
        subtitle: "Estilo e conforto para os pequenos",
        button_label: "Ver Novidades",
        button_url: "/products?category=Novidades",
        bg_color: "#f59e0b",
        text_color: "#ffffff",
        button_color: "#ffffff",
        button_text_color: "#0f172a",
        position: "hero",
        priority: 10,
    },
    {
        id: "fallback-2",
        image_url: "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?q=80&w=1600&auto=format&fit=crop",
        title: "Ofertas Especiais",
        subtitle: "Aproveite nossos precos incriveis",
        button_label: "Confira Ofertas",
        button_url: "/products?category=Promoções",
        bg_color: "#10b981",
        text_color: "#ffffff",
        button_color: "#ffffff",
        button_text_color: "#0f172a",
        position: "hero",
        priority: 5,
    },
    {
        id: "fallback-3",
        image_url: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1600&auto=format&fit=crop",
        title: "Mundo Infantil",
        subtitle: "Tudo que seu filho precisa",
        button_label: "Ver Tudo",
        button_url: "/products",
        bg_color: "#fb7185",
        text_color: "#ffffff",
        button_color: "#ffffff",
        button_text_color: "#0f172a",
        position: "hero",
        priority: 1,
    },
];

function hexToRgba(hex: string, alpha: number) {
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r},${g},${b},${a})`;
}

const BannerCarousel = () => {
    const [current, setCurrent] = useState(0);
    const { data: apiBanners } = usePublicBanners("hero");
    const sentImpressionsRef = useRef<Set<string>>(new Set());

    const banners = useMemo(() => {
        return apiBanners && apiBanners.length > 0 ? apiBanners : fallbackBanners;
    }, [apiBanners]);

    useEffect(() => {
        if (current > banners.length - 1) setCurrent(0);
    }, [current, banners.length]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners.length]);

    useEffect(() => {
        const banner = banners[current];
        if (!banner?.id) return;
        if (banner.id.startsWith("fallback")) return;
        if (sentImpressionsRef.current.has(banner.id)) return;
        sentImpressionsRef.current.add(banner.id);
        trackBannerImpression(banner.id);
    }, [banners, current]);

    const next = () => setCurrent((prev) => (prev + 1) % banners.length);
    const prev = () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

    return (

        <section className="relative w-full h-[500px] md:h-[600px] overflow-hidden bg-background">
            {/* Decorative Background Blobs (Global) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[80px] animate-float opacity-60" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[80px] animate-float delay-1000 opacity-60" />
            </div>

            <div
                className="flex transition-transform duration-700 ease-out h-full"
                style={{ transform: `translateX(-${current * 100}%)` }}
            >
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="w-full h-full flex-shrink-0 relative"
                        style={{ backgroundColor: banner.bg_color || "#0f172a" }}
                    >
                        {/* Background Image with Overlay */}
                        <div className="absolute inset-0">
                            {banner.image_url ? (
                                <img
                                    src={banner.image_url}
                                    alt={banner.title}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-transparent" />
                            )}
                            {/* Premium Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
                        </div>

                        {/* Content */}
                        <div className="absolute inset-0 flex items-center">
                            <div className="container px-4 md:px-12 grid grid-cols-1 md:grid-cols-2">
                                <div className="space-y-6 animate-fade-in-up md:pl-8">
                                    <span
                                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur-md border border-white/20 text-white"
                                        style={{ backgroundColor: hexToRgba(banner.bg_color, 0.65) }}
                                    >
                                        ✨ Destaque da Semana
                                    </span>

                                    <h2
                                        className="font-fredoka text-5xl md:text-7xl font-black leading-[0.9] drop-shadow-lg tracking-tight"
                                        style={{ color: banner.text_color || "#ffffff" }}
                                    >
                                        {banner.title}
                                    </h2>

                                    <p
                                        className="text-lg md:text-2xl font-medium max-w-lg drop-shadow leading-relaxed"
                                        style={{ color: hexToRgba(banner.text_color || "#ffffff", 0.9) }}
                                    >
                                        {banner.subtitle}
                                    </p>

                                    <div className="flex gap-4 pt-2">
                                        {banner.button_label && banner.button_url && (
                                            <Link
                                                to={banner.button_url}
                                                onClick={() => {
                                                    if (!banner.id.startsWith("fallback")) {
                                                        trackBannerClick(banner.id);
                                                    }
                                                }}
                                            >
                                                <Button
                                                    size="lg"
                                                    className="h-14 rounded-full px-8 text-lg font-bold shadow-xl hover:scale-105 transition-all border-2 border-transparent"
                                                    style={{
                                                        backgroundColor: banner.button_color || "#ffffff",
                                                        color: banner.button_text_color || "#0f172a",
                                                    }}
                                                >
                                                    {banner.button_label}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls with Glassmorphism */}
            <button
                onClick={prev}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-white/10 hover:bg-white/30 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 group"
            >
                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8 group-hover:-translate-x-1 transition-transform" />
            </button>
            <button
                onClick={next}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 bg-white/10 hover:bg-white/30 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-white transition-all shadow-lg hover:scale-110 group"
            >
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10">
                {banners.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrent(index)}
                        className={`transition-all duration-300 rounded-full ${current === index
                            ? "w-8 h-2 bg-primary shadow-[0_0_10px_rgba(255,50,150,0.8)]"
                            : "w-2 h-2 bg-white/50 hover:bg-white/80"
                            }`}
                    />
                ))}
            </div>
        </section>
    );
};

export default BannerCarousel;
