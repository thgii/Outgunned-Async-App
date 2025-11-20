import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Film,
  Users,
  Clapperboard,
  Menu,
  X,
  Skull,
} from "lucide-react";
import { useAuth } from "../lib/store";

const linkBase =
  "px-3 py-2 rounded-lg transition-colors text-sm font-medium hover:text-white";
const active =
  "text-white bg-white/5 border border-white/10 shadow-sm";
const inactive = "text-gray-300";

// mobile panel link styling
const mobileLinkBase =
  "w-full text-left px-4 py-3 rounded-lg transition-colors text-base font-medium hover:text-white";
const mobileActive =
  "text-white bg-white/5 border border-white/10 shadow-sm";
const mobileInactive = "text-gray-300";

export default function Header() {
  const [open, setOpen] = useState(false);

  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.token);
  const clearAuth = useAuth((s) => s.clearAuth);

  async function onLogout() {
    const t = token;
    clearAuth();
    try {
      if (t) {
        const { api } = await import("../lib/api");
        await api("/auth/logout", {
          method: "POST",
          json: { token: t },
        });
      }
    } catch {}
  }

  const onNav = () => setOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/70 backdrop-blur-md border-b border-slate-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

        {/* Brand */}
        <NavLink
          to="/"
          className="flex items-center gap-3 hover:opacity-90 transition"
        >
          <Film className="h-6 w-6 shrink-0" style={{ color: `rgb(var(--accent))` }} />
          <span className="text-xl font-bold tracking-wider drop-shadow-sm accent-text">
            OCAP
          </span>
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">

          <NavLink
            to="/characters"
            className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" /> Heroes
            </span>
          </NavLink>

          <NavLink
            to="/campaigns"
            className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <Film className="h-4 w-4" /> Campaigns
            </span>
          </NavLink>

          <NavLink
            to="/npcs"
            className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <Skull className="h-4 w-4" /> NPCs
            </span>
          </NavLink>

          <NavLink
            to="/directors-toolkit"
            className={({ isActive }) => `${linkBase} ${isActive ? active : inactive}`}
          >
            <span className="inline-flex items-center gap-2">
              <Clapperboard className="h-4 w-4" /> Director&apos;s Toolkit
            </span>
          </NavLink>

        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm opacity-80">{user.name}</span>
              <button
                onClick={onLogout}
                className="text-sm px-3 py-1 rounded border border-white/20 hover:bg-white/10"
              >
                Logout
              </button>
            </>
          ) : (
            <a
              className="text-sm px-3 py-1 rounded border border-white/20 hover:bg-white/10"
              href="/login"
            >
              Login
            </a>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-gray-200 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t border-slate-800/60 bg-slate-900/85 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-2 py-2 sm:px-4">

            <div className="flex flex-col gap-2 py-2">

              <NavLink
                to="/characters"
                className={({ isActive }) =>
                  `${mobileLinkBase} ${isActive ? mobileActive : mobileInactive}`
                }
                onClick={onNav}
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="h-5 w-5" /> Heroes
                </span>
              </NavLink>

              <NavLink
                to="/campaigns"
                className={({ isActive }) =>
                  `${mobileLinkBase} ${isActive ? mobileActive : mobileInactive}`
                }
                onClick={onNav}
              >
                <span className="inline-flex items-center gap-2">
                  <Film className="h-5 w-5" /> Campaigns
                </span>
              </NavLink>

              <NavLink
                to="/npcs"
                className={({ isActive }) =>
                  `${mobileLinkBase} ${isActive ? mobileActive : mobileInactive}`
                }
                onClick={onNav}
              >
                <span className="inline-flex items-center gap-2">
                  <Skull className="h-5 w-5" /> NPCs
                </span>
              </NavLink>

              <NavLink
                to="/directors-toolkit"
                className={({ isActive }) =>
                  `${mobileLinkBase} ${isActive ? mobileActive : mobileInactive}`
                }
                onClick={onNav}
              >
                <span className="inline-flex items-center gap-2">
                  <Clapperboard className="h-5 w-5" /> Director&apos;s Toolkit
                </span>
              </NavLink>

              {/* Auth (mobile) */}
              <div className="border-t border-slate-800/60 mt-2 pt-2">
                {user ? (
                  <button
                    onClick={() => { onLogout(); onNav(); }}
                    className="w-full text-left px-4 py-3 rounded-lg transition-colors text-base font-medium hover:text-white text-gray-300"
                  >
                    Logout ({user.name})
                  </button>
                ) : (
                  <a
                    href="/login"
                    onClick={onNav}
                    className="w-full text-left px-4 py-3 rounded-lg transition-colors text-base font-medium hover:text-white text-gray-300"
                  >
                    Login
                  </a>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </header>
  );
}
