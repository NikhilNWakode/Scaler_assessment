export default function ZoomLogo({ className = "h-7" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-full w-auto" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0E72ED" />
        <path
          d="M7 12.2c0-.66.54-1.2 1.2-1.2h9.1c1.77 0 3.2 1.43 3.2 3.2v5.6c0 .66-.54 1.2-1.2 1.2H10.2A3.2 3.2 0 0 1 7 17.8v-5.6Z"
          fill="#fff"
        />
        <path
          d="M21.5 14.6l3.6-2.7c.5-.37 1.2 0 1.2.6v7c0 .62-.71.98-1.2.61l-3.6-2.7v-2.8Z"
          fill="#fff"
        />
      </svg>
      <span className="text-xl font-bold tracking-tight text-[#0E72ED]">
        zoom
      </span>
    </div>
  );
}
