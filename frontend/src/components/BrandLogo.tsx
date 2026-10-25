export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'h-auto w-[104px] sm:w-[190px]' : 'h-auto w-[220px] max-w-full'
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <img src="/ttk-logo.svg" alt="ТТК · ТрансТелеКом" width="220" height="26" className={`${size} dark:hidden`} />
      {/* В тёмной теме графитовые буквы логотипа заменены светлыми, красный знак сохранён. */}
      <img src="/ttk-logo-dark.svg" alt="ТТК · ТрансТелеКом" width="220" height="26" className={`${size} hidden dark:block`} />
      <span className="text-[10px] font-medium tracking-wide text-muted sm:text-xs">Карта пространств</span>
    </span>
  )
}
