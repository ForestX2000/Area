import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";

export default function MainLayout() {
  const isEditor = useLocation().pathname.endsWith('/editor');
  return (
    <div className="min-h-screen bg-page text-body">
      <Header />

      <main className={`mx-auto min-w-0 w-full max-w-[1800px] ${isEditor ? 'editor-main lg:p-8' : 'p-3 sm:p-6 lg:p-8'}`}>
        <Outlet />
      </main>
    </div>
  );
}
