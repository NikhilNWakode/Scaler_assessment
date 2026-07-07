"use client";

import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, saveHostKey, type User } from "@/lib/api";
import ZoomLogo from "./ZoomLogo";

const NAV_LINKS = ["Products", "Solutions", "Resources", "Plans & Pricing"];

interface Props {
  user: User | null;
  onMenuClick?: () => void;
  /** Override for the Host action (the dashboard shows a share-link modal first). */
  onHost?: () => void;
}

export default function Navbar({ user, onMenuClick, onHost }: Props) {
  const router = useRouter();
  const [hosting, setHosting] = useState(false);

  // Default Host behavior: create an instant meeting and go straight in.
  const host =
    onHost ??
    (async () => {
      if (hosting) return;
      setHosting(true);
      try {
        const meeting = await api.createInstantMeeting();
        saveHostKey(meeting.meeting_code, meeting.host_key);
        router.push(`/meeting/${meeting.meeting_code}`);
      } catch {
        alert("Failed to create meeting. Is the backend running?");
        setHosting(false);
      }
    });

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              aria-label="Open menu"
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
          )}
          <Link href="/" aria-label="Zoom home">
            <ZoomLogo />
          </Link>
          <nav className="ml-6 hidden items-center gap-1 xl:flex">
            {NAV_LINKS.map((label) => (
              <button
                key={label}
                className="rounded-md px-3 py-2 text-[15px] text-gray-700 hover:text-zoom-blue"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/schedule"
            className="hidden px-3 py-2 text-[15px] font-medium text-gray-800 hover:text-zoom-blue md:block"
          >
            Schedule
          </Link>
          <Link
            href="/join"
            className="hidden px-3 py-2 text-[15px] font-medium text-gray-800 hover:text-zoom-blue md:block"
          >
            Join
          </Link>
          <button
            onClick={host}
            className="hidden items-center gap-1 px-3 py-2 text-[15px] font-medium text-gray-800 hover:text-zoom-blue md:flex"
          >
            {hosting ? "Starting…" : "Host"}
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          <button className="hidden items-center gap-1 px-3 py-2 text-[15px] font-medium text-gray-800 hover:text-zoom-blue lg:flex">
            Web App <ChevronDown size={14} className="text-gray-500" />
          </button>
          <div
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: user?.avatar_color ?? "#0E72ED" }}
            title={user ? `${user.name} (${user.email})` : "Loading…"}
          >
            {user
              ? user.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
              : "…"}
          </div>
        </div>
      </div>
    </header>
  );
}
