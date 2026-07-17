import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import type { Task, TaskFile, TaskStatus } from "../types";
import { useAuth } from "../context/AuthContext";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    return <p className="text-sm text-ink-600">Loading task…</p>;
  }

  if (error || !task) {
    return (
      <div>
        <p className="mb-4 text-sm text-danger">{error ?? "Task not found."}</p>
        <Link to="/tasks" className="text-sm font-medium text-brand-600 hover:underline">
          ← Back to tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link to="/tasks" className="mb-4 inline-block text-sm font-medium text-brand-600 hover:underline">
        ← Back to tasks
      </Link>

      <div className="card p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink-900">{task.title}</h1>
            <p className="mt-1 text-sm text-ink-600">
              Due {new Date(task.due_date).toLocaleDateString()} · Priority {task.priority}
            </p>
          </div>
          {isAdmin && (
            <div className="flex shrink-0 gap-2">
              <button className="btn-secondary" onClick={openEditModal}>
                Edit Task
              </button>
              <button className="btn-danger" onClick={handleDeleteTask}>
                Delete Task
              </button>
            </div>
          )}
        </div>

        {task.description && (
          <p className="mb-5 whitespace-pre-wrap text-sm text-ink-700">{task.description}</p>
        )}

        <div className="mb-2">
          <label className="label">Status</label>
          <div className="flex gap-2">
            {(["Pending", "In Progress", "Completed"] as TaskStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isUpdatingStatus || task.status === status}
                className={`btn ${
                  task.status === status
                    ? "bg-brand-500 text-white"
                    : "bg-white text-ink-700 border border-line hover:bg-surface"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-4 p-6">
        <h2 className="mb-3 font-display text-base font-semibold text-ink-900">Attachments</h2>

        {uploadError && (
          <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {uploadError}
          </div>
        )}

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600"
          />
          <p className="mt-1 text-xs text-ink-600">
            PDF, DOCX, XLSX, PNG, JPG, TXT — max 10 MB.
          </p>
        </div>

        {files.length === 0 ? (
          <p className="text-sm text-ink-600">No attachments yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {f.original_file_name}
                  </p>
                  <p className="text-xs text-ink-600">{formatBytes(f.file_size)}</p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    className="text-sm font-medium text-brand-600 hover:underline"
                    onClick={() => handleDownload(f)}
                  >
                    Download
                  </button>
                  <button
                    className="text-sm font-medium text-danger hover:underline"
                    onClick={() => handleDeleteFile(f)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink-900">Edit Task</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
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
                  {isSavingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
