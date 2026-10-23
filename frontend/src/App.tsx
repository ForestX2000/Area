
import { Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProjectsPage from './pages/ProjectsPage'
import ProjectPage from './pages/ProjectPage'
import ProjectMapPage from './pages/ProjectMapPage'

function NewProjectPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-2xl font-bold">Создать проект</h1>
      <p className="mt-2 text-slate-500">
        Здесь позже появится форма создания проекта.
      </p>
    </section>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route
          path="/projects/:projectId"
          element={<ProjectPage />}
        />
        <Route
          path="/projects/:projectId/map"
          element={<ProjectMapPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
