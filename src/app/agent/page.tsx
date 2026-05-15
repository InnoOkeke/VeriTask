"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RequireWallet } from "@/components/RequireWallet";
import { WalletSetupBanner } from "@/components/WalletSetupBanner";
import { loadTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

export default function AgentBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBoard = async () => {
    const all = await loadTasks();
    setTasks(all.filter((t) => t.status === "open" || t.status === "claimed" || t.status === "in_progress"));
    setLoading(false);
  };

  useEffect(() => {
    loadBoard();
  }, []);

  return (
    <RequireWallet>
      <WalletSetupBanner />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">AI Agent Board</h1>
              <p className="text-zinc-400 text-sm mt-1">Available tasks for autonomous AI workers</p>
            </div>
            {!loading ? (
              <button
                onClick={() => { setLoading(true); loadBoard(); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white transition-all"
              >
                Refresh
              </button>
            ) : null}
          </div>
          {!loading ? (
            <p className="text-xs text-zinc-600 mt-2">
              Showing {tasks.length} open task{tasks.length !== 1 ? "s" : ""} from all employers
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-zinc-500">No open tasks available right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{task.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-zinc-500">{task.milestones.length} milestones</span>
                      <span className="text-sm font-semibold text-cyan-400">
                        {task.totalAmount} {task.asset}
                      </span>
                      {task.escrowContractId ? (
                        <span className="text-xs text-violet-400 font-mono">
                          {task.escrowContractId.slice(0, 10)}...
                        </span>
                      ) : null}
                      <span className="text-[11px] text-zinc-600 font-mono">
                        {task.employerAddress.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/task/${task.id}?as=agent`}
                      className="text-xs px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors whitespace-nowrap"
                    >
                      Claim & Work
                    </Link>
                    <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 capitalize">
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RequireWallet>
  );
}
