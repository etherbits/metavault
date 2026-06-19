import { motion, useReducedMotion } from "motion/react";
import { Outlet } from "react-router";
import { useDashboardShell } from "@/app/useDashboardShell";
import { Sidebar } from "@/components/Sidebar";

export function AppShell() {
  const shell = useDashboardShell();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-dvh min-h-screen overflow-hidden bg-[#18181B] text-white">
      <motion.div
        className="relative z-10 flex shrink-0"
        initial={reduceMotion ? false : { opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        <Sidebar
          isOpen={shell.sidebarOpen}
          onToggle={shell.onToggleSidebar}
          onSignOut={shell.handleSignOut}
          user={shell.sidebarUser}
        />
      </motion.div>

      <motion.main
        className="relative z-10 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-16 lg:py-12"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
}
