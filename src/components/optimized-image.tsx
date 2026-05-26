"use client";
import { useState, SyntheticEvent, ImgHTMLAttributes, useEffect } from "react";
import { cn } from "../lib/utils";
import { sanitizeImageUrl } from "../actions/utils";
import _ from "lodash";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  showMissingLabel?: boolean;
}

export function OptimizedImage({
  className,
  src,
  alt,
  onLoad,
  onError,
  fallbackSrc,
  showMissingLabel = false,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset state when src changes
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  if (hasError && isLoaded) {
    if (fallbackSrc) {
      return (
        <img
          src={typeof fallbackSrc === "string" ? sanitizeImageUrl(fallbackSrc) : fallbackSrc}
          alt={alt}
          loading="lazy"
          className={cn(
            "transition-opacity duration-500 opacity-100",
            className,
          )}
          onError={() => setHasError(true)}
          {...props}
        />
      );
    }

    return (
      <div
        className={cn(
          "flex items-center justify-center bg-black text-white text-sm font-bold",
          className,
        )}
      >
        <span className="select-none">
          {showMissingLabel ? `MISSING ${_.upperCase(alt)}` : "No image"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={typeof src === "string" ? sanitizeImageUrl(src) : src}
      alt={alt}
      loading="lazy"
      className={cn(
        "transition-opacity duration-500",
        isLoaded ? "opacity-100" : "opacity-0",
        className,
      )}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
}
