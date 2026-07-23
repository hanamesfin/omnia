"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
};

export function LazyImage({ src, alt, className = "", imgClassName = "" }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {!loaded && !failed ? (
        <div className="product-app-skeleton absolute inset-0" aria-hidden />
      ) : null}
      {failed || !src ? (
        <div
          className="flex h-full min-h-[120px] w-full items-center justify-center bg-[rgba(0,0,0,0.04)]"
          aria-hidden
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}
