import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import {
  CampaignBanner,
  trackBannerClick,
  trackBannerImpression,
  usePublicBanners,
} from "@/hooks/useBanners";

function seenKey(id: string) {
  return `delu_banner_popup_seen_${id}`;
}

function snoozeKey(id: string) {
  return `delu_banner_popup_snooze_until_${id}`;
}

function formatCountdown(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function hexToRgba(hex: string, alpha: number) {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

export default function CampaignPopup() {
  const location = useLocation();
  const { data: banners, isLoading } = usePublicBanners("popup");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const sentViewRef = useRef<Set<string>>(new Set());
  const [nowTick, setNowTick] = useState(Date.now());

  const shouldRun = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin")) return false;
    return p === "/";
  }, [location.pathname]);

  const eligibleBanners = useMemo(() => {
    if (!shouldRun) return [];
    if (!banners || banners.length === 0) return [];

    const now = Date.now();
    const list: CampaignBanner[] = [];

    for (const b of banners) {
      if (!b?.id) continue;

      try {
        if (localStorage.getItem(seenKey(b.id)) === "1") continue;
      } catch {
        // ignore
      }

      let snoozeUntilRaw: string | null = null;
      try {
        snoozeUntilRaw = localStorage.getItem(snoozeKey(b.id));
      } catch {
        // ignore
      }
      const snoozeUntil = snoozeUntilRaw ? Number(snoozeUntilRaw) : 0;
      if (Number.isFinite(snoozeUntil) && snoozeUntil > now) continue;

      list.push(b);
    }

    return list;
  }, [banners, shouldRun]);

  const banner = useMemo(() => {
    if (eligibleBanners.length === 0) return null;
    const idx = Math.max(0, Math.min(eligibleBanners.length - 1, activeIndex));
    return eligibleBanners[idx] || null;
  }, [eligibleBanners, activeIndex]);

  const bannerId = banner?.id || null;

  useEffect(() => {
    if (eligibleBanners.length === 0) {
      if (activeIndex !== 0) setActiveIndex(0);
      setOpen(false);
      return;
    }
    if (activeIndex > eligibleBanners.length - 1) {
      setActiveIndex(0);
    }
  }, [eligibleBanners.length, activeIndex]);

  useEffect(() => {
    if (!shouldRun) {
      setOpen(false);
    }
  }, [shouldRun]);

  useEffect(() => {
    if (isLoading) return;
    if (!bannerId) return;
    const t = setTimeout(() => setOpen(true), 450);
    return () => clearTimeout(t);
  }, [isLoading, bannerId]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open || !bannerId) return;
    if (sentViewRef.current.has(bannerId)) return;
    sentViewRef.current.add(bannerId);
    if (!bannerId.startsWith("fallback")) {
      trackBannerImpression(bannerId);
    }
  }, [open, bannerId]);

  const close = () => {
    if (bannerId) {
      try {
        localStorage.setItem(seenKey(bannerId), "1");
      } catch {
        // ignore
      }
    }
    setOpen(false);
  };

  const snooze7d = () => {
    if (!bannerId) return;
    const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(snoozeKey(bannerId), String(until));
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!shouldRun) return null;
  if (!banner) return null;

  const ctaHref = (banner.button_url || "/products?category=Promoções").trim();
  const ctaText = (banner.button_label || "Ver ofertas").trim();
  const endsAtMs = banner.end_at ? new Date(banner.end_at).getTime() : NaN;
  const timeLeft = Number.isFinite(endsAtMs) ? endsAtMs - nowTick : NaN;
  const countdown = Number.isFinite(timeLeft) && timeLeft > 0 ? formatCountdown(timeLeft) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="w-[min(96vw,1100px)] max-w-none p-0 overflow-hidden rounded-[28px] border-slate-100 bg-white max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 z-10 h-9 w-9 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-[1.15fr_0.85fr]">
          <div
            className="relative min-h-72 md:min-h-[520px]"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(banner.bg_color || "#0f172a", 0.16)}, ${hexToRgba(
                banner.bg_color || "#0f172a",
                0.04
              )})`,
            }}
          >
            <div className="absolute inset-0 opacity-70">
              <div
                className="absolute -top-10 -left-10 h-40 w-40 rounded-full blur-2xl"
                style={{ backgroundColor: hexToRgba(banner.bg_color || "#0f172a", 0.35) }}
              />
              <div
                className="absolute bottom-0 right-0 h-40 w-40 rounded-full blur-2xl"
                style={{ backgroundColor: hexToRgba(banner.bg_color || "#0f172a", 0.25) }}
              />
              <div
                className="absolute top-1/2 left-1/3 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{ backgroundColor: hexToRgba(banner.bg_color || "#0f172a", 0.18) }}
              />
            </div>
            <div className="relative p-6 md:p-8 h-full flex items-center justify-center">
              <div className="w-full max-w-2xl aspect-[16/10] rounded-3xl bg-white/60 border border-white/70 shadow-sm overflow-hidden">
                <SafeImage
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  fallbackSrc="/logo-full.png"
                />
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-extrabold tracking-wide" style={{ color: banner.bg_color }}>
                <Sparkles className="h-5 w-5" />
                <span className="text-xs uppercase">Campanha</span>
              </div>

              {eligibleBanners.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl font-bold"
                    onClick={() => setActiveIndex((i) => (i - 1 + eligibleBanners.length) % eligibleBanners.length)}
                  >
                    Anterior
                  </Button>
                  <div className="text-xs text-slate-400 font-bold tabular-nums">
                    {activeIndex + 1}/{eligibleBanners.length}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl font-bold"
                    onClick={() => setActiveIndex((i) => (i + 1) % eligibleBanners.length)}
                  >
                    Proxima
                  </Button>
                </div>
              )}
            </div>

            {countdown && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Oferta termina em</div>
                <div className="text-lg font-extrabold text-amber-900 mt-1">{countdown}</div>
              </div>
            )}

            <h2 className="mt-2 text-3xl md:text-4xl font-fredoka font-bold text-slate-900 leading-tight">
              {banner.title}
            </h2>

            {banner.subtitle && (
              <p className="mt-4 text-slate-600 leading-relaxed text-[15px]">{banner.subtitle}</p>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="rounded-xl h-11 font-extrabold"
                style={{
                  backgroundColor: banner.button_color || banner.bg_color || "#0f172a",
                  color: banner.button_text_color || "#ffffff",
                }}
              >
                <a
                  href={ctaHref}
                  onClick={() => {
                    if (banner?.id && !banner.id.startsWith("fallback")) trackBannerClick(banner.id);
                    close();
                  }}
                >
                  {ctaText}
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl h-11 font-bold border-slate-200"
                onClick={close}
              >
                Agora nao
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-xl font-bold text-slate-600"
                onClick={snooze7d}
              >
                Nao mostrar por 7 dias
              </Button>
            </div>

            <p className="mt-5 text-xs text-slate-400">Dica: voce pode encontrar estas ofertas no menu "Ofertas".</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
