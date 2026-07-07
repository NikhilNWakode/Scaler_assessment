"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatMeetingCode, type Meeting } from "@/lib/api";

interface Props {
  meeting: Meeting;
  defaultName: string;
  onJoin: (opts: { name: string; micOn: boolean; camOn: boolean }) => void;
  joining: boolean;
}

export default function PreJoin({ meeting, defaultName, onJoin, joining }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [name, setName] = useState(defaultName);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState("");

  useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  // Camera preview — independent of the in-meeting stream
  useEffect(() => {
    let cancelled = false;
    if (!camOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setMediaError("");
      })
      .catch(() =>
        setMediaError("Camera unavailable — you can still join without video.")
      );
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [camOn]);

  const initials = (name.trim() || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zoom-dark px-4 py-10 text-white">
      <div className="w-full max-w-xl">
        <h1 className="mb-1 text-center text-xl font-semibold">
          {meeting.title}
        </h1>
        <p className="mb-6 text-center text-sm text-gray-400">
          Meeting ID: {formatMeetingCode(meeting.meeting_code)}
        </p>

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zoom-tile shadow-xl">
          {camOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-zoom-blue text-3xl font-semibold">
                {initials}
              </span>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
            <button
              onClick={() => setMicOn((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                micOn ? "bg-black/50 hover:bg-black/70" : "bg-red-600 hover:bg-red-700"
              }`}
              aria-label={micOn ? "Mute" : "Unmute"}
            >
              {micOn ? <Mic size={19} /> : <MicOff size={19} />}
            </button>
            <button
              onClick={() => setCamOn((v) => !v)}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                camOn ? "bg-black/50 hover:bg-black/70" : "bg-red-600 hover:bg-red-700"
              }`}
              aria-label={camOn ? "Stop video" : "Start video"}
            >
              {camOn ? <Video size={19} /> : <VideoOff size={19} />}
            </button>
          </div>
        </div>

        {mediaError && (
          <p className="mt-3 text-center text-xs text-amber-400">{mediaError}</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onJoin({ name: name.trim(), micOn, camOn });
          }}
          className="mt-6 flex flex-col items-center gap-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={100}
            required
            className="w-full max-w-sm rounded-lg border border-zoom-border bg-zoom-panel px-4 py-2.5 text-center text-sm outline-none placeholder:text-gray-500 focus:border-zoom-blue"
          />
          <button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full max-w-sm rounded-lg bg-zoom-blue py-2.5 text-sm font-semibold hover:bg-zoom-blue-dark disabled:opacity-50"
          >
            {joining ? "Joining…" : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
