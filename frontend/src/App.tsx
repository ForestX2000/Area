
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectPage from "./pages/ProjectPage";
import ProjectMapPage from "./pages/ProjectMapPage";
import EditorPage from "./pages/EditorPage";
import WorkspacePage from "./pages/WorkspacePage";
import LoginPage from "./pages/LoginPage";
import ObjectsPage from "./pages/ObjectsPage";
import ObjectViewerPage from "./pages/ObjectViewerPage";
import ProfilePage from "./pages/ProfilePage";
import StatsPage from "./pages/StatsPage";
import SharedProjectPage from "./pages/SharedProjectPage";
import AnalyticsTracker from "./components/AnalyticsTracker";
import { useAuth } from "./contexts/useAuth";
import { AuthProvider } from "./contexts/AuthContext";
import { isAdmin } from "./utils/auth";


function ProtectedRoute() {
  const { user, signedOut } = useAuth();
  const location = useLocation();

  if (!user) {
    // После явного выхода не возвращаем следующего вошедшего на страницу прошлой сессии.
    return (
      <Navigate
        to="/login"
        replace
        state={signedOut ? undefined : { from: location }}
      />
    );
  }

  return <Outlet />;
}

// Редактирование, проекты и статистика доступны только администратору.
function AdminRoute() {
  const { user } = useAuth();
  return isAdmin(user) ? <Outlet /> : <Navigate to="/" replace />;
}

function HomePage() {
  const { user } = useAuth();
  return isAdmin(user) ? <ProjectsPage /> : <ObjectsPage />;
}

function AccountRoutes() {
  return (
    <AuthProvider>
      <AnalyticsTracker />
      <Outlet />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Просмотр по ссылке не зависит от сессии и хранилища аккаунтов. */}
      <Route path="/share/:shareId" element={<SharedProjectPage />} />

      <Route element={<AccountRoutes />}>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/objects/:projectId" element={<ObjectViewerPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
              <Route path="/projects/new" element={<Navigate to="/?create=project" replace />} />
              <Route path="/projects/:projectId" element={<ProjectPage />} />
              <Route path="/projects/:projectId/map" element={<ProjectMapPage />} />
              <Route
                path="/projects/:projectId/editor"
                element={<EditorPage />}
              />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/stats/:projectId" element={<StatsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
