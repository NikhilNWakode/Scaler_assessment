"use client";

import { AlertTriangle, ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import {
  api,
  formatMeetingCode,
  inviteLink,
  saveHostKey,
  type Meeting,
  type User,
} from "@/lib/api";

const TIME_ZONES = [
  "(GMT+5:30) Mumbai, Kolkata, New Delhi",
  "(GMT+0:00) London, Dublin, Lisbon",
  "(GMT-5:00) New York, Toronto",
  "(GMT-8:00) Los Angeles, Vancouver",
  "(GMT+8:00) Singapore, Hong Kong",
  "(GMT+9:00) Tokyo, Seoul",
];

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
      <label className="pt-2 text-[15px] text-gray-800">
        {required && <span className="mr-1 text-red-500">*</span>}
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

const inputClass =
  "rounded-xl border border-gray-300 px-4 py-2.5 text-[15px] outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20";

/** Local-timezone yyyy-mm-dd (toISOString would shift the date near midnight). */
function localDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function SchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const defaultWhen = new Date(Date.now() + 60 * 60 * 1000);
  const [topic, setTopic] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(localDateString(defaultWhen));
  const [time, setTime] = useState(
    `${String(defaultWhen.getHours()).padStart(2, "0")}:${String(
      defaultWhen.getMinutes()
    ).padStart(2, "0")}`
  );
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(40);
  const [timeZone, setTimeZone] = useState(TIME_ZONES[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const when = new Date(`${date}T${time}`);
    const duration = hours * 60 + minutes;
    if (isNaN(when.getTime())) {
      setError("Please pick a valid date and time.");
      return;
    }
    if (when.getTime() < Date.now()) {
      setError("Scheduled time must be in the future.");
      return;
    }
    if (duration < 5) {
      setError("Duration must be at least 5 minutes.");
      return;
    }
    setSaving(true);
    try {
      const meeting = await api.scheduleMeeting({
        title: topic.trim(),
        description: description.trim() || undefined,
        scheduled_at: when.toISOString(),
        duration_minutes: duration,
      });
      saveHostKey(meeting.meeting_code, meeting.host_key);
      setCreated(meeting);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to schedule meeting."
      );
    } finally {
      setSaving(false);
    }
  };

  const copyInvitation = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(
      `Topic: ${created.title}\nJoin: ${inviteLink(created.meeting_code)}\nMeeting ID: ${formatMeetingCode(created.meeting_code)}\nPasscode: ${created.passcode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar user={user} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          active="Meetings"
        />

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-10">
          <div className="max-w-3xl">
            <Link
              href="/"
              className="flex w-fit items-center gap-1 text-[15px] font-medium text-zoom-blue hover:underline"
            >
              <ChevronLeft size={17} /> Back to Meetings
            </Link>

            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              {created ? "Meeting Scheduled" : "Schedule Meeting"}
            </h1>

            {created ? (
              <div className="mt-8 space-y-5">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <p className="text-lg font-semibold text-gray-900">
                    {created.title}
                  </p>
                  <div className="mt-3 space-y-1 text-[15px] text-gray-700">
                    <p>
                      Meeting ID:{" "}
                      <span className="font-medium text-gray-900">
                        {formatMeetingCode(created.meeting_code)}
                      </span>
                    </p>
                    <p>
                      Passcode:{" "}
                      <span className="font-medium text-gray-900">
                        {created.passcode}
                      </span>
                    </p>
                    <p className="break-all text-zoom-blue">
                      {inviteLink(created.meeting_code)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={copyInvitation}
                    className="rounded-xl border border-gray-300 px-5 py-2.5 text-[15px] font-medium text-gray-800 hover:bg-gray-50"
                  >
                    {copied ? "Copied!" : "Copy Invitation"}
                  </button>
                  <button
                    onClick={() =>
                      router.push(`/meeting/${created.meeting_code}`)
                    }
                    className="rounded-xl bg-zoom-blue px-5 py-2.5 text-[15px] font-medium text-white hover:bg-zoom-blue-dark"
                  >
                    Start this Meeting
                  </button>
                  <Link
                    href="/"
                    className="rounded-xl px-5 py-2.5 text-[15px] font-medium text-zoom-blue hover:bg-zoom-blue-light"
                  >
                    Done
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8 flex flex-col gap-6">
                <FieldRow label="Topic" required>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="My Meeting"
                    className={`${inputClass} w-full`}
                  />
                  {!showDescription ? (
                    <button
                      type="button"
                      onClick={() => setShowDescription(true)}
                      className="mt-3 flex items-center gap-1 text-[15px] font-medium text-zoom-blue hover:underline"
                    >
                      <Plus size={15} /> Add Description
                    </button>
                  ) : (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="What is this meeting about?"
                      className={`${inputClass} mt-3 w-full resize-none`}
                    />
                  )}
                </FieldRow>

                <FieldRow label="When">
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="date"
                      value={date}
                      min={localDateString(new Date())}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className={inputClass}
                    />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </FieldRow>

                <FieldRow label="Duration">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                      className={inputClass}
                    >
                      {[0, 1, 2, 3, 4].map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[15px] text-gray-700">hr</span>
                    <select
                      value={minutes}
                      onChange={(e) => setMinutes(Number(e.target.value))}
                      className={inputClass}
                    >
                      {[0, 15, 30, 40, 45].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <span className="text-[15px] text-gray-700">min</span>
                  </div>

                  {hours * 60 + minutes > 40 && (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-[15px] text-gray-800">
                      <AlertTriangle
                        size={19}
                        className="mt-0.5 shrink-0 text-amber-500"
                      />
                      <span>
                        Meetings on your current Basic plan are limited to 40
                        minutes each. Need more time?{" "}
                        <button
                          type="button"
                          className="font-medium text-zoom-blue hover:underline"
                        >
                          Upgrade to Zoom Workplace Pro
                        </button>
                      </span>
                    </div>
                  )}
                </FieldRow>

                <FieldRow label="Time Zone">
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className={`${inputClass} w-full`}
                  >
                    {TIME_ZONES.map((tz) => (
                      <option key={tz}>{tz}</option>
                    ))}
                  </select>
                </FieldRow>

                {error && (
                  <p className="text-sm text-red-600 sm:ml-[174px]">{error}</p>
                )}

                <div className="mt-2 flex gap-3 sm:ml-[174px]">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-zoom-blue px-6 py-2.5 text-[15px] font-medium text-white hover:bg-zoom-blue-dark disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <Link
                    href="/"
                    className="rounded-xl px-5 py-2.5 text-[15px] font-medium text-zoom-blue hover:bg-zoom-blue-light"
                  >
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
