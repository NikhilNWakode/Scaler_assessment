"""WebSocket room manager.

Each meeting room keeps a set of live connections. The socket carries:
- presence            (participant joined / left -> everyone refreshes the roster)
- WebRTC signaling    (offer / answer / ICE candidates relayed peer-to-peer)
- state updates       (mute / camera toggles mirrored onto tiles)
- host controls       (mute-all, mute one, remove participant, end meeting)
- in-meeting chat
"""
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


class Room:
    def __init__(self) -> None:
        # peer_id -> {"ws": WebSocket, "name": str, "is_host": bool,
        #             "muted": bool, "camera_on": bool}
        self.peers: dict[str, dict] = {}

    def roster(self) -> list[dict]:
        return [
            {
                "peer_id": pid,
                "name": p["name"],
                "is_host": p["is_host"],
                "muted": p["muted"],
                "camera_on": p["camera_on"],
            }
            for pid, p in self.peers.items()
        ]


rooms: dict[str, Room] = {}


async def _send(ws: WebSocket, message: dict) -> None:
    try:
        await ws.send_text(json.dumps(message))
    except Exception:
        pass  # peer disconnected mid-send; cleanup happens in its own handler


async def _broadcast(room: Room, message: dict, exclude: str | None = None) -> None:
    for pid, peer in list(room.peers.items()):
        if pid != exclude:
            await _send(peer["ws"], message)


@router.websocket("/ws/{meeting_code}/{peer_id}")
async def meeting_socket(ws: WebSocket, meeting_code: str, peer_id: str):
    await ws.accept()
    room = rooms.setdefault(meeting_code, Room())

    try:
        # First frame from the client announces who they are.
        hello = json.loads(await ws.receive_text())
        room.peers[peer_id] = {
            "ws": ws,
            "name": hello.get("name", "Guest"),
            "is_host": bool(hello.get("is_host")),
            "muted": bool(hello.get("muted")),
            "camera_on": bool(hello.get("camera_on", True)),
        }

        # Newcomer gets the current roster; everyone else learns about them.
        await _send(ws, {"type": "roster", "peers": room.roster(), "you": peer_id})
        me = room.peers[peer_id]
        await _broadcast(
            room,
            {"type": "peer-joined", "peer": {
                "peer_id": peer_id,
                "name": me["name"],
                "is_host": me["is_host"],
                "muted": me["muted"],
                "camera_on": me["camera_on"],
            }},
            exclude=peer_id,
        )

        while True:
            msg = json.loads(await ws.receive_text())
            mtype = msg.get("type")

            # -- WebRTC signaling: relay to one target peer --------------------
            if mtype in ("offer", "answer", "ice-candidate"):
                target = room.peers.get(msg.get("to", ""))
                if target:
                    msg["from"] = peer_id
                    await _send(target["ws"], msg)

            # -- Media state: keep roster in sync, mirror to everyone ----------
            elif mtype == "state":
                peer = room.peers.get(peer_id)
                if peer:
                    if "muted" in msg:
                        peer["muted"] = bool(msg["muted"])
                    if "camera_on" in msg:
                        peer["camera_on"] = bool(msg["camera_on"])
                await _broadcast(
                    room,
                    {"type": "peer-state", "peer_id": peer_id,
                     "muted": room.peers[peer_id]["muted"],
                     "camera_on": room.peers[peer_id]["camera_on"]},
                    exclude=peer_id,
                )

            # -- Chat ----------------------------------------------------------
            elif mtype == "chat":
                await _broadcast(
                    room,
                    {"type": "chat", "from": peer_id,
                     "name": room.peers[peer_id]["name"],
                     "text": str(msg.get("text", ""))[:2000]},
                )

            # -- Host controls (only honored from the host connection) ---------
            elif mtype in ("mute-all", "mute-peer", "remove-peer", "end-meeting"):
                if not room.peers.get(peer_id, {}).get("is_host"):
                    continue
                if mtype == "mute-all":
                    for pid, peer in room.peers.items():
                        if pid != peer_id:
                            peer["muted"] = True
                    await _broadcast(room, {"type": "force-mute"}, exclude=peer_id)
                elif mtype == "mute-peer":
                    target = room.peers.get(msg.get("target", ""))
                    if target:
                        target["muted"] = True
                        await _send(target["ws"], {"type": "force-mute"})
                        await _broadcast(
                            room,
                            {"type": "peer-state", "peer_id": msg["target"],
                             "muted": True, "camera_on": target["camera_on"]},
                        )
                elif mtype == "remove-peer":
                    target = room.peers.get(msg.get("target", ""))
                    if target:
                        await _send(target["ws"], {"type": "removed"})
                        await target["ws"].close()
                elif mtype == "end-meeting":
                    await _broadcast(room, {"type": "meeting-ended"}, exclude=peer_id)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass  # malformed frame or abrupt disconnect — treat like a leave
    finally:
        if peer_id in room.peers:
            del room.peers[peer_id]
        await _broadcast(room, {"type": "peer-left", "peer_id": peer_id})
        if not room.peers:
            rooms.pop(meeting_code, None)
