"use client";

import { Check, Copy, Video, X } from "lucide-react";
import { useState } from "react";
import { formatMeetingCode, inviteLink, type Meeting } from "@/lib/api";

interface Props {
  meeting: Meeting;
  onStart: () => void;
  onClose: () => void;
}

/** Shown right after creating an instant meeting — share the link, then start. */
export default function NewMeetingModal({ meeting, onStart, onClose }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const link = inviteLink(meeting.meeting_code);

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const copyInvitation = async () => {
    await navigator.clipboard.writeText(
      `${meeting.host.name} is inviting you to a Zoom meeting.\n\nTopic: ${meeting.title}\nJoin: ${link}\nMeeting ID: ${formatMeetingCode(meeting.meeting_code)}\nPasscode: ${meeting.passcode}`
    );
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zoom-orange text-white">
              <Video size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Your meeting is ready
              </h2>
              <p className="text-xs text-gray-500">
                Share this link with people you want to invite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-3">
          <p className="min-w-0 flex-1 truncate text-sm text-gray-700">{link}</p>
          <button
            onClick={copyLink}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-zoom-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-zoom-blue-dark"
          >
            {copiedLink ? <Check size={13} /> : <Copy size={13} />}
            {copiedLink ? "Copied" : "Copy link"}
          </button>
        </div>

        <div className="mt-3 space-y-1 rounded-xl border border-gray-200 p-3 text-sm">
          <p className="text-gray-600">
            Meeting ID:{" "}
            <span className="font-medium text-gray-900">
              {formatMeetingCode(meeting.meeting_code)}
            </span>
          </p>
          <p className="text-gray-600">
            Passcode:{" "}
            <span className="font-medium text-gray-900">{meeting.passcode}</span>
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={copyInvitation}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copiedInvite ? "Invitation copied!" : "Copy full invitation"}
          </button>
          <button
            onClick={onStart}
            className="rounded-lg bg-zoom-blue px-5 py-2 text-sm font-semibold text-white hover:bg-zoom-blue-dark"
          >
            Start Meeting
          </button>
        </div>
      </div>
    </div>
  );
}
