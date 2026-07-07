"use client";

import {
  ChevronUp,
  Ellipsis,
  Heart,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Shield,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  caret?: boolean;
}

function ControlButton({ icon, label, onClick, badge, caret }: ControlButtonProps) {
  return (
    <div className="relative flex items-start">
      <button
        onClick={onClick}
        className="flex w-[52px] flex-col items-center gap-1.5 rounded-lg py-2 text-[10px] text-gray-100 transition-colors hover:bg-white/10 sm:w-[64px] sm:text-[11px]"
      >
        {icon}
        <span className="max-w-full truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 right-1 rounded-full bg-zoom-blue px-1.5 text-[10px] font-semibold text-white">
            {badge}
          </span>
        )}
      </button>
      {caret && (
        <button
          aria-label={`${label} options`}
          className="mt-2 hidden rounded p-0.5 text-gray-400 hover:bg-white/10 sm:block"
        >
          <ChevronUp size={12} />
        </button>
      )}
    </div>
  );
}

interface Props {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  participantCount: number;
  unreadChat: number;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onReact: () => void;
  onHostTools: () => void;
  onMore: () => void;
  onLeave: () => void;
}

export default function ControlBar({
  micOn,
  camOn,
  sharing,
  participantCount,
  unreadChat,
  isHost,
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleParticipants,
  onToggleChat,
  onReact,
  onHostTools,
  onMore,
  onLeave,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-1 bg-black px-2 py-1 sm:px-4">
      {/* left: mic + camera */}
      <div className="flex items-center">
        <ControlButton
          icon={
            micOn ? (
              <Mic size={21} />
            ) : (
              <MicOff size={21} className="text-red-500" />
            )
          }
          label={micOn ? "Mute" : "Unmute"}
          onClick={onToggleMic}
          caret
        />
        <ControlButton
          icon={
            camOn ? (
              <Video size={21} />
            ) : (
              <VideoOff size={21} className="text-red-500" />
            )
          }
          label="Video"
          onClick={onToggleCam}
          caret
        />
      </div>

      {/* center: meeting tools */}
      <div className="flex items-center">
        <ControlButton
          icon={<Users size={21} />}
          label="Participants"
          onClick={onToggleParticipants}
          badge={participantCount}
          caret
        />
        <ControlButton
          icon={<MessageCircle size={21} />}
          label="Chat"
          onClick={onToggleChat}
          badge={unreadChat}
          caret
        />
        <div className="hidden sm:block">
          <ControlButton
            icon={<Heart size={21} />}
            label="React"
            onClick={onReact}
          />
        </div>
        <ControlButton
          icon={
            <span
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-md ${
                sharing ? "bg-red-600" : "bg-green-600"
              }`}
            >
              <MonitorUp size={16} className="text-white" />
            </span>
          }
          label={sharing ? "Stop Share" : "Share"}
          onClick={onToggleShare}
        />
        {isHost && (
          <div className="hidden sm:block">
            <ControlButton
              icon={<Shield size={21} />}
              label="Host tools"
              onClick={onHostTools}
            />
          </div>
        )}
        <ControlButton
          icon={<Ellipsis size={21} />}
          label="More"
          onClick={onMore}
        />
      </div>

      {/* right: end / leave */}
      <button
        onClick={onLeave}
        className="mr-1 rounded-lg px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 sm:px-4"
      >
        {isHost ? "End" : "Leave"}
      </button>
    </div>
  );
}
