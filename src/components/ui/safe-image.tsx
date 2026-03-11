import * as React from "react";

type SafeImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbackSrc?: string;
};

function normalizeSrc(src: string | null | undefined): string | undefined {
  if (typeof src !== "string") return undefined;
  const trimmed = src.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  return trimmed;
}

export function SafeImage({
  src,
  fallbackSrc = "/placeholder.svg",
  loading = "lazy",
  onError,
  ...props
}: SafeImageProps) {
  const normalized = normalizeSrc(src);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (img.dataset.fallbackApplied === "1") {
      onError?.(e);
      return;
    }
    img.dataset.fallbackApplied = "1";
    img.src = fallbackSrc;
    onError?.(e);
  };

  return (
    <img
      {...props}
      alt={props.alt ?? ""}
      src={normalized ?? fallbackSrc}
      loading={loading}
      onError={handleError}
    />
  );
}
