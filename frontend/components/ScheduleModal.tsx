"use client";

import { X } from "lucide-react";
import { useState } from "react";
import {
  api,
  formatMeetingCode,
  inviteLink,
  saveHostKey,
  type Meeting,
} from "@/lib/api";

const DURATIONS = [15, 30, 40, 45, 60, 90, 120];

interface Props {
  onClose: () => void;
  onScheduled: () => void;
}

export default function ScheduleModal({ onClose, onScheduled }: Props) {
  const now = new Date(Date.now() + 60 * 60 * 1000); // default: one hour from now
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [time, setTime] = useState(
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  );
  const [duration, setDuration] = useState(40);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const when = new Date(`${date}T${time}`);
    if (isNaN(when.getTime())) {
      setError("Please pick a valid date and time.");
      return;
    }
    if (when.getTime() < Date.now()) {
      setError("Scheduled time must be in the future.");
      return;
    }
    setSaving(true);
    try {
      const meeting = await api.scheduleMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: when.toISOString(),
        duration_minutes: duration,
      });
      saveHostKey(meeting.meeting_code, meeting.host_key);
      setCreated(meeting);
      onScheduled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting.");
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(
      `Topic: ${created.title}\nJoin: ${inviteLink(created.meeting_code)}\nMeeting ID: ${formatMeetingCode(created.meeting_code)}\nPasscode: ${created.passcode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {created ? "Meeting scheduled" : "Schedule Meeting"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 text-sm">
              <p className="font-semibold text-gray-900">{created.title}</p>
              <p className="mt-2 text-gray-600">
                Meeting ID:{" "}
                <span className="font-medium text-gray-900">
                  {formatMeetingCode(created.meeting_code)}
                </span>
              </p>
              <p className="text-gray-600">
                Passcode:{" "}
                <span className="font-medium text-gray-900">{created.passcode}</span>
              </p>
              <p className="mt-2 break-all text-zoom-blue">
                {inviteLink(created.meeting_code)}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={copyInvite}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {copied ? "Copied!" : "Copy invitation"}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-zoom-blue px-4 py-2 text-sm font-medium text-white hover:bg-zoom-blue-dark"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Topic
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="My Meeting"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What is this meeting about?"
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
                >
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} minutes
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-zoom-blue px-5 py-2 text-sm font-medium text-white hover:bg-zoom-blue-dark disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
