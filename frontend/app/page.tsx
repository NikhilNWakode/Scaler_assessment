"use client";

import {
  CalendarPlus,
  MonitorUp,
  Plus,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ActionTile from "@/components/ActionTile";
import JoinModal from "@/components/JoinModal";
import MeetingListItem from "@/components/MeetingListItem";
import Navbar from "@/components/Navbar";
import NewMeetingModal from "@/components/NewMeetingModal";
import ScheduleModal from "@/components/ScheduleModal";
import { api, saveHostKey, type Meeting, type User } from "@/lib/api";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className="h-[76px]" />;
  return (
    <>
      <p className="text-5xl font-bold tracking-tight">
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </p>
      <p className="mt-1 text-sm text-white/80">
        {now.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [creating, setCreating] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newMeetingInfo, setNewMeetingInfo] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [slowHint, setSlowHint] = useState(false);
  const [loadError, setLoadError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [me, up, rec] = await Promise.all([
        api.me(),
        api.upcomingMeetings(),
        api.recentMeetings(),
      ]);
      setUser(me);
      setUpcoming(up);
      setRecent(rec);
      setLoadError("");
    } catch {
      setLoadError(
        "Could not reach the backend. Make sure the API server is running."
      );
    } finally {
      setLoading(false);
      setSlowHint(false);
    }
  }, []);

  useEffect(() => {
    // Free-tier hosting sleeps when idle; explain slow first loads.
    const hint = setTimeout(() => setSlowHint(true), 4000);
    refresh().finally(() => clearTimeout(hint));
    return () => clearTimeout(hint);
  }, [refresh]);

  const newMeeting = async () => {
    setCreating(true);
    try {
      const meeting = await api.createInstantMeeting();
      saveHostKey(meeting.meeting_code, meeting.host_key);
      setNewMeetingInfo(meeting); // show share link before entering the room
    } catch {
      setLoadError("Failed to create meeting. Is the backend running?");
    } finally {
      setCreating(false);
    }
  };

  const startMeeting = (meeting: Meeting) => {
    saveHostKey(meeting.meeting_code, meeting.host_key);
    router.push(`/meeting/${meeting.meeting_code}`);
  };

  const cancelMeeting = async (meeting: Meeting) => {
    if (!confirm(`Delete "${meeting.title}"?`)) return;
    try {
      await api.cancelMeeting(meeting.meeting_code, meeting.host_key ?? "");
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete meeting.");
    }
  };

  const meetings = tab === "upcoming" ? upcoming : recent;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[5fr_4fr] lg:py-14">
        {/* Left: action tiles */}
        <section className="flex items-start justify-center lg:pt-10">
          <div className="grid grid-cols-2 gap-x-14 gap-y-10 sm:gap-x-20">
            <ActionTile
              icon={Video}
              label="New Meeting"
              color="orange"
              onClick={newMeeting}
              loading={creating}
            />
            <ActionTile
              icon={Plus}
              label="Join"
              color="blue"
              onClick={() => setShowJoin(true)}
            />
            <ActionTile
              icon={CalendarPlus}
              label="Schedule"
              color="blue"
              onClick={() => setShowSchedule(true)}
            />
            <ActionTile
              icon={MonitorUp}
              label="Share Screen"
              color="blue"
              onClick={() =>
                alert("Start or join a meeting to share your screen.")
              }
            />
          </div>
        </section>

        {/* Right: clock card + meetings */}
        <section className="flex flex-col gap-5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zoom-blue via-[#2563c9] to-[#123a6b] p-6 text-white shadow-lg">
            <div
              className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/5"
              aria-hidden
            />
            <Clock />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex gap-1 border-b border-gray-100 pb-2">
              {(["upcoming", "recent"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    tab === t
                      ? "bg-zoom-blue-light text-zoom-blue"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col gap-2.5 px-1 py-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[68px] animate-pulse rounded-xl bg-gray-100"
                  />
                ))}
                {slowHint && (
                  <p className="pt-1 text-center text-xs text-gray-400">
                    Waking up the server (free hosting) — the first load can
                    take up to a minute…
                  </p>
                )}
              </div>
            ) : loadError ? (
              <p className="px-2 py-8 text-center text-sm text-red-600">
                {loadError}
              </p>
            ) : meetings.length === 0 ? (
              <div className="px-2 py-10 text-center">
                <p className="text-sm font-medium text-gray-600">
                  {tab === "upcoming"
                    ? "No upcoming meetings"
                    : "No recent meetings"}
                </p>
                {tab === "upcoming" && (
                  <button
                    onClick={() => setShowSchedule(true)}
                    className="mt-2 text-sm font-medium text-zoom-blue hover:underline"
                  >
                    Schedule a meeting
                  </button>
                )}
              </div>
            ) : (
              <div className="thin-scroll flex max-h-[380px] flex-col gap-2.5 overflow-y-auto pr-1">
                {meetings.map((m) => (
                  <MeetingListItem
                    key={m.id}
                    meeting={m}
                    variant={tab}
                    onStart={startMeeting}
                    onCancel={tab === "upcoming" ? cancelMeeting : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {showSchedule && (
        <ScheduleModal
          onClose={() => setShowSchedule(false)}
          onScheduled={refresh}
        />
      )}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
      {newMeetingInfo && (
        <NewMeetingModal
          meeting={newMeetingInfo}
          onStart={() => router.push(`/meeting/${newMeetingInfo.meeting_code}`)}
          onClose={() => {
            setNewMeetingInfo(null);
            refresh(); // the created meeting shows up under Recent
          }}
        />
      )}
    </div>
  );
}
