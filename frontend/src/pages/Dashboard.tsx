import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  ListChecks,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import api from "../api/axios";
import type { DashboardStats } from "../types";
import { useAuth } from "../context/AuthContext";

type IconType = typeof CheckCircle2;

interface PrimaryCard {
  key: keyof DashboardStats;
  label: string;
  icon: IconType;
  iconBg: string;
  iconColor: string;
}

const primaryCards: PrimaryCard[] = [
  {
    key: "total_tasks",
    label: "Total Tasks",
    icon: ListChecks,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
  },
  {
    key: "pending_tasks",
    label: "Pending",
    icon: Circle,
    iconBg: "bg-amber-50",
    iconColor: "text-warning",
  },
  {
    key: "in_progress_tasks",
    label: "In Progress",
    icon: Clock,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
  },
  {
    key: "completed_tasks",
    label: "Completed",
    icon: CheckCircle2,
    iconBg: "bg-emerald-50",
    iconColor: "text-success",
  },
];

const priorityMeta: {
  key: keyof DashboardStats;
  label: string;
  barColor: string;
  dotColor: string;
}[] = [
  { key: "high_priority_tasks", label: "High", barColor: "bg-danger", dotColor: "bg-danger" },
  { key: "medium_priority_tasks", label: "Medium", barColor: "bg-warning", dotColor: "bg-warning" },
  { key: "low_priority_tasks", label: "Low", barColor: "bg-brand-500", dotColor: "bg-brand-500" },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="mb-4 h-10 w-10 animate-pulse rounded-lg bg-line/60" />
      <div className="mb-2 h-7 w-14 animate-pulse rounded bg-line/60" />
      <div className="h-4 w-24 animate-pulse rounded bg-line/40" />
    </div>
  );
}

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

  const isAdmin = user?.role === "admin";
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const completionRate =
    stats && stats.total_tasks > 0
      ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
      : 0;

  const maxPriorityCount = stats
    ? Math.max(
        stats.high_priority_tasks,
        stats.medium_priority_tasks,
        stats.low_priority_tasks,
        1
      )
    : 1;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-ink-600">{today}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">
            {greeting()}, {user?.first_name}
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            {isAdmin
              ? "Here's what's happening across your team today."
              : "Here's an overview of your work today."}
          </p>
        </div>
        {stats && stats.total_tasks > 0 && (
          <div className="flex items-center gap-3 self-start rounded-xl border border-line bg-white px-4 py-3 shadow-card sm:self-auto">
            <div className="relative h-12 w-12 shrink-0">
              <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  strokeWidth="3"
                  className="stroke-line"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="stroke-success transition-all duration-500"
                  strokeDasharray={`${(completionRate / 100) * 97.4} 97.4`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-ink-900">
                {completionRate}%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-ink-900">Completion rate</p>
              <p className="text-xs text-ink-600">
                {stats.completed_tasks} of {stats.total_tasks} tasks done
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Primary stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats &&
            primaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  className="card group p-5 transition-shadow hover:shadow-lg"
                >
                  <div
                    className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${card.iconColor}`} strokeWidth={2} />
                  </div>
                  <p className="font-display text-3xl font-semibold tabular-nums text-ink-900">
                    {stats[card.key]}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">{card.label}</p>
                </div>
              );
            })}
      </div>

      {!isLoading && stats && (
        <div className={`grid gap-4 ${isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-1"}`}>
          {/* Priority breakdown */}
          <div className={`card p-6 ${isAdmin ? "lg:col-span-2" : ""}`}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-ink-900">
                  Tasks by priority
                </h2>
                <p className="text-sm text-ink-600">
                  Distribution across {stats.total_tasks} {stats.total_tasks === 1 ? "task" : "tasks"}
                </p>
              </div>
            </div>

            {stats.total_tasks === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ListChecks className="mb-3 h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-600">No tasks yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {priorityMeta.map((p) => {
                  const count = stats[p.key];
                  const widthPct = (count / maxPriorityCount) * 100;
                  return (
                    <div key={p.key}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium text-ink-800">
                          <span className={`h-2 w-2 rounded-full ${p.dotColor}`} />
                          {p.label}
                        </span>
                        <span className="tabular-nums text-ink-600">{count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full rounded-full ${p.barColor} transition-all duration-500`}
                          style={{ width: `${count === 0 ? 0 : Math.max(widthPct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team overview (admin only) */}
          {isAdmin && (
            <div className="card p-6">
              <h2 className="mb-5 font-display text-base font-semibold text-ink-900">
                Team overview
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink-900/5">
                    <Users className="h-5 w-5 text-ink-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-600">Total Employees</p>
                    <p className="font-display text-xl font-semibold text-ink-900">
                      {stats.total_employees}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <UserCheck className="h-5 w-5 text-success" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-600">Active</p>
                    <p className="font-display text-xl font-semibold text-ink-900">
                      {stats.active_employees}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <UserX className="h-5 w-5 text-danger" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-600">Inactive</p>
                    <p className="font-display text-xl font-semibold text-ink-900">
                      {stats.inactive_employees}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}