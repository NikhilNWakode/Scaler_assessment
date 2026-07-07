"use client";

import {
  Calendar,
  FileText,
  Home,
  MessageSquare,
  PenSquare,
  PlaySquare,
  Settings,
  Users,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "Home", active: true },
  { icon: MessageSquare, label: "Team Chat" },
  { icon: Calendar, label: "Meetings" },
  { icon: Users, label: "Contacts" },
  { icon: PenSquare, label: "Whiteboards" },
  { icon: FileText, label: "Docs" },
  { icon: PlaySquare, label: "Recordings" },
  { icon: Settings, label: "Settings" },
];

function NavList() {
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active
              ? "bg-zoom-blue-light text-zoom-blue"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
          {label}
        </button>
      ))}
    </nav>
  );
}

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: Props) {
  return (
    <>
      {/* desktop rail */}
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white lg:block">
        <NavList />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-700">Menu</span>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <NavList />
          </aside>
        </div>
      )}
    </>
  );
}
