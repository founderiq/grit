"use client";

import { useEffect, useRef, useState } from "react";

type UgcVideoProps = {
  sources: { webm: string; mp4: string };
  poster: string;
  label: string;
  radius?: number;
  className?: string;
};

/**
 * Video UGC autoplay / muted / loop / sin controles, con carga diferida:
 * el <video> recién monta sus <source> cuando la tarjeta se acerca al
 * viewport (evita descargar los cinco videos al abrir la página), y se
 * pausa/reanuda según entra o sale del viewport para ahorrar batería/CPU.
 */
export default function UgcVideo({
  sources,
  poster,
  label,
  radius = 10,
  className = "",
}: UgcVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Carga diferida: recién monta el <video> cuando la tarjeta está cerca del viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reproducción permanente en loop mientras está visible; se pausa lejos del viewport.
  useEffect(() => {
    if (!shouldLoad) return;
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // iOS Safari solo autorreproduce si `muted` está seteado antes del play().
    video.muted = true;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden bg-[#211D19]/60 ${className}`}
      style={{ borderRadius: `${radius}px` }}
    >
      {shouldLoad ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-label={label}
        >
          <source src={sources.webm} type="video/webm" />
          <source src={sources.mp4} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- poster liviano antes de montar el <video>
        <img
          src={poster}
          alt={label}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
