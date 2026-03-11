import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicBanners, trackBannerImpression, trackBannerClick, CampaignBanner } from "@/hooks/useBanners";

// Fallback banners if API returns empty
const fallbackBanners: CampaignBanner[] = [
    {
        id: "fallback-1",
        title: "Nova Colecao DeLu",
        subtitle: "Estilo e conforto para os pequenos",
        button_label: "Ver Novidades",
        button_url: "/products",
        image_url: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?q=80&w=1200&auto=format&fit=crop",
        bg_color: "#1e40af",
        text_color: "#ffffff",
        button_color: "#ffffff",
        button_text_color: "#1e40af",
        position: "hero",
        priority: 10,
    },
    {
        id: "fallback-2",
        title: "Mundo Infantil",
        subtitle: "Tudo que seu filho precisa",
        button_label: "Ver Tudo",
        button_url: "/products",
        image_url: "https://images.unsplash.com/photo-1519457431-44ccd64a579b?q=80&w=1200&auto=format&fit=crop",
        bg_color: "#0f766e",
        text_color: "#ffffff",
        button_color: "#ffffff",
        button_text_color: "#0f766e",
        position: "hero",
        priority: 5,
    },
    {
        id: "fallback-3",
        title: "Conforto Premium",
        subtitle: "Qualidade que voce pode confiar",
        button_label: "Explorar",
        button_url: "/products",
        image_url: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=1200&auto=format&fit=crop",
        bg_color: "#7c3aed",
        text_color: "#ffffff",
        button_color: "#ffffff",
        button_text_color: "#7c3aed",
        position: "hero",
        priority: 3,
    },
];

const HeroBannerCarousel = () => {
    const { data: apiBanners, isLoading } = usePublicBanners("hero");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const banners = apiBanners && apiBanners.length > 0 ? apiBanners : fallbackBanners;

    // Auto-advance carousel
    useEffect(() => {
        if (isPaused || banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [isPaused, banners.length]);

    // Track impression when banner changes
    useEffect(() => {
        const banner = banners[currentIndex];
        if (banner && !banner.id.startsWith("fallback")) {
            trackBannerImpression(banner.id);
        }
    }, [currentIndex, banners]);

    const goToSlide = useCallback((index: number) => {
        setCurrentIndex(index);
    }, []);

    const goNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, [banners.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }, [banners.length]);

    const handleButtonClick = (banner: CampaignBanner) => {
        if (!banner.id.startsWith("fallback")) {
            trackBannerClick(banner.id);
        }
    };

    if (isLoading) {
        return (
            <section className="relative w-full h-[60vh] md:h-[80vh] bg-slate-200 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </section>
        );
    }

    const currentBanner = banners[currentIndex];

    return (
        <section
            className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Banner Slides */}
            {banners.map((banner, index) => (
                <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                        index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
                    }`}
                    style={{ backgroundColor: banner.bg_color }}
                >
                    {/* Background Image */}
                    {banner.image_url && (
                        <div className="absolute inset-0">
                            <img
                                src={banner.image_url}
                                alt={banner.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30" />
                        </div>
                    )}

                    {/* Content */}
                    <div className="relative h-full container mx-auto px-4 flex flex-col justify-center">
                        <div className="max-w-2xl space-y-4 md:space-y-6">
                            {/* Tag */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium" style={{ color: banner.text_color }}>
                                <span className="text-lg">✨</span>
                                Destaque da Semana
                            </div>

                            {/* Title */}
                            <h1
                                className="font-fredoka text-4xl md:text-6xl lg:text-7xl font-bold leading-tight"
                                style={{ color: banner.text_color }}
                            >
                                {banner.title}
                            </h1>

                            {/* Subtitle */}
                            {banner.subtitle && (
                                <p
                                    className="text-lg md:text-xl max-w-lg opacity-90"
                                    style={{ color: banner.text_color }}
                                >
                                    {banner.subtitle}
                                </p>
                            )}

                            {/* CTA Button */}
                            {banner.button_label && banner.button_url && (
                                <div className="pt-4">
                                    <Link to={banner.button_url} onClick={() => handleButtonClick(banner)}>
                                        <Button
                                            size="lg"
                                            className="h-12 md:h-14 rounded-full px-8 md:px-10 text-base md:text-lg font-bold shadow-lg hover:scale-105 transition-transform"
                                            style={{
                                                backgroundColor: banner.button_color,
                                                color: banner.button_text_color,
                                            }}
                                        >
                                            {banner.button_label}
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* Navigation Arrows */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={goPrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                        aria-label="Banner anterior"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                        onClick={goNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                        aria-label="Proximo banner"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </>
            )}

            {/* Dots Indicator */}
            {banners.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-2 rounded-full transition-all ${
                                index === currentIndex
                                    ? "w-8 bg-white"
                                    : "w-2 bg-white/50 hover:bg-white/70"
                            }`}
                            aria-label={`Ir para banner ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default HeroBannerCarousel;
