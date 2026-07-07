"use client";

import { useState } from "react";

const ZOOM_LOGO_URL =
  "https://us04st1.zoom.us/static/26.6.61501/image/new/topNav/Zoom_logo.svg";

export default function ZoomLogo({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // fallback wordmark if the CDN asset is unavailable
    return (
      <span
        className={`select-none text-[26px] font-extrabold lowercase leading-none tracking-tight text-[#0B5CFF] ${className}`}
      >
        zoom
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ZOOM_LOGO_URL}
      alt="Zoom"
      className={`h-6 w-auto ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
