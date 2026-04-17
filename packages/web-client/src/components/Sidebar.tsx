import {
  Home,
  Database,
  CodeSquare,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MetaLogo from "@/assets/Meta.png";

interface SidebarProps {
  activePage: "home" | "query" | "integrations";
  onNavigate: (page: "home" | "query" | "integrations") => void;
  isOpen: boolean;
  onToggle: () => void;
  user?: {
    name: string;
    email: string;
    initials: string;
  };
}

const navItems = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "query" as const, label: "Query", icon: Database },
  { id: "integrations" as const, label: "Integrations", icon: CodeSquare },
];

export function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onToggle,
  user = {
    name: "Nika Qvrivisvili",
    email: "nikaqvrivishvil@gmail.com",
    initials: "NQ",
  },
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "relative z-20 shrink-0 h-screen bg-[#09090B] border-r border-[#27272A] flex flex-col justify-between overflow-hidden",
        "transition-[width,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isOpen ? "w-[240px] p-3" : "w-[72px] p-3"
      )}
    >
      {/* TOP */}
      <div className="flex flex-col gap-4 w-full min-w-0">
        {/* BRAND */}
        <div className="flex items-center gap-2 px-2 h-11 min-w-0">
          <div className="w-7 h-7 flex items-center justify-center bg-[#27272A] rounded-md shrink-0">
            <img src={MetaLogo} alt="Meta" className="w-4 h-4 object-contain" />
          </div>

          <span
            className={cn(
              "text-[#E4E4E7] font-semibold text-[16px] whitespace-nowrap transition-all duration-200 ease-out",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden"
            )}
          >
            MetaVault
          </span>
        </div>

        {/* NAV LIST */}
        <div className="flex flex-col gap-1 w-full min-w-0">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 h-[40px] rounded-[10px] text-sm min-w-0",
                  "transition-all duration-200 hover:bg-[#18181B]",
                  active ? "bg-[#18181B] text-[#FACC15]" : "text-[#D4D4D8]"
                )}
              >
                <Icon size={16} className="shrink-0" />

                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-200 ease-out",
                    isOpen
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM */}
      <div className="flex flex-col gap-2 w-full min-w-0">
        <div className="h-px bg-[#3F3F46]" />

        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#D4D4D8] transition-all duration-200 hover:bg-[#18181B] min-w-0"
        >
          <ChevronLeft
            size={16}
            className={cn(
              "transition-transform duration-300 ease-in-out shrink-0",
              !isOpen && "rotate-180"
            )}
          />

          <span
            className={cn(
              "whitespace-nowrap transition-all duration-200 ease-out",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden"
            )}
          >
            Close Sidebar
          </span>
        </button>

        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#D4D4D8] transition-all duration-200 hover:bg-[#18181B] min-w-0"
        >
          <Settings size={16} className="shrink-0" />

          <span
            className={cn(
              "whitespace-nowrap transition-all duration-200 ease-out",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden"
            )}
          >
            Settings
          </span>
        </button>

        <div className="h-px bg-[#3F3F46]" />

        <div className="flex items-center gap-2 px-2 py-2 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#18181B] text-[#FAFAFA] text-sm font-semibold shrink-0">
            {user.initials}
          </div>

          <div
            className={cn(
              "flex flex-col leading-tight overflow-hidden transition-all duration-200 ease-out min-w-0",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none w-0"
            )}
          >
            <span className="text-sm text-[#FAFAFA] truncate">{user.name}</span>
            <span className="text-xs text-[#A1A1AA] truncate">
              {user.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
