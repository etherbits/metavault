import { Home, Database, Plug, ChevronLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

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
    name: "Nika Qvrivishvili",
    email: "nikaqvrivishvili@gmail.com",
    initials: "NQ",
  },
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#111111] border-r border-[#222222] transition-all duration-300",
        isOpen ? "w-[220px]" : "w-0 overflow-hidden"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[#222222]">
        <div className="w-7 h-7 rounded-md bg-[#F5B800] flex items-center justify-center text-black font-bold text-sm select-none">
          M
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">
          MetaVault
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm w-full text-left transition-colors",
              activePage === id
                ? "bg-[#1e1e1e] text-white"
                : "text-[#888888] hover:text-white hover:bg-[#1a1a1a]"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#222222] px-2 py-3 flex flex-col gap-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#888888] hover:text-white hover:bg-[#1a1a1a] w-full text-left transition-colors"
        >
          <ChevronLeft size={15} />
          Close sidebar
        </button>
        <button
          type="button"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[#888888] hover:text-white hover:bg-[#1a1a1a] w-full text-left transition-colors"
        >
          <Settings size={15} />
          Settings
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <div className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-white shrink-0 border border-[#333]">
            {user.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user.name}
            </p>
            <p className="text-[#666] text-[10px] truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
