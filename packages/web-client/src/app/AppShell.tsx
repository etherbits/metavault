import {
  motion,
  type TargetAndTransition,
  useReducedMotion,
} from "motion/react";
import type { CSSProperties } from "react";
import { Outlet } from "react-router";
import { useDashboardShell } from "@/app/useDashboardShell";
import { Sidebar } from "@/components/Sidebar";

export function AppShell() {
  const shell = useDashboardShell();
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-dvh min-h-screen overflow-hidden bg-[#18181B] text-white">
      <AppLoadBackground reduceMotion={reduceMotion} />
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

function AppLoadBackground({ reduceMotion }: { reduceMotion: boolean | null }) {
  const pulseMask =
    "radial-gradient(circle at 58% 22%, transparent 0px, transparent var(--pulse-inner), rgba(0,0,0,0.38) var(--pulse-soft-inner), black var(--pulse-core), rgba(0,0,0,0.32) var(--pulse-soft-outer), transparent var(--pulse-outer))";
  const pulseAnimation = reduceMotion
    ? ({ opacity: 0.05 } satisfies TargetAndTransition)
    : ({
        opacity: [0, 0.2, 0.13, 0],
        "--pulse-inner": ["12px", "1120px"],
        "--pulse-soft-inner": ["64px", "1260px"],
        "--pulse-core": ["118px", "1390px"],
        "--pulse-soft-outer": ["178px", "1520px"],
        "--pulse-outer": ["248px", "1660px"],
      } as TargetAndTransition);
  const pulseGridStyle = {
    backgroundImage:
      "linear-gradient(rgba(250,204,22,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,22,0.9) 1px, transparent 1px)",
    backgroundPosition: "center top",
    backgroundSize: "56px 56px",
    filter: "drop-shadow(0 0 12px rgba(250,204,22,0.28))",
    maskImage: reduceMotion
      ? "radial-gradient(circle at 58% 22%, black 0px, transparent 520px)"
      : pulseMask,
    WebkitMaskImage: reduceMotion
      ? "radial-gradient(circle at 58% 22%, black 0px, transparent 520px)"
      : pulseMask,
    "--pulse-core": "118px",
    "--pulse-inner": "12px",
    "--pulse-outer": "248px",
    "--pulse-soft-inner": "64px",
    "--pulse-soft-outer": "178px",
  } as CSSProperties &
    Record<
      | "--pulse-core"
      | "--pulse-inner"
      | "--pulse-outer"
      | "--pulse-soft-inner"
      | "--pulse-soft-outer",
      string
    >;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(113,113,122,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(113,113,122,0.1) 1px, transparent 1px)",
          backgroundPosition: "center top",
          backgroundSize: "56px 56px",
          opacity: 0.15,
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 9%, black 82%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 9%, black 82%, transparent 100%)",
        }}
      />
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={pulseAnimation}
        transition={
          reduceMotion
            ? undefined
            : {
                opacity: {
                  duration: 3.8,
                  ease: "linear",
                  times: [0, 0.22, 0.72, 1],
                },
                "--pulse-core": {
                  duration: 3.8,
                  ease: [0.37, 0, 0.63, 1],
                },
                "--pulse-inner": {
                  duration: 3.8,
                  ease: [0.37, 0, 0.63, 1],
                },
                "--pulse-outer": {
                  duration: 3.8,
                  ease: [0.37, 0, 0.63, 1],
                },
                "--pulse-soft-inner": {
                  duration: 3.8,
                  ease: [0.37, 0, 0.63, 1],
                },
                "--pulse-soft-outer": {
                  duration: 3.8,
                  ease: [0.37, 0, 0.63, 1],
                },
              }
        }
        style={pulseGridStyle}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,transparent_0%,rgba(24,24,27,0.16)_38%,rgba(9,9,11,0.28)_100%)]" />
    </div>
  );
}
