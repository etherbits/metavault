import { Outlet } from "react-router";
import { useDashboardShell } from "@/app/useDashboardShell";
import { Sidebar } from "@/components/Sidebar";

export function AppShell() {
  const shell = useDashboardShell();

  return (
    <div className="relative flex h-dvh min-h-screen overflow-hidden bg-[#18181B] text-white">
      <Sidebar
        isOpen={shell.sidebarOpen}
        onToggle={shell.onToggleSidebar}
        onSignOut={shell.handleSignOut}
        user={shell.sidebarUser}
      />

      <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-16 lg:py-12">
        <Outlet />
      </main>
    </div>
  );
}
