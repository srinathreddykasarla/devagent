import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function Layout() {
  return (
    <div className="min-h-screen grid grid-cols-[232px_1fr] bg-[hsl(var(--bg))]">
      <Sidebar />
      <div className="flex flex-col min-h-screen min-w-0">
        <Header />
        <main className="flex-1 min-w-0 px-6 py-5 anim-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
