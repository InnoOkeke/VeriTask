"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { RequireWallet } from "@/components/RequireWallet";
import { WalletSetupBanner } from "@/components/WalletSetupBanner";
import { loadTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    claimed: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    in_progress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    disputed: "bg-red-500/10 text-red-400 border-red-500/20",
    paid: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };
  return map[s] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
};

export default function EmployerDashboard() {
  const { walletAddress } = useWallet();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    const stored = loadTasks().filter((t) => t.employerAddress === walletAddress);
    setTasks(stored);
    setLoading(false);
  }, [walletAddress]);

  return (
    <RequireWallet>
      <WalletSetupBanner />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold">Employer Dashboard</h1>
            <p className="text-zinc-400 text-sm mt-1">Manage your AI workforce tasks</p>
          </div>
          <Link
            href="/employer/new"
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm transition-colors"
          >
            + New Task
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500 mb-4">No tasks yet. Create your first AI workforce task.</p>
            <Link
              href="/employer/new"
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm transition-colors inline-block"
            >
              Create Task
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/task/${task.id}`}
                className="block p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-violet-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{task.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-xs text-zinc-500">
                        {task.milestones.length} milestone{task.milestones.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {task.totalAmount} {task.asset}
                      </span>
                      {task.escrowContractId ? (
                        <span className="text-xs text-violet-400 font-mono">
                          {task.escrowContractId.slice(0, 10)}...
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border ${statusColor(task.status)} capitalize whitespace-nowrap`}
                  >
                    {task.status.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </RequireWallet>
  );
}
