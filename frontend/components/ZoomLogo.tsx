export default function ZoomLogo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`select-none text-[26px] font-extrabold lowercase leading-none tracking-tight text-[#0B5CFF] ${className}`}
    >
      zoom
    </span>
  );
}
