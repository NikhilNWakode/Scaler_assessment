"use client";

import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
}

function ControlButton({ icon, label, onClick, danger, badge }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex w-[68px] flex-col items-center gap-1 rounded-lg py-2 text-[11px] transition-colors sm:w-[76px] ${
        danger ? "text-red-400 hover:bg-red-500/10" : "text-gray-200 hover:bg-white/10"
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-0.5 rounded-full bg-zoom-blue px-1.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

interface Props {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  participantCount: number;
  unreadChat: number;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  isHost: boolean;
}

export default function ControlBar({
  micOn,
  camOn,
  sharing,
  participantCount,
  unreadChat,
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleParticipants,
  onToggleChat,
  onLeave,
  isHost,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-zoom-border bg-zoom-panel px-2 py-1.5 sm:px-4">
      <div className="flex items-center">
        <ControlButton
          icon={micOn ? <Mic size={20} /> : <MicOff size={20} className="text-red-400" />}
          label={micOn ? "Mute" : "Unmute"}
          onClick={onToggleMic}
        />
        <ControlButton
          icon={camOn ? <Video size={20} /> : <VideoOff size={20} className="text-red-400" />}
          label={camOn ? "Stop Video" : "Start Video"}
          onClick={onToggleCam}
        />
      </div>

      <div className="flex items-center">
        <ControlButton
          icon={<Users size={20} />}
          label="Participants"
          onClick={onToggleParticipants}
          badge={participantCount}
        />
        <ControlButton
          icon={<MessageSquare size={20} />}
          label="Chat"
          onClick={onToggleChat}
          badge={unreadChat}
        />
        <ControlButton
          icon={<MonitorUp size={20} className={sharing ? "text-green-400" : "text-green-500"} />}
          label={sharing ? "Stop Share" : "Share Screen"}
          onClick={onToggleShare}
        />
      </div>

      <button
        onClick={onLeave}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:px-5"
      >
        {isHost ? "End" : "Leave"}
      </button>
    </div>
  );
}
