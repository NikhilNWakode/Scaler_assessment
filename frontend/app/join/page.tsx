"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api, type User } from "@/lib/api";

export default function JoinPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => null);
  }, []);

  const canJoin = code.trim().length > 0 && !checking;

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
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar user={user} />

      <main className="flex flex-1 flex-col items-center px-4 pt-24">
        <h1 className="text-3xl font-bold text-gray-900">Join Meeting</h1>

        <form onSubmit={submit} className="mt-12 w-full max-w-md">
          <label className="mb-2 block text-[15px] text-gray-800">
            Meeting ID or Personal Link Name
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            placeholder="Enter Meeting ID or Personal Link Name"
            className="w-full rounded-xl border border-zoom-blue/60 px-4 py-3 text-[15px] outline-none placeholder:text-gray-400 focus:border-zoom-blue focus:ring-2 focus:ring-zoom-blue/20"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={!canJoin}
            className={`mt-4 w-full rounded-xl py-3 text-[15px] font-medium transition-colors ${
              canJoin
                ? "bg-zoom-blue text-white hover:bg-zoom-blue-dark"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {checking ? "Checking…" : "Join"}
          </button>
        </form>

        <button className="mt-24 text-[15px] text-zoom-blue hover:underline">
          Join a meeting from an H.323/SIP room system
        </button>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-2 px-4 py-6 text-sm text-gray-600">
        <span>© 2026 Zoom Clone — SDE assignment. All rights reserved.</span>
        <button className="text-gray-600 underline-offset-2 hover:underline">
          Privacy & Legal Policies
        </button>
        <button className="ml-2 text-zoom-blue">English ▾</button>
      </footer>
    </div>
  );
}
