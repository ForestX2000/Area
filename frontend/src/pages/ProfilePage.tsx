
import { useState, type FormEvent, type ReactNode } from 'react'

import Avatar from '../components/Avatar'
import AvatarCropDialog from '../components/AvatarCropDialog'
import { useAuth } from '../contexts/useAuth'
import { useConfirmation } from '../contexts/useConfirmation'
import { AuthError, changeEmail, changePassword, getAccountCreatedAt, isAdmin, updateAvatar, updateName } from '../utils/auth'

type Status = { kind: 'success' | 'error'; text: string } | null

const inputClass = 'w-full rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm text-body outline-none transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand-soft'
const primaryClass = 'rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50'

function Message({ status }: { status: Status }) {
  if (!status) return null
  return status.kind === 'success'
    ? <p role="status" className="text-sm text-success">{status.text}</p>
    : <p role="alert" className="text-sm text-brand-hover">{status.text}</p>
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function errorText(error: unknown) {
  return error instanceof AuthError ? error.message : 'Не удалось сохранить изменения. Проверьте доступное место в браузере.'
}

export default function ProfilePage() {
  const { user, signOut, updateUser } = useAuth()
  const confirm = useConfirmation()
  const [name, setName] = useState(user?.name ?? '')
  const [nameStatus, setNameStatus] = useState<Status>(null)
  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailStatus, setEmailStatus] = useState<Status>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<Status>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarStatus, setAvatarStatus] = useState<Status>(null)

  if (!user) return null
  const createdAt = getAccountCreatedAt(user.id)

  function handleName(event: FormEvent) {
    event.preventDefault()
    try {
      updateUser((current) => updateName(current.id, name))
      setNameStatus({ kind: 'success', text: 'Имя сохранено.' })
    } catch (error) {
      setNameStatus({ kind: 'error', text: errorText(error) })
    }
  }

  function handleEmail(event: FormEvent) {
    event.preventDefault()
    try {
      updateUser((current) => changeEmail(current.id, email, emailPassword))
      setEmail('')
      setEmailPassword('')
      setEmailStatus({ kind: 'success', text: 'Почта изменена. Используйте её для входа.' })
    } catch (error) {
      setEmailStatus({ kind: 'error', text: errorText(error) })
    }
  }

  function handlePassword(event: FormEvent) {
    event.preventDefault()
    if (nextPassword !== repeatPassword) {
      setPasswordStatus({ kind: 'error', text: 'Новые пароли не совпадают.' })
      return
    }
    try {
      changePassword(user!.id, currentPassword, nextPassword)
      setCurrentPassword('')
      setNextPassword('')
      setRepeatPassword('')
      setPasswordStatus({ kind: 'success', text: 'Пароль изменён.' })
    } catch (error) {
      setPasswordStatus({ kind: 'error', text: errorText(error) })
    }
  }

  function saveAvatar(dataUrl: string | undefined) {
    try {
      updateUser((current) => updateAvatar(current.id, dataUrl))
      setAvatarStatus({ kind: 'success', text: dataUrl ? 'Аватар обновлён.' : 'Аватар удалён.' })
    } catch (error) {
      setAvatarStatus({ kind: 'error', text: errorText(error) })
    }
    setAvatarFile(null)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section aria-label="Аккаунт" className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold text-ink">{user.name}</h1>
          <p className="mt-1 break-all text-sm text-muted">{user.email}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand">{isAdmin(user) ? 'Администратор' : 'Пользователь'}</span>
            {createdAt && <span>С нами с {new Date(createdAt).toLocaleDateString('ru-RU')}</span>}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <label className="cursor-pointer rounded-lg border border-brand-border px-4 py-2 text-center text-sm font-semibold text-brand transition hover:bg-brand-soft focus-within:ring-2 focus-within:ring-brand">
            {user.avatar ? 'Сменить фото' : 'Загрузить фото'}
            <input type="file" accept="image/*" aria-label="Загрузить фото профиля" className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (!file) return
                if (!file.type.startsWith('image/')) setAvatarStatus({ kind: 'error', text: 'Выберите файл изображения.' })
                else { setAvatarStatus(null); setAvatarFile(file) }
              }} />
          </label>
          {user.avatar && (
            <button type="button" className="rounded-lg px-4 py-2 text-sm text-muted transition hover:bg-brand-soft hover:text-brand"
              onClick={async () => { if (await confirm({ title: 'Удалить фото профиля?', message: 'Вместо фото будет показана первая буква имени.' })) saveAvatar(undefined) }}>
              Удалить фото
            </button>
          )}
          <Message status={avatarStatus} />
        </div>
      </section>

      <Section title="Имя" description="Так вас видят в шапке сайта и в статистике.">
        <form onSubmit={handleName} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <label className="flex-1">
            <span className="sr-only">Имя</span>
            <input aria-label="Имя" value={name} maxLength={80} onChange={(event) => { setName(event.target.value); setNameStatus(null) }} className={inputClass} />
          </label>
          <button type="submit" className={primaryClass}>Сохранить имя</button>
        </form>
        <div className="mt-2"><Message status={nameStatus} /></div>
      </Section>

      <Section title="Почта" description="Новая почта станет логином. Для подтверждения введите текущий пароль.">
        <form onSubmit={handleEmail} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">Новая почта
            <input type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setEmailStatus(null) }}
              placeholder={user.email} className={inputClass} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Текущий пароль
            <input type="password" autoComplete="current-password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} className={inputClass} />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" className={primaryClass}>Изменить почту</button>
            <Message status={emailStatus} />
          </div>
        </form>
      </Section>

      <Section title="Пароль" description="Не короче 8 символов, обязательно буквы и цифры.">
        <form onSubmit={handlePassword} className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium">Текущий пароль
            <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordStatus(null) }} className={inputClass} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Новый пароль
            <input type="password" autoComplete="new-password" required value={nextPassword} onChange={(event) => { setNextPassword(event.target.value); setPasswordStatus(null) }} className={inputClass} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Повторите пароль
            <input type="password" autoComplete="new-password" required value={repeatPassword} onChange={(event) => { setRepeatPassword(event.target.value); setPasswordStatus(null) }} className={inputClass} />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button type="submit" className={primaryClass}>Сменить пароль</button>
            <Message status={passwordStatus} />
          </div>
        </form>
      </Section>

      <button type="button" onClick={signOut}
        className="w-full rounded-xl border border-brand-border px-5 py-3 text-sm font-medium text-brand-hover transition hover:bg-brand-soft">
        Выйти из аккаунта
      </button>

      {avatarFile && <AvatarCropDialog file={avatarFile} onCancel={() => setAvatarFile(null)} onSave={(dataUrl) => saveAvatar(dataUrl)} />}
    </div>
  )
}
