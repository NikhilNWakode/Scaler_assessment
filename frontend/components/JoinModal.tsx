"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function JoinModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Accept a raw meeting ID or a full invite link
    let value = code.trim();
    const linkMatch = value.match(/\/meeting\/(\d[\d\s-]*)/);
    if (linkMatch) value = linkMatch[1];
    value = value.replace(/[\s-]/g, "");

    if (!/^\d{6,12}$/.test(value)) {
      setError("Enter a valid meeting ID (11 digits) or invite link.");
      return;
    }

    setChecking(true);
    try {
      await api.getMeeting(value); // validate the meeting exists before navigating
      router.push(`/meeting/${value}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Meeting not found.");
      setChecking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Join Meeting</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Meeting ID or invite link
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              placeholder="Enter Meeting ID or paste link"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={checking || !code.trim()}
              className="rounded-lg bg-zoom-blue px-5 py-2 text-sm font-medium text-white hover:bg-zoom-blue-dark disabled:opacity-50"
            >
              {checking ? "Checking…" : "Join"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
