import { useEffect, useState } from "react";
import api from "../api/axios";
import type { DashboardStats } from "../types";
import { useAuth } from "../context/AuthContext";

const statCards: {
  key: keyof DashboardStats;
  label: string;
  accent: string;
}[] = [
  { key: "total_tasks", label: "Total Tasks", accent: "bg-brand-500" },
  { key: "pending_tasks", label: "Pending", accent: "bg-warning" },
  { key: "in_progress_tasks", label: "In Progress", accent: "bg-brand-600" },
  { key: "completed_tasks", label: "Completed", accent: "bg-success" },
  { key: "total_employees", label: "Total Employees", accent: "bg-ink-700" },
  { key: "active_employees", label: "Active Employees", accent: "bg-success" },
  { key: "high_priority_tasks", label: "High Priority", accent: "bg-danger" },
  { key: "medium_priority_tasks", label: "Medium Priority", accent: "bg-warning" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await api.get<DashboardStats>("/dashboard/stats");
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError("Could not load dashboard stats.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900">
          Welcome back, {user?.first_name}
        </h1>
        <p className="text-sm text-ink-600">Here's what's happening across your team today.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-line/40" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.key} className="card p-4">
              <div className={`mb-3 h-1.5 w-8 rounded-full ${card.accent}`} />
              <p className="font-display text-3xl font-semibold text-ink-900">
                {stats[card.key]}
              </p>
              <p className="mt-1 text-sm text-ink-600">{card.label}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
