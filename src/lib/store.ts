import type { Task } from "./types";

const TASKS_KEY = "veritask_tasks";
const isClient = typeof window !== "undefined";

export function loadTasks(): Task[] {
  if (!isClient) return [];
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  if (!isClient) return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function getTask(id: string): Task | undefined {
  return loadTasks().find((t) => t.id === id);
}

export function addTask(task: Task): void {
  const tasks = loadTasks();
  tasks.push(task);
  saveTasks(tasks);
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const tasks = loadTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates };
    saveTasks(tasks);
  }
}

export function updateMilestone(
  taskId: string,
  milestoneId: string,
  updates: Partial<Task["milestones"][0]>
): void {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    const msIdx = task.milestones.findIndex((m) => m.id === milestoneId);
    if (msIdx !== -1) {
      task.milestones[msIdx] = { ...task.milestones[msIdx], ...updates };
      saveTasks(tasks);
    }
  }
}
