"use client";

import { Check, Copy, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { formatMeetingCode, inviteLink, type Meeting } from "@/lib/api";

function formatWhen(meeting: Meeting): string {
  const iso = meeting.scheduled_at ?? meeting.started_at ?? meeting.created_at;
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (sameDay(d, today)) return `Today, ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}, ${time}`;
}

interface Props {
  meeting: Meeting;
  variant: "upcoming" | "recent";
  /** Stacked layout for narrow containers (e.g. the dashboard right rail). */
  compact?: boolean;
  onStart: (meeting: Meeting) => void;
  onCancel?: (meeting: Meeting) => void;
}

export default function MeetingListItem({
  meeting,
  variant,
  compact,
  onStart,
  onCancel,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyInvite = async () => {
    const text = `${meeting.host.name} is inviting you to a Zoom meeting.\n\nTopic: ${meeting.title}\nJoin: ${inviteLink(meeting.meeting_code)}\nMeeting ID: ${formatMeetingCode(meeting.meeting_code)}\nPasscode: ${meeting.passcode}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const startLabel = variant === "upcoming" ? "Start" : "Rejoin";

  if (compact) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p
            className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900"
            title={meeting.title}
          >
            {meeting.title}
          </p>
          <button
            onClick={() => onStart(meeting)}
            className="shrink-0 rounded-lg bg-zoom-blue px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zoom-blue-dark"
          >
            {startLabel}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {formatWhen(meeting)}
          {variant === "upcoming" && ` · ${meeting.duration_minutes} min`}
          {variant === "recent" && meeting.status === "ended" && " · Ended"}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            ID: {formatMeetingCode(meeting.meeting_code)}
          </p>
          <div className="flex items-center">
            <button
              onClick={copyInvite}
              title="Copy invitation"
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              {copied ? (
                <Check size={14} className="text-green-600" />
              ) : (
                <Copy size={14} />
              )}
            </button>
            {variant === "upcoming" && onCancel && (
              <button
                onClick={() => onCancel(meeting)}
                title="Delete meeting"
                className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition-shadow hover:shadow-sm">
      <div className="flex w-12 flex-col items-center rounded-lg bg-zoom-blue-light py-1.5">
        <Video size={18} className="text-zoom-blue" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">
          {meeting.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {formatWhen(meeting)} · ID: {formatMeetingCode(meeting.meeting_code)}
          {variant === "upcoming" && ` · ${meeting.duration_minutes} min`}
          {variant === "recent" && meeting.status === "ended" && " · Ended"}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={copyInvite}
          title="Copy invitation"
          className="rounded-md p-2 text-gray-400 transition-opacity hover:bg-gray-100 hover:text-gray-700 sm:opacity-0 sm:group-hover:opacity-100"
        >
          {copied ? (
            <Check size={16} className="text-green-600" />
          ) : (
            <Copy size={16} />
          )}
        </button>
        {variant === "upcoming" && onCancel && (
          <button
            onClick={() => onCancel(meeting)}
            title="Delete meeting"
            className="rounded-md p-2 text-gray-400 transition-opacity hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          onClick={() => onStart(meeting)}
          className="rounded-lg bg-zoom-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-zoom-blue-dark sm:px-4"
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
}
