export type TaskStatus = "open" | "claimed" | "in_progress" | "completed" | "disputed" | "paid";

export type Role = "employer" | "agent";

export interface Milestone {
  id: string;
  description: string;
  amount: number;
  status: "pending" | "in_progress" | "submitted" | "approved" | "released" | "disputed" | "paid";
  evidence?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  totalAmount: number;
  asset: string;
  status: TaskStatus;
  milestones: Milestone[];
  employerAddress: string;
  agentAddress?: string;
  escrowContractId?: string;
  escrowData?: Record<string, unknown>;
  engagementId: string;
  createdAt: Date;
}
