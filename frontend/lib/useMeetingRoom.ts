"use client";

/**
 * Owns everything live about a meeting:
 *  - the WebSocket to the backend room (presence, signaling, chat, host controls)
 *  - one RTCPeerConnection per remote participant (mesh topology)
 *  - local mic/camera/screen-share state
 *
 * Signaling follows the "perfect negotiation" pattern so renegotiation
 * (e.g. starting a screen share with no camera) never deadlocks.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL } from "./api";

export interface RemotePeer {
  peerId: string;
  name: string;
  isHost: boolean;
  muted: boolean;
  cameraOn: boolean;
  stream: MediaStream | null;
}

export interface ChatMessage {
  id: number;
  name: string;
  text: string;
  self: boolean;
  time: string;
}

interface PeerState {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
}

interface Options {
  meetingCode: string;
  displayName: string;
  /** Secret host key — the backend verifies it; without it host controls are ignored. */
  hostKey: string | null;
  initialMicOn: boolean;
  initialCamOn: boolean;
  /** Called when the host removes you or ends the meeting for everyone. */
  onKicked: (reason: "removed" | "ended") => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let chatId = 0;

export function useMeetingRoom(opts: Options) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(opts.initialMicOn);
  const [camOn, setCamOn] = useState(opts.initialCamOn);
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const peerIdRef = useRef<string>("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const send = useCallback((msg: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const updatePeer = useCallback(
    (peerId: string, patch: Partial<RemotePeer>) => {
      setPeers((prev) =>
        prev[peerId] ? { ...prev, [peerId]: { ...prev[peerId], ...patch } } : prev
      );
    },
    []
  );

  const createPeer = useCallback(
    (remoteId: string): PeerState => {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      const state: PeerState = {
        pc,
        polite: peerIdRef.current < remoteId,
        makingOffer: false,
        ignoreOffer: false,
        pendingCandidates: [],
      };
      peersRef.current.set(remoteId, state);

      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      } else {
        // No mic/camera: still negotiate both kinds so remote media flows in.
        pc.addTransceiver("audio", { direction: "recvonly" });
        pc.addTransceiver("video", { direction: "recvonly" });
      }

      pc.onnegotiationneeded = async () => {
        try {
          state.makingOffer = true;
          await pc.setLocalDescription();
          send({ type: "offer", to: remoteId, sdp: pc.localDescription });
        } catch {
          /* pc was closed mid-negotiation */
        } finally {
          state.makingOffer = false;
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: "ice-candidate", to: remoteId, candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        updatePeer(remoteId, { stream });
      };

      return state;
    },
    [send, updatePeer]
  );

  const closePeer = useCallback((remoteId: string) => {
    peersRef.current.get(remoteId)?.pc.close();
    peersRef.current.delete(remoteId);
    setPeers((prev) => {
      const next = { ...prev };
      delete next[remoteId];
      return next;
    });
  }, []);

  const handleSignal = useCallback(
    async (msg: { type: string; from: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      const state = peersRef.current.get(msg.from) ?? createPeer(msg.from);
      const { pc } = state;

      try {
        if (msg.type === "offer" || msg.type === "answer") {
          const desc = msg.sdp!;
          if (desc.type === "offer") {
            const collision = state.makingOffer || pc.signalingState !== "stable";
            state.ignoreOffer = !state.polite && collision;
            if (state.ignoreOffer) return;
            await pc.setRemoteDescription(desc);
            await pc.setLocalDescription();
            send({ type: "answer", to: msg.from, sdp: pc.localDescription });
          } else if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(desc);
          }
          // Flush ICE candidates that arrived before the remote description
          for (const c of state.pendingCandidates.splice(0)) {
            await pc.addIceCandidate(c).catch(() => {});
          }
        } else if (msg.type === "ice-candidate" && msg.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(msg.candidate).catch(() => {});
          } else {
            state.pendingCandidates.push(msg.candidate);
          }
        }
      } catch {
        /* negotiation error with a departing peer — safe to ignore */
      }
    },
    [createPeer, send]
  );

  // ---- lifecycle: acquire media, open socket, wire up handlers -------------
  useEffect(() => {
    let disposed = false;
    peerIdRef.current =
      globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

    async function getMedia(): Promise<MediaStream | null> {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          return null; // join without any devices
        }
      }
    }

    (async () => {
      const stream = await getMedia();
      if (disposed) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      if (stream) {
        const audio = stream.getAudioTracks()[0];
        const video = stream.getVideoTracks()[0];
        if (audio) audio.enabled = optsRef.current.initialMicOn;
        if (video) video.enabled = optsRef.current.initialCamOn;
        cameraTrackRef.current = video ?? null;
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (!audio) setMicOn(false);
        if (!video) setCamOn(false);
      } else {
        setMicOn(false);
        setCamOn(false);
      }

      const ws = new WebSocket(
        `${WS_URL}/ws/${optsRef.current.meetingCode}/${peerIdRef.current}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            type: "hello",
            name: optsRef.current.displayName,
            host_key: optsRef.current.hostKey ?? "",
            muted: !localStreamRef.current?.getAudioTracks()[0]?.enabled,
            camera_on: !!localStreamRef.current?.getVideoTracks()[0]?.enabled,
          })
        );
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "roster": {
            // We are the newcomer: create a connection to every existing peer.
            const existing: Record<string, RemotePeer> = {};
            for (const p of msg.peers) {
              if (p.peer_id === peerIdRef.current) continue;
              existing[p.peer_id] = {
                peerId: p.peer_id,
                name: p.name,
                isHost: p.is_host,
                muted: p.muted,
                cameraOn: p.camera_on,
                stream: null,
              };
              createPeer(p.peer_id); // addTrack fires onnegotiationneeded → offer
            }
            setPeers(existing);
            break;
          }
          case "peer-joined":
            // Newcomer will send us an offer; just show them in the roster.
            setPeers((prev) => ({
              ...prev,
              [msg.peer.peer_id]: {
                peerId: msg.peer.peer_id,
                name: msg.peer.name,
                isHost: msg.peer.is_host,
                muted: msg.peer.muted,
                cameraOn: msg.peer.camera_on,
                stream: null,
              },
            }));
            break;
          case "peer-left":
            closePeer(msg.peer_id);
            break;
          case "offer":
          case "answer":
          case "ice-candidate":
            handleSignal(msg);
            break;
          case "peer-state":
            updatePeer(msg.peer_id, { muted: msg.muted, cameraOn: msg.camera_on });
            break;
          case "chat":
            setMessages((prev) => [
              ...prev,
              {
                id: ++chatId,
                name: msg.name,
                text: msg.text,
                self: msg.from === peerIdRef.current,
                time: new Date().toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              },
            ]);
            break;
          case "force-mute": {
            const track = localStreamRef.current?.getAudioTracks()[0];
            if (track) track.enabled = false;
            setMicOn(false);
            break;
          }
          case "removed":
            optsRef.current.onKicked("removed");
            break;
          case "meeting-ended":
            optsRef.current.onKicked("ended");
            break;
        }
      };

      ws.onclose = () => setConnected(false);
    })();

    return () => {
      disposed = true;
      peersRef.current.forEach((p) => p.pc.close());
      peersRef.current.clear();
      wsRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.meetingCode]);

  // ---- controls -------------------------------------------------------------
  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    send({ type: "state", muted: !track.enabled });
  }, [send]);

  const toggleCam = useCallback(() => {
    const track = cameraTrackRef.current;
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    send({ type: "state", camera_on: track.enabled });
  }, [send]);

  const stopScreenShare = useCallback(() => {
    setScreenStream((current) => {
      current?.getTracks().forEach((t) => t.stop());
      return null;
    });
    const cam = cameraTrackRef.current;
    peersRef.current.forEach(({ pc }) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(cam ?? null).catch(() => {});
    });
    send({ type: "state", camera_on: !!cam?.enabled });
  }, [send]);

  const startScreenShare = useCallback(async () => {
    let display: MediaStream;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch {
      return; // user cancelled the picker
    }
    const screenTrack = display.getVideoTracks()[0];
    setScreenStream(display);

    peersRef.current.forEach(({ pc }) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track?.kind === "video" || s.track === null);
      const videoTransceiver = pc
        .getTransceivers()
        .find((t) => t.receiver.track?.kind === "video");
      if (sender?.track?.kind === "video") {
        sender.replaceTrack(screenTrack).catch(() => {});
      } else if (videoTransceiver) {
        videoTransceiver.direction = "sendrecv";
        videoTransceiver.sender.replaceTrack(screenTrack).catch(() => {});
      } else {
        pc.addTrack(screenTrack, display); // renegotiates automatically
      }
    });
    send({ type: "state", camera_on: true });

    screenTrack.onended = () => stopScreenShare();
  }, [send, stopScreenShare]);

  const sendChat = useCallback(
    (text: string) => send({ type: "chat", text }),
    [send]
  );

  // Host controls — the backend only honors these from the host connection.
  const muteAll = useCallback(() => send({ type: "mute-all" }), [send]);
  const mutePeer = useCallback(
    (peerId: string) => send({ type: "mute-peer", target: peerId }),
    [send]
  );
  const removePeer = useCallback(
    (peerId: string) => send({ type: "remove-peer", target: peerId }),
    [send]
  );
  const endForAll = useCallback(() => send({ type: "end-meeting" }), [send]);

  return {
    connected,
    localStream,
    screenStream,
    micOn,
    camOn,
    peers,
    messages,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    sendChat,
    muteAll,
    mutePeer,
    removePeer,
    endForAll,
  };
}
