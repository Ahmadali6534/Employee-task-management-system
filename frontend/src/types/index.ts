export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "employee";
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "Pending" | "In Progress" | "Completed";
export type TaskPriority = "Low" | "Medium" | "High";

export interface Task {
  id: number;
  assigned_to: number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string;
  created_at: string;
}

export interface TaskFile {
  id: number;
  task_id: number;
  original_file_name: string;
  stored_file_name: string;
  content_type: string;
  file_size: number;
  file_path: string;
  uploaded_by: number;
  created_at: string;
}

export interface DashboardStats {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  high_priority_tasks: number;
  medium_priority_tasks: number;
  low_priority_tasks: number;
}
