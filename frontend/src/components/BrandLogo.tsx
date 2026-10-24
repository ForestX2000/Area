export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <img src="/ttk-logo.svg" alt="ТТК · ТрансТелеКом" width="220" height="26"
        className={compact ? 'h-auto w-[146px] sm:w-[190px]' : 'h-auto w-[220px] max-w-full'} />
      <span className="text-xs font-medium tracking-wide text-muted">Карта пространств</span>
    </span>
  )
}
