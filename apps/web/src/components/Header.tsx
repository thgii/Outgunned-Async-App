import { NavLink } from "react-router-dom";
import { Film, Users, MessageSquare, Settings } from "lucide-react";

const linkBase =
  "px-3 py-2 rounded-lg transition-colors text-sm font-medium hover:text-white";
const active =
  "text-white bg-white/5 border border-white/10 shadow-sm";
const inactive = "text-gray-300";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/70 backdrop-blur-md border-b border-slate-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="h-6 w-6" style={{ color: `rgb(var(--accent))` }} />
          <span className="text-xl font-bold tracking-wider drop-shadow-sm accent-text">
            Outgunned Async
          </span>
        </div>

        <nav className="flex items-center gap-2">
          <NavLink
            to="/campaigns"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="inline-flex items-center gap-2">
              <Film className="h-4 w-4" /> Campaigns
            </span>
          </NavLink>

          <NavLink
            to="/characters"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" /> Heroes
            </span>
          </NavLink>

          <NavLink
            to="/directors-toolkit"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" /> Director's Toolkit
            </span>
          </NavLink>

          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Messages
            </span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="inline-flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
