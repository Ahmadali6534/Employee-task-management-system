import { type FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  ListChecks,
  Users,
  BarChart3,
} from "lucide-react";
import logo from "../assets/logo.png";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          // Deliberately generic: the backend no longer distinguishes
          // "unknown email" from "wrong password" (that distinction let
          // an attacker enumerate valid employee emails), so the UI
          // shouldn't reconstruct it either.
          setError("Incorrect email or password.");
        } else if (err.response?.status === 429) {
          setError("Too many login attempts. Please wait a minute and try again.");
        } else {
          setError(err.response?.data?.detail ?? "Login failed. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Left brand panel — hidden on small screens */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-950 p-12 lg:flex">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-700/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex items-center gap-2.5">
          <img src={logo} alt="TaskBoard logo" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-display text-xl font-semibold text-white">TaskBoard</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight text-white">
            Manage your team&apos;s work, all in one place.
          </h2>
          <p className="mt-4 text-base text-white/70">
            Assign tasks, track progress, and keep everyone aligned — without the busywork.
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <ListChecks className="h-4 w-4 text-brand-300" strokeWidth={2} />
              </div>
              <p className="text-sm text-white/70">Stay on top of every task and deadline</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <Users className="h-4 w-4 text-brand-300" strokeWidth={2} />
              </div>
              <p className="text-sm text-white/70">Coordinate your whole team effortlessly</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                <BarChart3 className="h-4 w-4 text-brand-300" strokeWidth={2} />
              </div>
              <p className="text-sm text-white/70">See progress at a glance, in real time</p>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} TaskBoard. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile-only logo */}
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <img src={logo} alt="TaskBoard logo" className="h-10 w-10 rounded-lg object-contain" />
            <h1 className="font-display text-2xl font-semibold text-ink-900">TaskBoard</h1>
          </div>

          <div className="mb-8 hidden lg:block">
            <h1 className="font-display text-2xl font-semibold text-ink-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-ink-600">Sign in to your account to continue</p>
          </div>
          <div className="mb-8 text-center lg:hidden">
            <p className="text-sm text-ink-600">Sign in to manage your tasks</p>
          </div>

          <form onSubmit={handleSubmit} className="card space-y-4 p-6 sm:p-7">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600/50"
                  strokeWidth={2}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="input pl-9"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600/50"
                  strokeWidth={2}
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
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
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-600/70">
            Having trouble signing in? Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}