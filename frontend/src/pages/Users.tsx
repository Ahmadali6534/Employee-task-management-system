import { type FormEvent, useEffect, useState } from "react";
import axios from "axios";
import api from "../api/axios";
import type { User } from "../types";

interface UserFormState {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: "admin" | "employee";
}

const emptyForm: UserFormState = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "employee",
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchUsers() {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<User[]>("/users/");
      setUsers(data);
    } catch {
      setError("Could not load users.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function openCreateModal() {
    setEditingUser(null);
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(u: User) {
    setEditingUser(u);
    setForm({
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      password: "",
      role: u.role,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingUser(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      setFormError("First name, last name, and email are required.");
      return;
    }
    if (!editingUser && form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (editingUser && form.password && form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editingUser.id}`, payload);
      } else {
        await api.post("/users/", form);
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.detail ?? "Could not save user.");
      } else {
        setFormError("Could not save user.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(u: User) {
    if (!confirm(`Delete ${u.first_name} ${u.last_name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      fetchUsers();
    } catch {
      alert("Could not delete user.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Users</h1>
          <p className="text-sm text-ink-600">Manage admin and employee accounts.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          + New User
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-ink-600">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-600">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-600">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        u.role === "admin"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-line text-ink-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="mr-3 text-sm font-medium text-brand-600 hover:underline"
                      onClick={() => openEditModal(u)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm font-medium text-danger hover:underline"
                      onClick={() => handleDelete(u)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">
              {editingUser ? "Edit User" : "New User"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First name</label>
                  <input
                    className="input"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="label">Last name</label>
                  <input
                    className="input"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="label">
                  Password {editingUser && <span className="text-ink-600">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as "admin" | "employee" })
                  }
                  disabled={isSubmitting}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
