"use client";

import { Mic, MicOff, X } from "lucide-react";
import type { RemotePeer } from "@/lib/useMeetingRoom";

interface Props {
  selfName: string;
  selfMuted: boolean;
  isHost: boolean;
  peers: RemotePeer[];
  onClose: () => void;
  onMuteAll: () => void;
  onMutePeer: (peerId: string) => void;
  onRemovePeer: (peerId: string) => void;
}

function Row({
  name,
  muted,
  isHost,
  you,
  actions,
}: {
  name: string;
  muted: boolean;
  isHost: boolean;
  you?: boolean;
  actions?: React.ReactNode;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zoom-blue text-xs font-semibold text-white">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-gray-100">
          {name}
          {you && <span className="text-gray-400"> (You)</span>}
        </p>
        {isHost && <p className="text-[11px] text-gray-400">Host</p>}
      </div>
      <div className="flex items-center gap-1">
        {actions}
        {muted ? (
          <MicOff size={15} className="text-red-400" />
        ) : (
          <Mic size={15} className="text-gray-400" />
        )}
      </div>
    </div>
  );
}

export default function ParticipantsPanel({
  selfName,
  selfMuted,
  isHost,
  peers,
  onClose,
  onMuteAll,
  onMutePeer,
  onRemovePeer,
}: Props) {
  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-full flex-col border-l border-zoom-border bg-zoom-panel sm:static sm:w-80">
      <div className="flex items-center justify-between border-b border-zoom-border px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-100">
          Participants ({peers.length + 1})
        </h3>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:bg-white/10"
          aria-label="Close participants"
        >
          <X size={16} />
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto p-2">
        <Row name={selfName} muted={selfMuted} isHost={isHost} you />
        {peers.map((p) => (
          <Row
            key={p.peerId}
            name={p.name}
            muted={p.muted}
            isHost={p.isHost}
            actions={
              isHost ? (
                <div className="flex items-center gap-1 sm:hidden sm:group-hover:flex">
                  {!p.muted && (
                    <button
                      onClick={() => onMutePeer(p.peerId)}
                      className="rounded border border-zoom-border px-2 py-0.5 text-[11px] text-gray-300 hover:bg-white/10"
                    >
                      Mute
                    </button>
                  )}
                  <button
                    onClick={() => onRemovePeer(p.peerId)}
                    className="rounded border border-red-500/40 px-2 py-0.5 text-[11px] text-red-400 hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              ) : undefined
            }
          />
        ))}
      </div>

      {isHost && peers.length > 0 && (
        <div className="border-t border-zoom-border p-3">
          <button
            onClick={onMuteAll}
            className="w-full rounded-lg border border-zoom-border py-2 text-sm font-medium text-gray-200 hover:bg-white/10"
          >
            Mute All
          </button>
        </div>
      )}
    </aside>
  );
}
