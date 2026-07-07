"use client";

import { Copy, Info, Shield } from "lucide-react";
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
  isHost: boolean;
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
  isHost,
  initialMicOn,
  initialCamOn,
  onLeave,
}: Props) {
  const room = useMeetingRoom({
    meetingCode: meeting.meeting_code,
    displayName,
    isHost,
    initialMicOn,
    initialCamOn,
    onKicked: (reason) => onLeave(reason),
  });

  const [panel, setPanel] = useState<"none" | "participants" | "chat">("none");
  const [showInfo, setShowInfo] = useState(false);
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
    if (isHost) {
      const endForEveryone = confirm(
        "End the meeting for everyone? (Cancel = just leave)"
      );
      if (endForEveryone) {
        room.endForAll();
        try {
          await api.endMeeting(meeting.meeting_code);
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
    <div className="flex h-screen flex-col bg-zoom-dark text-white">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-zoom-border bg-zoom-panel px-4 py-2">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-green-500" />
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-100 hover:text-white"
          >
            {meeting.title}
            <Info size={13} className="text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className={room.connected ? "text-green-400" : "text-amber-400"}>
            {room.connected ? "● Connected" : "○ Connecting…"}
          </span>
          <span>{elapsed}</span>
        </div>
      </div>

      {showInfo && (
        <div className="absolute left-4 top-12 z-30 w-80 rounded-xl border border-zoom-border bg-zoom-panel p-4 text-sm shadow-2xl">
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

      {/* main area */}
      <div className="flex min-h-0 flex-1">
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

      <ControlBar
        micOn={room.micOn}
        camOn={room.camOn}
        sharing={sharing}
        participantCount={peerList.length + 1}
        unreadChat={Math.max(0, unreadChat)}
        onToggleMic={room.toggleMic}
        onToggleCam={room.toggleCam}
        onToggleShare={sharing ? room.stopScreenShare : room.startScreenShare}
        onToggleParticipants={() =>
          setPanel((p) => (p === "participants" ? "none" : "participants"))
        }
        onToggleChat={() => setPanel((p) => (p === "chat" ? "none" : "chat"))}
        onLeave={leave}
        isHost={isHost}
      />
    </div>
  );
}
