import { type FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import type { Task } from "../types";
import {
  User as UserIcon,
  Mail,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  CalendarDays,
  ListChecks,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const tips = [
  "Use a unique password you don't reuse on other sites.",
  "Mix uppercase, lowercase, numbers, and symbols.",
  "Aim for 12+ characters — longer is stronger.",
  "Never share your password, even with a coworker.",
];

export default function Profile() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [myTasks, setMyTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    api
      .get<Task[]>("/tasks/my-tasks")
      .then(({ data }) => setMyTasks(data))
      .catch(() => setMyTasks([]));
  }, []);

  const taskStats = useMemo(() => {
    if (!myTasks) return null;
    return {
      total: myTasks.length,
      pending: myTasks.filter((t) => t.status === "Pending").length,
      inProgress: myTasks.filter((t) => t.status === "In Progress").length,
      completed: myTasks.filter((t) => t.status === "Completed").length,
    };
  }, [myTasks]);

  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = [
    "bg-line",
    "bg-danger",
    "bg-warning",
    "bg-brand-500",
    "bg-success",
  ][strength];

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/users/${user!.id}`, { password });
      setPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password updated successfully." });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setMessage({
          type: "error",
          text: err.response?.data?.detail ?? "Could not update password.",
        });
      } else {
        setMessage({ type: "error", text: "Could not update password." });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink-900">Profile</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Identity header */}
          <div className="card flex items-center gap-4 p-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink-900 font-display text-xl font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold text-ink-900">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-sm text-ink-600">{user.email}</p>
              <span className="badge mt-1.5 bg-brand-50 capitalize text-brand-700">
                <ShieldCheck className="mr-1 h-3 w-3" strokeWidth={2.5} />
                {user.role}
              </span>
            </div>
          </div>

          {/* Account details */}
          <div className="card p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-ink-900">
              Account details
            </h2>
            <dl className="divide-y divide-line text-sm">
              <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <dt className="flex items-center gap-2 text-ink-600">
                  <UserIcon className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                  Name
                </dt>
                <dd className="font-medium text-ink-900">
                  {user.first_name} {user.last_name}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="flex items-center gap-2 text-ink-600">
                  <Mail className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                  Email
                </dt>
                <dd className="font-medium text-ink-900">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="flex items-center gap-2 text-ink-600">
                  <ShieldCheck className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                  Role
                </dt>
                <dd className="font-medium capitalize text-ink-900">{user.role}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 last:pb-0">
                <dt className="flex items-center gap-2 text-ink-600">
                  <CalendarDays className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                  Member since
                </dt>
                <dd className="font-medium text-ink-900">{memberSince}</dd>
              </div>
            </dl>
          </div>

          {/* Change password */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
              <h2 className="font-display text-base font-semibold text-ink-900">
                Change password
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    message.type === "success"
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                  )}
                  {message.text}
                </div>
              )}

              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600/50"
                    strokeWidth={2}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600/50 hover:text-ink-700"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                </div>

                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full ${
                            i < strength ? strengthColor : "bg-line"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-ink-600">{strengthLabel}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Confirm new password</label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600/50"
                    strokeWidth={2}
                  />
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="input pl-9 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600/50 hover:text-ink-700"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-1.5 text-xs text-danger">Passwords do not match.</p>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          {/* Task summary */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
              <h2 className="font-display text-base font-semibold text-ink-900">My tasks</h2>
            </div>

            {taskStats === null ? (
              <div className="flex items-center gap-2 py-4 text-sm text-ink-600">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Loading…
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-600">Total assigned</span>
                  <span className="font-display text-2xl font-semibold text-ink-900">
                    {taskStats.total}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-ink-600">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      Pending
                    </span>
                    <span className="font-medium text-ink-900">{taskStats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-ink-600">
                      <span className="h-2 w-2 rounded-full bg-brand-500" />
                      In Progress
                    </span>
                    <span className="font-medium text-ink-900">{taskStats.inProgress}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-ink-600">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      Completed
                    </span>
                    <span className="font-medium text-ink-900">{taskStats.completed}</span>
                  </div>
                </div>
                {taskStats.total > 0 && (
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="bg-success"
                      style={{ width: `${(taskStats.completed / taskStats.total) * 100}%` }}
                    />
                    <div
                      className="bg-brand-500"
                      style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }}
                    />
                    <div
                      className="bg-warning"
                      style={{ width: `${(taskStats.pending / taskStats.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account status */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
              <h2 className="font-display text-base font-semibold text-ink-900">
                Account status
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
              Active — signed in and in good standing
            </div>
          </div>

          {/* Security tips */}
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
              <h2 className="font-display text-base font-semibold text-ink-900">
                Password tips
              </h2>
            </div>
            <ul className="space-y-2.5">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-ink-600">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-600/50" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}