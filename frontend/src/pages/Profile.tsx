import { type FormEvent, useState } from "react";
import axios from "axios";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink-900">Profile</h1>

      <div className="card mb-4 p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink-900">
          Account details
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-600">Name</dt>
            <dd className="font-medium text-ink-900">
              {user.first_name} {user.last_name}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Email</dt>
            <dd className="font-medium text-ink-900">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-600">Role</dt>
            <dd className="font-medium capitalize text-ink-900">{user.role}</dd>
          </div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink-900">
          Change password
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === "success"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
