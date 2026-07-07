"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MeetingRoom from "@/components/meeting/MeetingRoom";
import PreJoin from "@/components/meeting/PreJoin";
import { api, getHostKey, type Meeting, type Participant } from "@/lib/api";

type Stage =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "prejoin"; meeting: Meeting }
  | {
      kind: "in-meeting";
      meeting: Meeting;
      participant: Participant;
      name: string;
      micOn: boolean;
      camOn: boolean;
    }
  | { kind: "left"; reason: "left" | "removed" | "ended" };

function MeetingPageInner() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  // Host status is proven by the secret key saved when this device
  // created the meeting — a guest opening the same link never has it.
  const [hostKey, setHostKey] = useState<string | null>(null);

  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [defaultName, setDefaultName] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = getHostKey(code);
    setHostKey(key);
    (async () => {
      try {
        const [meeting, me] = await Promise.all([
          api.getMeeting(code),
          api.me().catch(() => null),
        ]);
        if (cancelled) return;
        if (key && me) setDefaultName(me.name);
        setStage({ kind: "prejoin", meeting });
      } catch (err) {
        if (!cancelled) {
          setStage({
            kind: "error",
            message:
              err instanceof Error ? err.message : "Unable to load meeting.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const join = async (opts: { name: string; micOn: boolean; camOn: boolean }) => {
    if (stage.kind !== "prejoin") return;
    setJoining(true);
    try {
      const { meeting, participant } = await api.joinMeeting(code, opts.name);
      setStage({
        kind: "in-meeting",
        meeting,
        participant,
        name: opts.name,
        micOn: opts.micOn,
        camOn: opts.camOn,
      });
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Unable to join meeting.",
      });
    } finally {
      setJoining(false);
    }
  };

  if (stage.kind === "loading") {
    return (
      <Center>
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="text-sm text-gray-400">Loading meeting…</p>
      </Center>
    );
  }

  if (stage.kind === "error") {
    return (
      <Center>
        <p className="text-lg font-semibold">Unable to join</p>
        <p className="max-w-sm text-center text-sm text-gray-400">
          {stage.message}
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 rounded-lg bg-zoom-blue px-5 py-2 text-sm font-medium hover:bg-zoom-blue-dark"
        >
          Back to Home
        </button>
      </Center>
    );
  }

  if (stage.kind === "left") {
    const text = {
      left: "You left the meeting",
      removed: "You were removed from the meeting by the host",
      ended: "The host ended the meeting",
    }[stage.reason];
    return (
      <Center>
        <p className="text-lg font-semibold">{text}</p>
        <div className="mt-2 flex gap-3">
          {stage.reason === "left" && (
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-zoom-border px-5 py-2 text-sm font-medium hover:bg-white/10"
            >
              Rejoin
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            className="rounded-lg bg-zoom-blue px-5 py-2 text-sm font-medium hover:bg-zoom-blue-dark"
          >
            Back to Home
          </button>
        </div>
      </Center>
    );
  }

  if (stage.kind === "prejoin") {
    return (
      <PreJoin
        meeting={stage.meeting}
        defaultName={defaultName}
        onJoin={join}
        joining={joining}
      />
    );
  }

  return (
    <MeetingRoom
      meeting={stage.meeting}
      participant={stage.participant}
      displayName={stage.name}
      hostKey={hostKey}
      initialMicOn={stage.micOn}
      initialCamOn={stage.camOn}
      onLeave={(reason) => setStage({ kind: "left", reason })}
    />
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zoom-dark px-4 text-white">
      {children}
    </div>
  );
}

export default function MeetingPage() {
  return (
    <Suspense>
      <MeetingPageInner />
    </Suspense>
  );
}
