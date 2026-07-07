"use client";

import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  color: "orange" | "blue";
  onClick: () => void;
  loading?: boolean;
}

export default function ActionTile({
  icon: Icon,
  label,
  color,
  onClick,
  loading,
}: Props) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="group flex flex-col items-center gap-3 disabled:opacity-60"
    >
      <span
        className={`flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-hover:scale-105 group-active:scale-95 sm:h-24 sm:w-24 ${
          color === "orange"
            ? "bg-zoom-orange group-hover:bg-zoom-orange-dark"
            : "bg-zoom-blue group-hover:bg-zoom-blue-dark"
        }`}
      >
        {loading ? (
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <Icon size={34} strokeWidth={1.8} />
        )}
      </span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}
