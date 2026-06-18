import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  CodeSquare,
  Database,
  Home,
  Settings,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { MetaIcon } from "@/components/MetaIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarUser {
  name: string;
  email: string;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSignOut?: () => void;
  user?: SidebarUser;
}

interface SidebarNavItemConfig {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: SidebarNavItemConfig[] = [
  { to: "/app/home", label: "Home", icon: Home },
  { to: "/app/query", label: "Query", icon: Database },
  { to: "/app/integrations", label: "Integrations", icon: CodeSquare },
];

const settingsPath = "/app/settings";
const sidebarTransition = {
  type: "tween",
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
} as const;
const labelTransition = {
  type: "tween",
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
} as const;

function getInitials(name: string): string {
  const first = name.trim()[0];
  return first ? first.toUpperCase() : "U";
}

function SidebarLabel({
  isOpen,
  children,
  className,
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.span
          key="label"
          transition={labelTransition}
          className={cn("min-w-0 overflow-hidden whitespace-nowrap", className)}
        >
          {children}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

function SidebarBrand({ isOpen }: { isOpen: boolean }) {
  return (
    <motion.div
      layout
      className={cn(
        "flex h-11 gap-2 items-center overflow-hidden",
        isOpen ? "px-2" : "justify-center px-0"
      )}
      transition={sidebarTransition}
    >
      <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-[6px] bg-[#27272A]">
        <MetaIcon className="h-7 w-7" />
      </div>

      <SidebarLabel
        isOpen={isOpen}
        className="text-[16px] font-semibold text-[#E4E4E7]"
      >
        MetaVault
      </SidebarLabel>
    </motion.div>
  );
}

function SidebarRowFrame({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      animate={{ width: isOpen ? 220 : 32 }}
      transition={sidebarTransition}
      className="h-8 overflow-hidden"
    >
      {children}
    </motion.div>
  );
}

function SidebarRowButton({
  active,
  isOpen,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
  isOpen: boolean;
}) {
  return (
    <SidebarRowFrame isOpen={isOpen}>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-8 w-full overflow-hidden rounded-md py-1 text-sm shadow-none",
          "hover:bg-[#18181B] hover:text-[#D4D4D8]",
          active
            ? "bg-[#18181B] text-[#FACC15] hover:bg-[#18181B] hover:text-[#FACC15]"
            : "text-[#D4D4D8]",
          isOpen ? "justify-start px-4" : "justify-center p-0"
        )}
        {...props}
      >
        {children}
      </Button>
    </SidebarRowFrame>
  );
}

function SidebarRowLink({
  to,
  active,
  isOpen,
  children,
}: {
  to: string;
  active: boolean;
  isOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <SidebarRowFrame isOpen={isOpen}>
      <Button
        asChild
        variant="ghost"
        className={cn(
          "h-8 w-full overflow-hidden rounded-md py-1 text-sm shadow-none",
          "hover:bg-[#18181B] hover:text-[#D4D4D8]",
          active
            ? "bg-[#18181B] text-[#FACC15] hover:bg-[#18181B] hover:text-[#FACC15]"
            : "text-[#D4D4D8]",
          isOpen ? "justify-start px-4" : "justify-center p-0"
        )}
      >
        <Link to={to}>{children}</Link>
      </Button>
    </SidebarRowFrame>
  );
}

function SidebarNav({
  pathname,
  isOpen,
}: {
  pathname: string;
  isOpen: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-1",
        !isOpen && "items-center"
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarRowLink
            key={item.to}
            to={item.to}
            active={pathname.startsWith(item.to)}
            isOpen={isOpen}
          >
            <Icon size={16} className="shrink-0" />
            <SidebarLabel isOpen={isOpen}>{item.label}</SidebarLabel>
          </SidebarRowLink>
        );
      })}
    </div>
  );
}

function SidebarDivider() {
  return <div className="h-px w-full bg-[#3F3F46]" />;
}

function SidebarUserRow({
  user,
  isOpen,
  onSignOut,
}: {
  user: SidebarUser;
  isOpen: boolean;
  onSignOut?: () => void;
}) {
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canOpenSignOut = isOpen && Boolean(onSignOut);

  useEffect(() => {
    if (!isOpen) {
      setIsSignOutOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isSignOutOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsSignOutOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isSignOutOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {canOpenSignOut && isSignOutOpen && (
        <div className="absolute left-full top-1/2 z-50 ml-2 w-40 -translate-y-1/2 rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
          <button
            type="button"
            onClick={() => {
              setIsSignOutOpen(false);
              onSignOut?.();
            }}
            className="flex min-h-8 w-full items-center rounded-md px-2 py-[5.5px] text-left text-sm leading-5 text-[#F87171] transition-colors hover:bg-[#27272A]"
          >
            Sign out
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={
          canOpenSignOut ? () => setIsSignOutOpen((prev) => !prev) : undefined
        }
        className={cn(
          "flex h-11 w-full min-w-0 items-center overflow-hidden rounded-md text-left",
          canOpenSignOut
            ? "cursor-pointer hover:bg-[#18181B]"
            : "cursor-default",
          isOpen ? "gap-2 px-2 py-1" : "justify-center"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-sm font-semibold text-[#FAFAFA]">
          {getInitials(user.name)}
        </div>

        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              key="user-details"
              initial={{ opacity: 0, x: -6, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, x: 0, width: 160, marginLeft: 8 }}
              exit={{ opacity: 0, x: -4, width: 0, marginLeft: 0 }}
              transition={labelTransition}
              className="flex min-w-0 flex-col overflow-hidden leading-tight"
            >
              <span className="truncate text-sm text-[#FAFAFA]">
                {user.name}
              </span>
              {user.email ? (
                <span className="truncate text-xs text-[#A1A1AA]">
                  {user.email}
                </span>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </button>
    </div>
  );
}

function SidebarFooter({
  pathname,
  isOpen,
  onToggle,
  onSignOut,
  user,
}: {
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  onSignOut?: () => void;
  user: SidebarUser;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-1",
        !isOpen && "items-center"
      )}
    >
      <SidebarDivider />

      <SidebarRowButton isOpen={isOpen} onClick={onToggle}>
        <motion.span
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={sidebarTransition}
          className="flex shrink-0"
        >
          <ChevronLeft size={16} />
        </motion.span>
        <SidebarLabel isOpen={isOpen}>Close sidebar</SidebarLabel>
      </SidebarRowButton>

      <SidebarRowLink
        to={settingsPath}
        active={pathname.startsWith(settingsPath)}
        isOpen={isOpen}
      >
        <Settings size={16} className="shrink-0" />
        <SidebarLabel isOpen={isOpen}>Settings</SidebarLabel>
      </SidebarRowLink>

      <SidebarDivider />
      <SidebarUserRow user={user} isOpen={isOpen} onSignOut={onSignOut} />
    </div>
  );
}

export function Sidebar({
  isOpen,
  onToggle,
  onSignOut,
  user = { name: "User", email: "" },
}: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <motion.aside
      animate={{ width: isOpen ? 240 : 68 }}
      transition={sidebarTransition}
      className="relative z-10 flex h-dvh shrink-0 flex-col justify-between overflow-visible border-r border-[#27272A] bg-[#09090B] p-[10px]"
    >
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-1",
          !isOpen && "items-center"
        )}
      >
        <SidebarBrand isOpen={isOpen} />
        <SidebarNav pathname={pathname} isOpen={isOpen} />
      </div>

      <SidebarFooter
        pathname={pathname}
        isOpen={isOpen}
        onToggle={onToggle}
        onSignOut={onSignOut}
        user={user}
      />
    </motion.aside>
  );
}
