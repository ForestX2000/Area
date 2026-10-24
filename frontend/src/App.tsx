
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectPage from "./pages/ProjectPage";
import ProjectMapPage from "./pages/ProjectMapPage";
import EditorPage from "./pages/EditorPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./contexts/useAuth";


function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}

function NewProjectPage() {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 text-body">
      <h1 className="text-2xl font-bold">Создать проект</h1>
      <p className="mt-2 text-muted">
        Здесь позже появится форма создания проекта.
      </p>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="/projects/:projectId/map" element={<ProjectMapPage />} />
          <Route
            path="/projects/:projectId/editor"
            element={<EditorPage />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
