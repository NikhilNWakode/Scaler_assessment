"use client";

import { MicOff } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  name: string;
  muted: boolean;
  cameraOn: boolean;
  isLocal?: boolean;
  isHost?: boolean;
}

export default function VideoTile({
  stream,
  name,
  muted,
  cameraOn,
  isLocal,
  isHost,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-zoom-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} /* never play back your own audio */
        className={`h-full w-full object-cover ${isLocal ? "-scale-x-100" : ""} ${
          cameraOn && stream ? "" : "hidden"
        }`}
      />
      {!(cameraOn && stream) && (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-zoom-blue text-xl font-semibold text-white sm:h-20 sm:w-20 sm:text-2xl">
          {initials}
        </span>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {muted && <MicOff size={12} className="text-red-400" />}
        <span className="max-w-[140px] truncate">
          {name}
          {isLocal && " (You)"}
        </span>
        {isHost && <span className="text-[10px] text-gray-300">· Host</span>}
      </div>
    </div>
  );
}
