import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import type { Task, TaskFile, TaskStatus, User } from "../types";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Flag,
  Paperclip,
  Download,
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Circle,
  CircleDot,
  CheckCircle2,
  UserRound,
  Clock,
  Hash,
  Info,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const priorityStyles: Record<Task["priority"], string> = {
  Low: "bg-line text-ink-700",
  Medium: "bg-warning/10 text-warning",
  High: "bg-danger/10 text-danger",
};

const statusIcons: Record<TaskStatus, typeof Circle> = {
  Pending: Circle,
  "In Progress": CircleDot,
  Completed: CheckCircle2,
};

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignee, setAssignee] = useState<User | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "Medium" as Task["priority"],
    due_date: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  async function fetchTask() {
    setIsLoading(true);
    setError(null);
    try {
      const [{ data: taskData }, { data: fileData }] = await Promise.all([
        api.get<Task>(`/tasks/${taskId}`),
        api.get<TaskFile[]>(`/tasks/${taskId}/files`),
      ]);
      setTask(taskData);
      setFiles(fileData);
    } catch {
      setError("Could not load this task.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (!task) return;
    if (task.assigned_to === user?.id) {
      setAssignee(user);
      return;
    }
    if (!isAdmin) return;
    api
      .get<User[]>("/users/")
      .then(({ data }) => setAssignee(data.find((u) => u.id === task.assigned_to) ?? null))
      .catch(() => setAssignee(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.assigned_to]);

  async function handleStatusChange(status: TaskStatus) {
    if (!task) return;
    setIsUpdatingStatus(true);
    try {
      const { data } = await api.patch<Task>(`/tasks/${task.id}/status`, { status });
      setTask(data);
    } catch {
      alert("Could not update task status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  function openEditModal() {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      due_date: task.due_date.slice(0, 10),
    });
    setEditError(null);
    setIsEditModalOpen(true);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!task) return;
    setEditError(null);

    if (!editForm.title.trim() || !editForm.due_date) {
      setEditError("Title and due date are required.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const { data } = await api.put<Task>(`/tasks/${task.id}`, {
        title: editForm.title,
        description: editForm.description || null,
        priority: editForm.priority,
        due_date: new Date(editForm.due_date).toISOString(),
      });
      setTask(data);
      setIsEditModalOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setEditError(err.response?.data?.detail ?? "Could not update task.");
      } else {
        setEditError("Could not update task.");
      }
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteTask() {
    if (!task) return;
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      navigate("/tasks", { replace: true });
    } catch {
      alert("Could not delete task.");
    }
  }

  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds the 10 MB limit.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/tasks/${task.id}/files`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { data } = await api.get<TaskFile[]>(`/tasks/${task.id}/files`);
      setFiles(data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setUploadError(err.response?.data?.detail ?? "Upload failed.");
      } else {
        setUploadError("Upload failed.");
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDownload(f: TaskFile) {
    try {
      const response = await api.get(`/files/${f.id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = f.original_file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Could not download file.");
    }
  }

  async function handleDeleteFile(f: TaskFile) {
    if (!confirm(`Delete ${f.original_file_name}?`)) return;
    try {
      await api.delete(`/files/${f.id}`);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
    } catch {
      alert("Could not delete file.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-ink-600">
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" strokeWidth={2} />
        Loading task…
      </div>
    );
  }

  if (error || !task) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
          {error ?? "Task not found."}
        </div>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back to tasks
        </Link>
      </div>
    );
  }

  const overdue = task.status !== "Completed" && new Date(task.due_date).getTime() < Date.now();

  return (
    <div>
      <Link
        to="/tasks"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to tasks
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
      <div className="card p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold text-ink-900">{task.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`flex items-center gap-1.5 text-sm ${
                  overdue ? "font-medium text-danger" : "text-ink-600"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
                Due {new Date(task.due_date).toLocaleDateString()}
                {overdue && <span className="text-xs">· Overdue</span>}
              </span>
              <span className="text-ink-600/40">·</span>
              <span className={`badge ${priorityStyles[task.priority]}`}>
                <Flag className="mr-1 h-3 w-3" strokeWidth={2.5} />
                {task.priority}
              </span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 gap-2">
              <button className="btn-secondary" onClick={openEditModal}>
                <Pencil className="h-4 w-4" strokeWidth={2} />
                Edit
              </button>
              <button className="btn-danger" onClick={handleDeleteTask}>
                <Trash2 className="h-4 w-4" strokeWidth={2} />
                Delete
              </button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="mb-5 whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm text-ink-700">
            {task.description}
          </p>
        )}

        <div>
          <label className="label">Status</label>
          <div className="flex flex-wrap gap-2">
            {(["Pending", "In Progress", "Completed"] as TaskStatus[]).map((status) => {
              const Icon = statusIcons[status];
              const active = task.status === status;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isUpdatingStatus || active}
                  className={`btn ${
                    active
                      ? "bg-brand-500 text-white"
                      : "bg-white text-ink-700 border border-line hover:bg-surface"
                  }`}
                >
                  {isUpdatingStatus && active ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  )}
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-3 flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
          <h2 className="font-display text-base font-semibold text-ink-900">
            Attachments {files.length > 0 && <span className="text-ink-600">({files.length})</span>}
          </h2>
        </div>

        {uploadError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
            {uploadError}
          </div>
        )}

        <label
          htmlFor="task-file-upload"
          className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-6 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40"
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" strokeWidth={2} />
          ) : (
            <UploadCloud className="h-6 w-6 text-ink-600/50" strokeWidth={1.75} />
          )}
          <p className="text-sm font-medium text-ink-900">
            {isUploading ? "Uploading…" : "Click to upload a file"}
          </p>
          <p className="text-xs text-ink-600">PDF, DOCX, XLSX, PNG, JPG, TXT — max 10 MB.</p>
          <input
            id="task-file-upload"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />
        </label>

        {files.length === 0 ? (
          <p className="text-center text-sm text-ink-600">No attachments yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface">
                    <FileText className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {f.original_file_name}
                    </p>
                    <p className="text-xs text-ink-600">{formatBytes(f.file_size)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50"
                    onClick={() => handleDownload(f)}
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={2} />
                    Download
                  </button>
                  <button
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-danger hover:bg-danger/10"
                    onClick={() => handleDeleteFile(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
            <h2 className="font-display text-base font-semibold text-ink-900">Task info</h2>
          </div>
          <dl className="divide-y divide-line text-sm">
            <div className="flex items-center justify-between py-2.5 first:pt-0">
              <dt className="flex items-center gap-2 text-ink-600">
                <UserRound className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                Assigned to
              </dt>
              <dd className="font-medium text-ink-900">
                {assignee ? `${assignee.first_name} ${assignee.last_name}` : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 text-ink-600">
                <Flag className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                Priority
              </dt>
              <dd>
                <span className={`badge ${priorityStyles[task.priority]}`}>{task.priority}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="flex items-center gap-2 text-ink-600">
                <Clock className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                Created
              </dt>
              <dd className="font-medium text-ink-900">
                {new Date(task.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5 last:pb-0">
              <dt className="flex items-center gap-2 text-ink-600">
                <Hash className="h-4 w-4 text-ink-600/60" strokeWidth={2} />
                Task ID
              </dt>
              <dd className="font-medium text-ink-900">#{task.id}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-ink-900">Timeline</h2>
          <div className="space-y-0">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <span className="w-px flex-1 bg-line" />
              </div>
              <div className="pb-6">
                <p className="text-sm font-medium text-ink-900">Task created</p>
                <p className="text-xs text-ink-600">
                  {new Date(task.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  overdue ? "bg-danger" : "bg-brand-500"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-900">
                  {overdue ? "Was due" : "Due"}
                </p>
                <p className={`text-xs ${overdue ? "text-danger" : "text-ink-600"}`}>
                  {new Date(task.due_date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink-900">Edit Task</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-md p-1 text-ink-600 hover:bg-surface hover:text-ink-900"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {editError}
                </div>
              )}

              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  disabled={isSavingEdit}
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  disabled={isSavingEdit}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Priority</label>
                  <select
                    className="input"
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        priority: e.target.value as Task["priority"],
                      })
                    }
                    disabled={isSavingEdit}
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
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    disabled={isSavingEdit}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingEdit}>
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      Saving…
                    </>
                  ) : (
                    "Save Changes"
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