"use client";

import { Copy, LayoutGrid, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  api,
  formatMeetingCode,
  inviteLink,
  type Meeting,
  type Participant,
} from "@/lib/api";
import { useMeetingRoom } from "@/lib/useMeetingRoom";
import ChatPanel from "./ChatPanel";
import ControlBar from "./ControlBar";
import ParticipantsPanel from "./ParticipantsPanel";
import VideoTile from "./VideoTile";

interface Props {
  meeting: Meeting;
  participant: Participant;
  displayName: string;
  hostKey: string | null;
  initialMicOn: boolean;
  initialCamOn: boolean;
  onLeave: (reason: "left" | "removed" | "ended") => void;
}

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 max-w-4xl";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2 max-w-5xl";
  if (count <= 9) return "grid-cols-2 sm:grid-cols-3 max-w-6xl";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

export default function MeetingRoom({
  meeting,
  participant,
  displayName,
  hostKey,
  initialMicOn,
  initialCamOn,
  onLeave,
}: Props) {
  const isHost = !!hostKey;
  const room = useMeetingRoom({
    meetingCode: meeting.meeting_code,
    displayName,
    hostKey,
    initialMicOn,
    initialCamOn,
    onKicked: (reason) => onLeave(reason),
  });

  const [panel, setPanel] = useState<"none" | "participants" | "chat">("none");
  const [showInfo, setShowInfo] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [readChat, setReadChat] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");

  const peerList = useMemo(() => Object.values(room.peers), [room.peers]);
  const unreadChat = panel === "chat" ? 0 : room.messages.length - readChat;

  useEffect(() => {
    if (panel === "chat") setReadChat(room.messages.length);
  }, [panel, room.messages.length]);

  // meeting timer in the top bar
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      setElapsed(
        s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const copyInvite = async () => {
    await navigator.clipboard.writeText(
      `${meeting.host.name} is inviting you to a Zoom meeting.\n\nTopic: ${meeting.title}\nJoin: ${inviteLink(meeting.meeting_code)}\nMeeting ID: ${formatMeetingCode(meeting.meeting_code)}\nPasscode: ${meeting.passcode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const leave = async () => {
    if (isHost && hostKey) {
      const endForEveryone = confirm(
        "End the meeting for everyone? (Cancel = just leave)"
      );
      if (endForEveryone) {
        room.endForAll();
        try {
          await api.endMeeting(meeting.meeting_code, hostKey);
        } catch {
          /* meeting may already be ended */
        }
      }
    }
    try {
      await api.leaveMeeting(meeting.meeting_code, participant.id);
    } catch {
      /* best effort */
    }
    onLeave("left");
  };

  const sharing = !!room.screenStream;
  const localTileStream = room.screenStream ?? room.localStream;

  return (
    <div className="relative flex h-screen flex-col bg-zoom-dark text-white">
      {/* top bar — Zoom Workplace web client style */}
      <div className="flex items-center justify-between bg-black px-4 py-2">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-bold lowercase text-white">
            zoom
          </span>
          <span className="text-[15px] font-semibold text-white">
            Workplace
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-300">
          <button
            onClick={() => setShowInfo((v) => !v)}
            aria-label="Meeting information"
            title={
              room.connected
                ? "Meeting information"
                : "Connecting to the meeting…"
            }
            className="rounded p-1 hover:bg-white/10"
          >
            <ShieldCheck
              size={18}
              className={room.connected ? "text-green-500" : "text-amber-400"}
            />
          </button>
          <span>{elapsed}</span>
          <span className="h-4 w-px bg-white/20" aria-hidden />
          <button className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[13px] text-white hover:bg-white/10">
            <LayoutGrid size={15} /> View
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="absolute right-4 top-12 z-30 w-80 rounded-xl border border-zoom-border bg-zoom-panel p-4 text-sm shadow-2xl">
          <p className="font-semibold">{meeting.title}</p>
          <p className="mt-2 text-gray-300">
            Meeting ID:{" "}
            <span className="text-white">
              {formatMeetingCode(meeting.meeting_code)}
            </span>
          </p>
          <p className="text-gray-300">
            Passcode: <span className="text-white">{meeting.passcode}</span>
          </p>
          <p className="text-gray-300">
            Host: <span className="text-white">{meeting.host.name}</span>
          </p>
          <button
            onClick={copyInvite}
            className="mt-3 flex items-center gap-1.5 rounded-lg bg-zoom-blue px-3 py-1.5 text-xs font-medium hover:bg-zoom-blue-dark"
          >
            <Copy size={13} /> {copied ? "Copied!" : "Copy invite link"}
          </button>
        </div>
      )}

      {/* main area — side panels overlay the video on small screens */}
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-y-auto p-3 sm:p-5">
          <div
            className={`grid w-full gap-3 ${gridClass(peerList.length + 1)}`}
          >
            <VideoTile
              stream={localTileStream}
              name={displayName}
              muted={!room.micOn}
              cameraOn={room.camOn || sharing}
              isLocal
              isHost={isHost}
            />
            {peerList.map((p) => (
              <VideoTile
                key={p.peerId}
                stream={p.stream}
                name={p.name}
                muted={p.muted}
                cameraOn={p.cameraOn}
                isHost={p.isHost}
              />
            ))}
          </div>
        </div>

        {panel === "participants" && (
          <ParticipantsPanel
            selfName={displayName}
            selfMuted={!room.micOn}
            isHost={isHost}
            peers={peerList}
            onClose={() => setPanel("none")}
            onMuteAll={room.muteAll}
            onMutePeer={room.mutePeer}
            onRemovePeer={room.removePeer}
          />
        )}
        {panel === "chat" && (
          <ChatPanel
            messages={room.messages}
            onSend={room.sendChat}
            onClose={() => setPanel("none")}
          />
        )}
      </div>

      {/* reactions popover */}
      {showReactions && (
        <div className="absolute bottom-16 left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-full border border-zoom-border bg-zoom-panel px-3 py-2 shadow-2xl">
          {["👍", "❤️", "😂", "👏", "🎉", "😮"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                room.sendChat(emoji);
                setShowReactions(false);
              }}
              className="rounded-full p-1.5 text-xl transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <ControlBar
        micOn={room.micOn}
        camOn={room.camOn}
        sharing={sharing}
        participantCount={peerList.length + 1}
        unreadChat={Math.max(0, unreadChat)}
        isHost={isHost}
        onToggleMic={room.toggleMic}
        onToggleCam={room.toggleCam}
        onToggleShare={sharing ? room.stopScreenShare : room.startScreenShare}
        onToggleParticipants={() =>
          setPanel((p) => (p === "participants" ? "none" : "participants"))
        }
        onToggleChat={() => setPanel((p) => (p === "chat" ? "none" : "chat"))}
        onReact={() => setShowReactions((v) => !v)}
        onHostTools={() =>
          setPanel((p) => (p === "participants" ? "none" : "participants"))
        }
        onMore={() => setShowInfo((v) => !v)}
        onLeave={leave}
      />
    </div>
  );
}
