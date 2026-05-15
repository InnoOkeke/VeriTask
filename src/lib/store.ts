import type { Task } from "./types";
import { getSupabase } from "./supabase";

const TASKS_KEY = "veritask_tasks";
const isClient = typeof window !== "undefined";

const hasSupabase = (): boolean =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function sb() {
  return getSupabase();
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    totalAmount: Number(row.total_amount),
    asset: (row.asset as string) || "USDC",
    status: row.status as Task["status"],
    milestones: (row.milestones as Task["milestones"]) || [],
    employerAddress: row.employer_address as string,
    agentAddress: (row.agent_address as string) || undefined,
    escrowContractId: (row.escrow_contract_id as string) || undefined,
    engagementId: row.engagement_id as string,
    createdAt: new Date(row.created_at as string),
  };
}

function taskToRow(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    total_amount: task.totalAmount,
    asset: task.asset,
    status: task.status,
    milestones: task.milestones,
    employer_address: task.employerAddress,
    agent_address: task.agentAddress || null,
    escrow_contract_id: task.escrowContractId || null,
    engagement_id: task.engagementId,
    created_at: task.createdAt.toISOString(),
  };
}

// --- localStorage fallback ---

function loadTasksLocal(): Task[] {
  if (!isClient) return [];
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveTasksLocal(tasks: Task[]): void {
  if (!isClient) return;
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// --- Public API (Supabase primary, localStorage fallback) ---

export async function loadTasks(): Promise<Task[]> {
  if (hasSupabase() && sb()) {
    const { data, error } = await sb()!.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Supabase loadTasks error:", error);
      return loadTasksLocal();
    }
    return (data || []).map(rowToTask);
  }
  return loadTasksLocal();
}

export async function getTask(id: string): Promise<Task | undefined> {
  if (hasSupabase() && sb()) {
    const { data, error } = await sb()!.from("tasks").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("Supabase getTask error:", error);
      return loadTasksLocal().find((t) => t.id === id);
    }
    return data ? rowToTask(data) : undefined;
  }
  return loadTasksLocal().find((t) => t.id === id);
}

export async function addTask(task: Task): Promise<void> {
  if (hasSupabase() && sb()) {
    const { error } = await sb()!.from("tasks").insert(taskToRow(task));
    if (error) {
      console.error("Supabase addTask error:", error);
      const tasks = loadTasksLocal();
      tasks.push(task);
      saveTasksLocal(tasks);
      return;
    }
    return;
  }
  const tasks = loadTasksLocal();
  tasks.push(task);
  saveTasksLocal(tasks);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  if (hasSupabase() && sb()) {
    const row: Record<string, unknown> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.totalAmount !== undefined) row.total_amount = updates.totalAmount;
    if (updates.asset !== undefined) row.asset = updates.asset;
    if (updates.status !== undefined) row.status = updates.status;
    if (updates.milestones !== undefined) row.milestones = updates.milestones;
    if (updates.agentAddress !== undefined) row.agent_address = updates.agentAddress;
    if (updates.escrowContractId !== undefined) row.escrow_contract_id = updates.escrowContractId;

    const { error } = await sb()!.from("tasks").update(row).eq("id", id);
    if (error) {
      console.error("Supabase updateTask error:", error);
    }
    return;
  }
  const tasks = loadTasksLocal();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    tasks[idx] = { ...tasks[idx], ...updates };
    saveTasksLocal(tasks);
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (hasSupabase() && sb()) {
    const { error } = await sb()!.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Supabase deleteTask error:", error);
    }
    return;
  }
  const tasks = loadTasksLocal();
  saveTasksLocal(tasks.filter((t) => t.id !== id));
}

export async function updateMilestone(
  taskId: string,
  milestoneId: string,
  updates: Partial<Task["milestones"][0]>
): Promise<void> {
  if (hasSupabase() && sb()) {
    const { data } = await sb()!.from("tasks").select("milestones").eq("id", taskId).maybeSingle();
    if (!data) return;
    const milestones = (data.milestones as Task["milestones"]) || [];
    const idx = milestones.findIndex((m) => m.id === milestoneId);
    if (idx !== -1) {
      milestones[idx] = { ...milestones[idx], ...updates };
      await sb()!.from("tasks").update({ milestones }).eq("id", taskId);
    }
    return;
  }
  const tasks = loadTasksLocal();
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    const msIdx = task.milestones.findIndex((m) => m.id === milestoneId);
    if (msIdx !== -1) {
      task.milestones[msIdx] = { ...task.milestones[msIdx], ...updates };
      saveTasksLocal(tasks);
    }
  }
}
