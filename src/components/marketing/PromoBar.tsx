import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { usePublicBanners, trackBannerClick, trackBannerImpression } from "@/hooks/useBanners";

type Props = {
    fallbackText: string;
};

function joinText(title?: string | null, subtitle?: string | null) {
    const t = (title || "").trim();
    const s = (subtitle || "").trim();
    if (t && s) return `${t} \u2022 ${s}`;
    return t || s || "";
}

export default function PromoBar({ fallbackText }: Props) {
    const { data: banners } = usePublicBanners("bar");

    const banner = useMemo(() => {
        if (!banners || banners.length === 0) return null;
        return banners[0];
    }, [banners]);

    useEffect(() => {
        if (!banner?.id) return;
        if (banner.id.startsWith("fallback")) return;
        trackBannerImpression(banner.id);
    }, [banner?.id]);

    if (!banner) {
        return (
            <div className="bg-primary text-primary-foreground py-2 text-xs md:text-sm font-medium text-center px-4">
                <span>{fallbackText}</span>
            </div>
        );
    }

    const text = joinText(banner.title, banner.subtitle);
    const hasCta = Boolean(banner.button_label && banner.button_url);

    const content = (
        <div className="inline-flex items-center justify-center gap-2">
            <span className="font-semibold">{text}</span>
            {hasCta && (
                <span className="underline underline-offset-4 font-bold">
                    {banner.button_label}
                </span>
            )}
        </div>
    );

    return (
        <div
            className="py-2 text-xs md:text-sm font-medium text-center px-4"
            style={{
                backgroundColor: banner.bg_color || "#0f172a",
                color: banner.text_color || "#ffffff",
            }}
        >
            {banner.button_url ? (
                <Link
                    to={banner.button_url}
                    className="hover:opacity-95 transition-opacity"
                    onClick={() => {
                        if (!banner.id.startsWith("fallback")) trackBannerClick(banner.id);
                    }}
                >
                    {content}
                </Link>
            ) : (
                content
            )}
        </div>
    );
}
