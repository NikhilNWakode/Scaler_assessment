"use client";

import { Bell, Search, Settings } from "lucide-react";
import Link from "next/link";
import type { User } from "@/lib/api";
import ZoomLogo from "./ZoomLogo";

const TABS = ["Home", "Team Chat", "Meetings", "Contacts", "Apps"];

export default function Navbar({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Zoom home">
          <ZoomLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                i === 0
                  ? "text-zoom-blue"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {tab}
              {i === 0 && (
                <span className="mx-auto mt-0.5 block h-0.5 w-6 rounded-full bg-zoom-blue" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            aria-label="Search"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <Search size={19} />
          </button>
          <button
            aria-label="Notifications"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <Bell size={19} />
          </button>
          <button
            aria-label="Settings"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
          >
            <Settings size={19} />
          </button>
          <div
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
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
