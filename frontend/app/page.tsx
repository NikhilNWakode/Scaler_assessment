"use client";

import { CalendarPlus, MonitorUp, Plus, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ActionTile from "@/components/ActionTile";
import JoinModal from "@/components/JoinModal";
import MeetingListItem from "@/components/MeetingListItem";
import Navbar from "@/components/Navbar";
import NewMeetingModal from "@/components/NewMeetingModal";
import ScheduleModal from "@/components/ScheduleModal";
import Sidebar from "@/components/Sidebar";
import { api, saveHostKey, type Meeting, type User } from "@/lib/api";

function Greeting({ name }: { name: string | undefined }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className="h-[64px]" />;

  const hour = now.getHours();
  const daypart = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
        Good {daypart}
        {name ? `, ${name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        {" · "}
        {now.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

interface MeetingsCardProps {
  title: string;
  meetings: Meeting[];
  variant: "upcoming" | "recent";
  loading: boolean;
  slowHint: boolean;
  loadError: string;
  emptyText: string;
  emptyAction?: React.ReactNode;
  onStart: (m: Meeting) => void;
  onCancel?: (m: Meeting) => void;
}

function MeetingsCard({
  title,
  meetings,
  variant,
  loading,
  slowHint,
  loadError,
  emptyText,
  emptyAction,
  onStart,
  onCancel,
}: MeetingsCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 px-1 text-sm font-semibold text-gray-800">{title}</h2>
      {loading ? (
        <div className="flex flex-col gap-2.5 px-1 py-1">
          {[0, 1].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-xl bg-gray-100" />
          ))}
          {slowHint && (
            <p className="pt-1 text-center text-xs text-gray-400">
              Waking up the server (free hosting) — the first load can take up
              to a minute…
            </p>
          )}
        </div>
      ) : loadError ? (
        <p className="px-2 py-8 text-center text-sm text-red-600">{loadError}</p>
      ) : meetings.length === 0 ? (
        <div className="px-2 py-8 text-center">
          <p className="text-sm font-medium text-gray-600">{emptyText}</p>
          {emptyAction}
        </div>
      ) : (
        <div className="thin-scroll flex max-h-[320px] flex-col gap-2.5 overflow-y-auto pr-1">
          {meetings.map((m) => (
            <MeetingListItem
              key={m.id}
              meeting={m}
              variant={variant}
              onStart={onStart}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar user={user} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
          <Greeting name={user?.name} />

          {/* action tiles, like the web portal home */}
          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-6 sm:gap-x-14">
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

          <div className="mt-10 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <MeetingsCard
              title="Upcoming Meetings"
              meetings={upcoming}
              variant="upcoming"
              loading={loading}
              slowHint={slowHint}
              loadError={loadError}
              emptyText="No upcoming meetings"
              emptyAction={
                <button
                  onClick={() => setShowSchedule(true)}
                  className="mt-2 text-sm font-medium text-zoom-blue hover:underline"
                >
                  Schedule a meeting
                </button>
              }
              onStart={startMeeting}
              onCancel={cancelMeeting}
            />
            <MeetingsCard
              title="Recent Meetings"
              meetings={recent}
              variant="recent"
              loading={loading}
              slowHint={false}
              loadError={loadError}
              emptyText="No recent meetings"
              onStart={startMeeting}
            />
          </div>
        </main>
      </div>

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
