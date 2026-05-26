"use client";
import { useEffect, useState } from "react";
import { Vibrant } from "node-vibrant/browser";
import { OptimizedImage } from "./optimized-image";
import { getProxiedImageUrl } from "../actions/utils";

interface VibrantBackdropProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function VibrantBackdrop({
  src,
  alt,
  className = "w-full h-full object-cover",
  width = 1920,
  height = 1080,
}: VibrantBackdropProps) {
  const [shadowColor, setShadowColor] = useState<string>("");

  const extractColors = async () => {
    try {
      const proxiedSrc = getProxiedImageUrl(src);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = proxiedSrc;
      await img.decode();

      const palette = await Vibrant.from(img).getPalette();
      const vibrantColor =
        palette.Vibrant?.hex ||
        palette.LightVibrant?.hex ||
        palette.DarkVibrant?.hex ||
        palette.Muted?.hex;
      if (vibrantColor) {
        setShadowColor(vibrantColor);
      }
    } catch {
      // Backdrop may not load — use no shadow
    }
  };

  useEffect(() => {
    if (src) {
      extractColors();
    }
  }, [src]);

  const dynamicStyle = shadowColor
    ? {
        filter: `drop-shadow(0 20px 80px ${shadowColor}90) drop-shadow(0 40px 160px ${shadowColor}70) drop-shadow(0 60px 240px ${shadowColor}50) drop-shadow(0 80px 320px ${shadowColor}30)`,
        transition: "filter 0.5s ease-in-out",
      }
    : {};

  return (
    <OptimizedImage
      className={className}
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={dynamicStyle}
      crossOrigin="anonymous"
      onLoad={() => {
        if (!shadowColor) {
          extractColors();
        }
      }}
    />
  );
}
