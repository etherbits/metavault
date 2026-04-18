import { type ReactNode, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Database,
  CodeSquare,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MetaLogo from "@/assets/Meta.png";
import { Button } from "@/components/ui/button";

type SidebarPage = "home" | "query" | "integrations";

interface SidebarUser {
  name: string;
  email: string;
}

interface SidebarProps {
  activePage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  isOpen: boolean;
  onToggle: () => void;
  onSignOut?: () => void;
  user?: SidebarUser;
}

interface SidebarNavItemConfig {
  id: SidebarPage;
  label: string;
  icon: LucideIcon;
}

const navItems: SidebarNavItemConfig[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "query", label: "Query", icon: Database },
  { id: "integrations", label: "Integrations", icon: CodeSquare },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "";

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function SidebarText({
  isOpen,
  children,
  className,
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap transition-all duration-200 ease-out",
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-2 overflow-hidden opacity-0 w-0",
        className
      )}
    >
      {children}
    </span>
  );
}

function SidebarBrand({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="flex h-11 min-w-0 items-center gap-2 p-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#27272A]">
        <img
          src={MetaLogo}
          alt="MetaVault"
          className="h-4 w-4 object-contain"
        />
      </div>

      <SidebarText
        isOpen={isOpen}
        className="text-[16px] font-semibold text-[#E4E4E7]"
      >
        MetaVault
      </SidebarText>
    </div>
  );
}

function SidebarNavItem({
  item,
  active,
  isOpen,
  onClick,
}: {
  item: SidebarNavItemConfig;
  active: boolean;
  isOpen: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-8 w-full justify-start rounded-md px-3 py-1 text-sm shadow-none",
        "hover:bg-[#18181B] hover:text-[#D4D4D8]",
        active
          ? "bg-[#18181B] text-[#FACC15] hover:bg-[#18181B] hover:text-[#FACC15]"
          : "text-[#D4D4D8]",
        !isOpen && "justify-center px-0"
      )}
    >
      <Icon size={16} className="shrink-0" />
      <SidebarText isOpen={isOpen}>{item.label}</SidebarText>
    </Button>
  );
}

function SidebarNav({
  activePage,
  onNavigate,
  isOpen,
}: {
  activePage: SidebarPage;
  onNavigate: (page: SidebarPage) => void;
  isOpen: boolean;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      {navItems.map((item) => (
        <SidebarNavItem
          key={item.id}
          item={item}
          active={activePage === item.id}
          isOpen={isOpen}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </div>
  );
}

function SidebarDivider() {
  return <div className="h-px bg-[#3F3F46]" />;
}

function SidebarAction({
  icon: Icon,
  label,
  isOpen,
  onClick,
  rotateWhenClosed = false,
}: {
  icon: LucideIcon;
  label: string;
  isOpen: boolean;
  onClick?: () => void;
  rotateWhenClosed?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-8 w-full justify-start rounded-md px-3 py-1 text-[#D4D4D8] shadow-none hover:bg-[#18181B] hover:text-[#D4D4D8]",
        !isOpen && "justify-center px-0"
      )}
    >
      <Icon
        size={16}
        className={cn(
          "shrink-0 transition-transform duration-300 ease-in-out",
          rotateWhenClosed && !isOpen && "rotate-180"
        )}
      />
      <SidebarText isOpen={isOpen}>{label}</SidebarText>
    </Button>
  );
}

function SidebarUser({
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

      <div
        role={canOpenSignOut ? "button" : undefined}
        tabIndex={canOpenSignOut ? 0 : undefined}
        onClick={
          canOpenSignOut ? () => setIsSignOutOpen((prev) => !prev) : undefined
        }
        onKeyDown={
          canOpenSignOut
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setIsSignOutOpen((prev) => !prev);
                }
              }
            : undefined
        }
        className={cn(
          "flex h-11 min-w-0 items-center gap-2 rounded-md px-2 py-1",
          canOpenSignOut && "cursor-pointer hover:bg-[#18181B]",
          !isOpen && "justify-center px-0"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-sm font-semibold text-[#FAFAFA]">
          {getInitials(user.name)}
        </div>

        <SidebarText isOpen={isOpen} className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm text-[#FAFAFA]">{user.name}</span>
            <span className="truncate text-xs text-[#A1A1AA]">
              {user.email}
            </span>
          </div>
        </SidebarText>
      </div>
    </div>
  );
}

function SidebarFooter({
  isOpen,
  onToggle,
  onSignOut,
  user,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onSignOut?: () => void;
  user: SidebarUser;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <SidebarDivider />

      <SidebarAction
        icon={ChevronLeft}
        label="Close sidebar"
        isOpen={isOpen}
        onClick={onToggle}
        rotateWhenClosed
      />

      <SidebarAction icon={Settings} label="Settings" isOpen={isOpen} />

      <SidebarDivider />
      <SidebarUser user={user} isOpen={isOpen} onSignOut={onSignOut} />
    </div>
  );
}

export function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onToggle,
  onSignOut,
  user = {
    name: "Nika Qvrivishvili",
    email: "nikaqvrivishvili@gmail.com",
  },
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex h-screen shrink-0 flex-col justify-between overflow-visible border-r border-[#27272A] bg-[#09090B] lg:relative lg:z-20",
        "transition-[width,padding,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isOpen
          ? "w-[240px] translate-x-0 p-3"
          : "w-0 -translate-x-full p-0 lg:w-[72px] lg:translate-x-0 lg:p-3"
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-1">
        <SidebarBrand isOpen={isOpen} />
        <SidebarNav
          activePage={activePage}
          onNavigate={onNavigate}
          isOpen={isOpen}
        />
      </div>

      <SidebarFooter
        isOpen={isOpen}
        onToggle={onToggle}
        onSignOut={onSignOut}
        user={user}
      />
    </aside>
  );
}
