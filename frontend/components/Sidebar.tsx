"use client";

import { ExternalLink, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Item {
  label: string;
  isNew?: boolean;
  external?: boolean;
}

const MY_PRODUCTS: Item[] = [
  { label: "AI", isNew: true, external: true },
  { label: "Meetings" },
  { label: "Recordings" },
  { label: "Summaries" },
  { label: "Hub", isNew: true, external: true },
  { label: "Whiteboards", external: true },
  { label: "Notes" },
  { label: "Clips", external: true },
  { label: "Canvas", external: true },
  { label: "Paper", external: true },
  { label: "Sheets", external: true },
  { label: "Slides", external: true },
];

function NavList({ active }: { active: string }) {
  const router = useRouter();
  return (
    <nav className="thin-scroll h-full overflow-y-auto py-3">
      <button
        onClick={() => router.push("/")}
        className={`mb-3 flex w-full items-center px-5 py-2.5 text-[15px] ${
          active === "Home"
            ? "border-l-2 border-zoom-blue bg-zoom-blue-light font-medium text-zoom-blue"
            : "text-gray-800 hover:bg-gray-50"
        }`}
      >
        Home
      </button>

      <p className="px-5 pb-1 pt-2 text-xs font-medium text-gray-500">
        My Products
      </p>
      {MY_PRODUCTS.map((item) => (
        <button
          key={item.label}
          onClick={item.label === "Meetings" ? () => router.push("/") : undefined}
          className={`flex w-full items-center gap-2 px-5 py-2 text-[15px] ${
            active === item.label
              ? "border-l-2 border-zoom-blue bg-zoom-blue-light font-medium text-zoom-blue"
              : "text-gray-800 hover:bg-gray-50"
          }`}
        >
          {item.label}
          {item.isNew && (
            <span className="rounded border border-zoom-blue px-1 text-[10px] font-semibold text-zoom-blue">
              New
            </span>
          )}
          {item.external && (
            <ExternalLink size={13} className="ml-auto text-gray-400" />
          )}
        </button>
      ))}
    </nav>
  );
}

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
  active?: string;
}

export default function Sidebar({ mobileOpen, onClose, active = "Home" }: Props) {
  return (
    <>
      {/* desktop rail */}
      <aside className="hidden w-60 shrink-0 border-r border-gray-100 bg-white lg:block">
        <NavList active={active} />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onClose}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl"
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
            <NavList active={active} />
          </aside>
        </div>
      )}
    </>
  );
}
