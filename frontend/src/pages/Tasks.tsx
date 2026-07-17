import { type FormEvent, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import api from "../api/axios";
import type { Task, TaskPriority, TaskStatus, User } from "../types";
import { useAuth } from "../context/AuthContext";

const statusStyles: Record<TaskStatus, string> = {
  Pending: "bg-warning/10 text-warning",
  "In Progress": "bg-brand-50 text-brand-700",
  Completed: "bg-success/10 text-success",
};

const priorityStyles: Record<TaskPriority, string> = {
  Low: "bg-line text-ink-700",
  Medium: "bg-warning/10 text-warning",
  High: "bg-danger/10 text-danger",
};

const PAGE_SIZE = 10;

interface TaskFormState {
  assigned_to: string;
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: string;
}

const emptyForm: TaskFormState = {
  assigned_to: "",
  title: "",
  description: "",
  priority: "Medium",
  due_date: "",
};

export default function Tasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TaskFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchTasks() {
    setIsLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        // Admins see every task; backend does search/filter/sort/pagination.
        const { data } = await api.get<Task[]>("/tasks/", {
          params: {
            page,
            limit: PAGE_SIZE,
            search: search || undefined,
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
            sort_by: sortBy,
            order,
          },
        });
        setTasks(data);
      } else {
        // Employees may only see tasks assigned to them (SRS role rule).
        // /tasks/my-tasks has no query params, so filter/sort/paginate client-side.
        const { data } = await api.get<Task[]>("/tasks/my-tasks");

        let filtered = data;
        if (search) {
          const q = search.toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              (t.description ?? "").toLowerCase().includes(q)
          );
        }
        if (statusFilter) filtered = filtered.filter((t) => t.status === statusFilter);
        if (priorityFilter) filtered = filtered.filter((t) => t.priority === priorityFilter);

        filtered = [...filtered].sort((a, b) => {
          const key = sortBy as keyof Task;
          const av = a[key] ?? "";
          const bv = b[key] ?? "";
          if (av < bv) return order === "asc" ? -1 : 1;
          if (av > bv) return order === "asc" ? 1 : -1;
          return 0;
        });

        const start = (page - 1) * PAGE_SIZE;
        setTasks(filtered.slice(start, start + PAGE_SIZE));
      }
    } catch {
      setError("Could not load tasks.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, priorityFilter, sortBy, order, isAdmin]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      fetchTasks();
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get<User[]>("/users/")
      .then(({ data }) => setUsers(data.filter((u) => !u.is_deleted)))
      .catch(() => undefined);
  }, [isAdmin]);

  function openCreateModal() {
    setForm(emptyForm);
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.title.trim() || !form.assigned_to || !form.due_date) {
      setFormError("Title, assignee, and due date are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/tasks/", {
        assigned_to: Number(form.assigned_to),
        title: form.title,
        description: form.description || undefined,
        priority: form.priority,
        due_date: new Date(form.due_date).toISOString(),
      });
      setIsModalOpen(false);
      fetchTasks();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setFormError(err.response?.data?.detail ?? "Could not create task.");
      } else {
        setFormError("Could not create task.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Tasks</h1>
          <p className="text-sm text-ink-600">
            {isAdmin ? "Manage and assign tasks across the team." : "Tasks assigned to you."}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openCreateModal}>
            + New Task
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[160px]"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <select
          className="input max-w-[160px]"
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <select
          className="input max-w-[160px]"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
          }}
        >
          <option value="created_at">Sort: Created</option>
          <option value="due_date">Sort: Due Date</option>
          <option value="title">Sort: Title</option>
          <option value="priority">Sort: Priority</option>
        </select>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          title="Toggle sort order"
        >
          {order === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-ink-600">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-600">
                  Loading tasks…
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-600">
                  No tasks found.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.id} className="hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink-900">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${priorityStyles[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusStyles[t.status]}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-700">
                    {new Date(t.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/tasks/${t.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          className="btn-secondary"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="text-sm text-ink-600">Page {page}</span>
        <button
          className="btn-secondary"
          disabled={tasks.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">New Task</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {formError}
                </div>
              )}

              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="label">Assign to</label>
                <select
                  className="input"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  disabled={isSubmitting}
                >
                  <option value="">Select employee</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Priority</label>
                  <select
                    className="input"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value as TaskPriority })
                    }
                    disabled={isSubmitting}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="label">Due date</label>
                  <input
                    type="date"
                    className="input"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Creating…" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
