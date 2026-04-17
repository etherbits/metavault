import { Home, Database, Plug, ChevronLeft, Settings } from "lucide-react";
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
  { id: "integrations" as const, label: "Integrations", icon: Plug },
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
        "h-screen bg-[#09090B] border-r border-[#27272A] flex flex-col justify-between overflow-hidden transform-gpu",
        "transition-[width,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width]",
        isOpen ? "w-[240px] px-3 py-3" : "w-[64px] px-2 py-2"
      )}
    >
      {/* TOP */}
      <div className="flex flex-col gap-4 w-full">
        {/* BRAND */}
        <div className="flex items-center gap-2 px-2 h-11">
          <div className="w-7 h-7 flex items-center justify-center bg-[#27272A] rounded-md shrink-0">
            <img
              src={MetaLogo}
              alt="Meta"
              className="w-16 h-[14px] object-contain"
            />
          </div>

          <span
            className={cn(
              "text-[#E4E4E7] font-semibold text-[16px] whitespace-nowrap transition-all duration-200 ease-out",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none"
            )}
          >
            MetaVault
          </span>
        </div>

        {/* NAV LIST */}
        <div className="flex flex-col gap-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  "transition-all duration-200",
                  "hover:bg-[#18181B] active:scale-[0.98]",
                  active ? "bg-[#18181B] text-[#FACC15]" : "text-[#D4D4D8]"
                )}
              >
                <Icon size={16} className="shrink-0" />

                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-200 ease-out",
                    isOpen
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 -translate-x-2 pointer-events-none"
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
      <div className="flex flex-col gap-2 w-full">
        <div className="h-px bg-[#3F3F46]" />

        {/* TOGGLE */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#D4D4D8] transition-all duration-200 hover:bg-[#18181B] active:scale-[0.98]"
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
                : "opacity-0 -translate-x-2 pointer-events-none"
            )}
          >
            Close Sidebar
          </span>
        </button>

        {/* SETTINGS */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[#D4D4D8] transition-all duration-200 hover:bg-[#18181B] active:scale-[0.98]"
        >
          <Settings size={16} className="shrink-0" />

          <span
            className={cn(
              "whitespace-nowrap transition-all duration-200 ease-out",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none"
            )}
          >
            Settings
          </span>
        </button>

        <div className="h-px bg-[#3F3F46]" />

        {/* USER */}
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#18181B] text-[#FAFAFA] text-sm font-semibold shrink-0">
            {user.initials}
          </div>

          <div
            className={cn(
              "flex flex-col leading-tight overflow-hidden transition-all duration-200 ease-out",
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none"
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
