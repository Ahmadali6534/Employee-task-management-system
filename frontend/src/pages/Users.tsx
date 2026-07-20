import { type FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import api from "../api/axios";
import type { User } from "../types";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Mail,
  X,
  AlertCircle,
  Users as UsersIcon,
  ShieldCheck,
  Loader2,
} from "lucide-react";

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

function initialsOf(u: User) {
  return `${u.first_name[0] ?? ""}${u.last_name[0] ?? ""}`.toUpperCase();
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "admin" | "employee">("");

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

  const filteredUsers = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, search, roleFilter]);

  const adminCount = users.filter((u) => u.role === "admin").length;

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

  const hasActiveFilters = Boolean(search || roleFilter);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Users</h1>
          <p className="mt-0.5 text-sm text-ink-600">Manage admin and employee accounts.</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          New User
        </button>
      </div>

      {/* Summary chips */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
            <UsersIcon className="h-4 w-4 text-brand-600" strokeWidth={2} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none text-ink-900">
              {users.length}
            </p>
            <p className="text-xs text-ink-600">Total users</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
            <ShieldCheck className="h-4 w-4 text-warning" strokeWidth={2} />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none text-ink-900">
              {adminCount}
            </p>
            <p className="text-xs text-ink-600">Admins</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600/50"
            strokeWidth={2}
          />
          <input
            className="input pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto min-w-[150px]"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "" | "admin" | "employee")}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setRoleFilter("");
            }}
            className="flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-ink-900"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-ink-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-2 text-ink-600">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-500" strokeWidth={2} />
                      <span className="text-sm">Loading users…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                        <UsersIcon className="h-5 w-5 text-ink-600/50" strokeWidth={1.75} />
                      </div>
                      <p className="text-sm font-medium text-ink-700">No users found</p>
                      <p className="text-xs text-ink-600">
                        {hasActiveFilters
                          ? "Try adjusting your search or filters."
                          : "Add a user to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="group transition-colors hover:bg-surface">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
                          {initialsOf(u)}
                        </div>
                        <span className="font-medium text-ink-900">
                          {u.first_name} {u.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-ink-600/50" strokeWidth={2} />
                        {u.email}
                      </span>
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"
                          onClick={() => openEditModal(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-danger hover:bg-danger/10"
                          onClick={() => handleDelete(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">
                {editingUser ? "Edit User" : "New User"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-ink-600 hover:bg-surface hover:text-ink-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
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
                  Password{" "}
                  {editingUser && (
                    <span className="text-ink-600">(leave blank to keep unchanged)</span>
                  )}
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
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      Saving…
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}