
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getProjects } from '../utils/projectStorage'
import { useAuth } from '../contexts/useAuth'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [editName, setEditName] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const projects = getProjects()

  function handleSaveName() {
    if (!user) return
    if (!editName.trim()) {
      setError('Введи имя.')
      return
    }

    const updatedUser = { ...user, name: editName.trim() }
    const auth = JSON.parse(localStorage.getItem('space-map-auth') || '{}')
    auth.user = updatedUser
    localStorage.setItem('space-map-auth', JSON.stringify(auth))

    setIsEditing(false)
    setError('')
    setSuccess('Имя обновлено.')
  }

  if (!user) {
    navigate('/auth', { replace: true })
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/"
            className="text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            ← Назад к проектам
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-2xl">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              <p className="mt-1 text-xs text-slate-400">ID: {user.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Проекты
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {projects.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Статус
              </p>
              <p className="mt-1 text-xs font-medium text-indigo-700">
                Активен
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Имя</h3>
              {isEditing ? (
                <div className="flex w-full max-w-xs items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-50"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    Сохранить
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditName(user.name)
                    setIsEditing(true)
                    setError('')
                    setSuccess('')
                  }}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                  Редактировать
                </button>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600" role="status">
                {success}
              </p>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100">
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition"
            >
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
