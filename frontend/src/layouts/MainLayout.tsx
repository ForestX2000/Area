import { Outlet } from "react-router-dom";
import Header from "../components/Header";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-page text-body">
      <Header />

      <main className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
