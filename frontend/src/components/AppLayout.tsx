import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  Users as UsersIcon,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/tasks", label: "Tasks", icon: ListChecks, adminOnly: false },
  { to: "/users", label: "Users", icon: UsersIcon, adminOnly: true },
  { to: "/profile", label: "Profile", icon: UserCircle, adminOnly: false },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : "";
  const visibleItems = navItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <div className="flex h-screen bg-surface">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-ink-950/40 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white transition-transform duration-300 ease-out md:static md:translate-x-0 md:border-r md:border-line ${
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={logo} alt="TaskBoard logo" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            <span className="truncate font-display text-lg font-semibold text-ink-900">
              TaskBoard
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-ink-500 hover:bg-surface md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Menu
          </p>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-600 hover:bg-surface hover:text-ink-900"
                  }`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-line p-4">
          <div className="flex items-center gap-3 rounded-lg px-1 py-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs capitalize text-ink-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-danger/30 hover:bg-danger hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 text-ink-700 hover:bg-surface"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2 font-display text-base font-semibold text-ink-900">
            <img src={logo} alt="TaskBoard logo" className="h-6 w-6 rounded-md object-contain" />
            TaskBoard
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
            {initials}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}