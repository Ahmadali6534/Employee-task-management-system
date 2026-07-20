import { type FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import api from "../api/axios";
import type { Task, TaskPriority, TaskStatus, User } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  Search,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Loader2,
} from "lucide-react";

const statusStyles: Record<TaskStatus, string> = {
  Pending: "bg-warning/10 text-warning",
  "In Progress": "bg-brand-50 text-brand-700",
  Completed: "bg-success/10 text-success",
};

const statusDotStyles: Record<TaskStatus, string> = {
  Pending: "bg-warning",
  "In Progress": "bg-brand-500",
  Completed: "bg-success",
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

function isOverdue(task: Task) {
  return task.status !== "Completed" && new Date(task.due_date).getTime() < Date.now();
}

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
    // Only blank the table on the very first load. Refetches (filter
    // changes, StrictMode's dev double-invoke, etc.) keep the current
    // rows on screen instead of collapsing to a spinner and back,
    // which is what was causing the visible "jump" on this page.
    setIsLoading((prev) => (tasks.length === 0 ? true : prev));
    setError(null);
    try {
      // The backend already scopes this endpoint to the current user's own
      // tasks when they're not an admin (see routers/tasks.py), and does
      // search/filter/sort/pagination server-side for both roles. So there's
      // no need for a separate "fetch everything, then filter/sort/paginate
      // in the browser" path for employees -- that used to re-download and
      // re-process an employee's *entire* task list on every keystroke.
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

  const isFirstSearch = useRef(true);
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
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

  const hasActiveFilters = Boolean(search || statusFilter || priorityFilter);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setPriorityFilter("");
    setPage(1);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Tasks</h1>
          <p className="mt-0.5 text-sm text-ink-600">
            {isAdmin ? "Manage and assign tasks across the team." : "Tasks assigned to you."}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-600/50"
            strokeWidth={2}
          />
          <input
            className="input pl-9"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-auto min-w-[150px]"
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
          className="input w-auto min-w-[150px]"
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
          className="input w-auto min-w-[150px]"
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
          {order === "asc" ? (
            <ArrowUp className="h-4 w-4" strokeWidth={2} />
          ) : (
            <ArrowDown className="h-4 w-4" strokeWidth={2} />
          )}
          {order === "asc" ? "Asc" : "Desc"}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
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
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-2 text-ink-600">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-500" strokeWidth={2} />
                      <span className="text-sm">Loading tasks…</span>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                        <ClipboardList className="h-5 w-5 text-ink-600/50" strokeWidth={1.75} />
                      </div>
                      <p className="text-sm font-medium text-ink-700">No tasks found</p>
                      <p className="text-xs text-ink-600">
                        {hasActiveFilters
                          ? "Try adjusting your search or filters."
                          : isAdmin
                          ? "Create a task to get started."
                          : "Nothing has been assigned to you yet."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((t) => {
                  const overdue = isOverdue(t);
                  return (
                    <tr key={t.id} className="group transition-colors hover:bg-surface">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusDotStyles[t.status]}`}
                          />
                          <span className="font-medium text-ink-900">{t.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${priorityStyles[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${statusStyles[t.status]}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center gap-1.5 ${
                            overdue ? "font-medium text-danger" : "text-ink-700"
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
                          {new Date(t.due_date).toLocaleDateString()}
                          {overdue && <span className="text-xs">· Overdue</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/tasks/${t.id}`}
                          className="text-sm font-medium text-brand-600 opacity-0 transition-opacity hover:underline group-hover:opacity-100 focus:opacity-100"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <button
          className="btn-secondary"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Previous
        </button>
        <span className="text-sm text-ink-600">Page {page}</span>
        <button
          className="btn-secondary"
          disabled={tasks.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Create modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">New Task</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      Creating…
                    </>
                  ) : (
                    "Create Task"
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