import { setTheme, useTheme } from '../utils/theme'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useTheme()
  const dark = theme === 'dark'
  return (
    <button type="button" role="switch" aria-checked={dark} aria-label="Тёмная тема"
      title={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-body transition hover:border-brand-border hover:bg-brand-soft hover:text-brand ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark
          ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>
          : <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />}
      </svg>
    </button>
  )
}
