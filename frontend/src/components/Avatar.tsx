import type { DemoUser } from '../utils/auth'

const SIZES = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-24 w-24 text-3xl',
} as const

export default function Avatar({ user, size = 'md' }: { user: Pick<DemoUser, 'name' | 'avatar' | 'role'>; size?: keyof typeof SIZES }) {
  // Фото профиля доступно только администраторам; у остальных — буква имени, даже если фото сохранилось раньше.
  return user.avatar && user.role === 'admin' ? (
    <img src={user.avatar} alt={`Аватар: ${user.name}`} className={`${SIZES[size]} shrink-0 rounded-full border border-line object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${SIZES[size]} flex shrink-0 items-center justify-center rounded-full bg-brand-tint font-bold text-brand-strong`}>
      {user.name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
