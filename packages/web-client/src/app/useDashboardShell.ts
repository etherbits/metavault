import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthSession, useSignOut } from "@/features/auth/hooks";

export function useDashboardShell() {
  const navigate = useNavigate();
  const signOut = useSignOut();
  const authSession = useAuthSession();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });

  const profile = authSession.data;
  const sidebarUser = useMemo(
    () => ({
      name: profile?.username ?? "User",
      email: profile?.email ?? "",
      avatarUrl: profile?.avatar_url ?? null,
    }),
    [profile]
  );

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSignOut = async () => {
    setSidebarOpen(false);
    await signOut();
    navigate("/login");
  };

  return {
    handleSignOut,
    sidebarOpen,
    sidebarUser,
    onToggleSidebar: () => setSidebarOpen((previous) => !previous),
  };
}
