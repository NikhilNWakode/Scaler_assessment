"use client";

import { CalendarPlus, Check, Copy, Plus, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import JoinModal from "@/components/JoinModal";
import MeetingListItem from "@/components/MeetingListItem";
import Navbar from "@/components/Navbar";
import NewMeetingModal from "@/components/NewMeetingModal";
import ScheduleModal from "@/components/ScheduleModal";
import Sidebar from "@/components/Sidebar";
import { api, saveHostKey, type Meeting, type User } from "@/lib/api";

/** Display-only Personal Meeting ID, derived deterministically from the user. */
function personalMeetingId(user: User): string {
  let hash = 0;
  for (const ch of user.email) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const digits = String(1_000_000_000 + (hash % 9_000_000_000));
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onClick,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  color: "blue" | "orange";
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex flex-col items-center gap-2 disabled:opacity-60"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow transition-transform group-hover:scale-105 ${
          color === "orange"
            ? "bg-zoom-orange group-hover:bg-zoom-orange-dark"
            : "bg-zoom-blue group-hover:bg-zoom-blue-dark"
        }`}
      >
        {loading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          icon
        )}
      </span>
      <span className="text-sm font-semibold text-gray-800">{label}</span>
    </button>
  );
}

function Skeleton({ slowHint }: { slowHint: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1].map((i) => (
        <div key={i} className="h-[68px] animate-pulse rounded-xl bg-gray-100" />
      ))}
      {slowHint && (
        <p className="pt-1 text-center text-xs text-gray-400">
          Waking up the server (free hosting) — the first load can take up to a
          minute…
        </p>
      )}
    </div>
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
  const [pmiCopied, setPmiCopied] = useState(false);

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

  const copyPmi = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(personalMeetingId(user).replaceAll(" ", ""));
    setPmiCopied(true);
    setTimeout(() => setPmiCopied(false), 1500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F7F9]">
      <Navbar
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        onSchedule={() => setShowSchedule(true)}
        onJoin={() => setShowJoin(true)}
        onHost={newMeeting}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* ------------- main column ------------- */}
            <div className="flex min-w-0 flex-col gap-6">
              {/* profile card */}
              <Card>
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white sm:h-20 sm:w-20"
                    style={{ backgroundColor: user?.avatar_color ?? "#0E72ED" }}
                  >
                    {user ? initials(user.name) : "…"}
                  </div>
                  <div className="min-w-[160px] flex-1">
                    <h1 className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                      {user?.name ?? "Loading…"}
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-600">
                      Plan:{" "}
                      <span className="font-medium text-gray-800">
                        Workplace Basic
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
                      Manage Plan
                    </button>
                    <button className="text-sm font-medium text-zoom-blue hover:underline">
                      View Plan Details
                    </button>
                  </div>
                </div>
              </Card>

              {/* promo banner */}
              <Card>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="min-w-[220px] flex-1">
                    <p className="flex items-center gap-2 text-lg font-bold text-zoom-blue">
                      <span className="rounded bg-zoom-blue px-1.5 py-0.5 text-[11px] font-extrabold lowercase text-white">
                        zoom
                      </span>
                      Workplace Pro
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-900">
                      Do more, together.
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Upgrade for longer meetings, cloud recordings, and an AI
                      companion in every call.
                    </p>
                    <button className="mt-4 rounded-full bg-zoom-blue px-5 py-2 text-sm font-semibold text-white hover:bg-zoom-blue-dark">
                      Upgrade now
                    </button>
                  </div>
                  <div className="hidden h-40 w-56 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-zoom-blue to-[#123a6b] sm:flex">
                    <Video size={48} className="text-white/90" />
                  </div>
                </div>
              </Card>

              {/* recent activity */}
              <Card>
                <h2 className="mb-4 text-xl font-bold text-gray-900">
                  Recent activity
                </h2>
                {loading ? (
                  <Skeleton slowHint={false} />
                ) : loadError ? (
                  <p className="py-6 text-center text-sm text-red-600">
                    {loadError}
                  </p>
                ) : recent.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-500">
                    No recent meetings
                  </p>
                ) : (
                  <div className="thin-scroll flex max-h-[340px] flex-col gap-2.5 overflow-y-auto pr-1">
                    {recent.map((m) => (
                      <MeetingListItem
                        key={m.id}
                        meeting={m}
                        variant="recent"
                        onStart={startMeeting}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ------------- right rail ------------- */}
            <div className="flex flex-col gap-6">
              <Card>
                <div className="flex items-start justify-around">
                  <QuickAction
                    icon={<CalendarPlus size={24} />}
                    label="Schedule"
                    color="blue"
                    onClick={() => setShowSchedule(true)}
                  />
                  <QuickAction
                    icon={<Plus size={26} />}
                    label="Join"
                    color="blue"
                    onClick={() => setShowJoin(true)}
                  />
                  <QuickAction
                    icon={<Video size={24} />}
                    label="Host"
                    color="orange"
                    onClick={newMeeting}
                    loading={creating}
                  />
                </div>
                <div className="mt-6 text-center">
                  <p className="text-[15px] font-bold text-gray-900">
                    Personal Meeting ID
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-2 text-[15px] text-gray-700">
                    {user ? personalMeetingId(user) : "…"}
                    <button
                      onClick={copyPmi}
                      aria-label="Copy Personal Meeting ID"
                      className="rounded p-1 text-gray-500 hover:bg-gray-100"
                    >
                      {pmiCopied ? (
                        <Check size={15} className="text-green-600" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </p>
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Meetings</h2>
                  <button
                    onClick={() => setShowSchedule(true)}
                    className="text-sm font-medium text-zoom-blue hover:underline"
                  >
                    Schedule a Meeting
                  </button>
                </div>

                {loading ? (
                  <Skeleton slowHint={slowHint} />
                ) : loadError ? (
                  <p className="py-4 text-center text-sm text-red-600">
                    {loadError}
                  </p>
                ) : upcoming.length === 0 ? (
                  <div className="rounded-lg bg-gray-100 px-4 py-4 text-[15px] font-semibold text-gray-800">
                    No Upcoming Meetings
                  </div>
                ) : (
                  <div className="thin-scroll flex max-h-[300px] flex-col gap-2.5 overflow-y-auto pr-1">
                    {upcoming.map((m) => (
                      <MeetingListItem
                        key={m.id}
                        meeting={m}
                        variant="upcoming"
                        onStart={startMeeting}
                        onCancel={cancelMeeting}
                      />
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setShowJoin(true)}
                  className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                >
                  Test Audio and Video
                </button>
              </Card>
            </div>
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
