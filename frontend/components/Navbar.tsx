"use client";

import { Bell, Menu, Search, Settings } from "lucide-react";
import Link from "next/link";
import type { User } from "@/lib/api";
import ZoomLogo from "./ZoomLogo";

interface Props {
  user: User | null;
  onMenuClick?: () => void;
}

export default function Navbar({ user, onMenuClick }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex items-center gap-2">
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
        </div>

        {/* global search, like the web portal */}
        <div className="hidden max-w-md flex-1 items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-400 md:flex">
          <Search size={16} />
          <input
            placeholder="Search"
            className="w-full bg-transparent text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            aria-label="Search"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 md:hidden"
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
