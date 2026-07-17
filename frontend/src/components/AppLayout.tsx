import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", adminOnly: false },
  { to: "/tasks", label: "Tasks", adminOnly: false },
  { to: "/users", label: "Users", adminOnly: true },
  { to: "/profile", label: "Profile", adminOnly: false },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const initials = user ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : "";

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-line bg-white md:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="h-7 w-7 rounded-md bg-brand-500" />
          <span className="font-display text-lg font-semibold text-ink-900">TaskBoard</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navItems
            .filter((item) => !item.adminOnly || user?.role === "admin")
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-700 hover:bg-surface hover:text-ink-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
        </nav>

        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs capitalize text-ink-600">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary mt-3 w-full">
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="flex flex-col border-b border-line bg-white md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="font-display text-base font-semibold text-ink-900">TaskBoard</span>
            <button onClick={handleLogout} className="text-sm font-medium text-brand-600">
              Log out
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2">
            {navItems
              .filter((item) => !item.adminOnly || user?.role === "admin")
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                      isActive ? "bg-brand-50 text-brand-700" : "text-ink-700"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
