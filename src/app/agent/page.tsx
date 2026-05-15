"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@/components/WalletProvider";
import { RequireWallet } from "@/components/RequireWallet";
import { WalletSetupBanner } from "@/components/WalletSetupBanner";
import { loadTasks } from "@/lib/store";
import type { Task } from "@/lib/types";

const HORIZON = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function PaymentHistory({ address }: { address: string }) {
  const [payments, setPayments] = useState<{ id: string; amount: string; from: string; date: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${HORIZON}/accounts/${address}/payments?limit=10&order=desc`)
      .then((r) => r.json())
      .then((data) => {
        const records = (data._embedded?.records || [])
          .filter((p: { type: string; asset_code?: string; asset_issuer?: string }) =>
            p.type === "payment" && p.asset_code === "USDC" && p.asset_issuer === USDC_ISSUER
          )
          .slice(0, 5)
          .map((p: { id: string; amount: string; from: string; created_at: string }) => ({
            id: p.id,
            amount: p.amount,
            from: p.from,
            date: new Date(p.created_at).toLocaleDateString(),
          }));
        setPayments(records);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [address]);

  return (
    <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <h3 className="text-sm font-semibold mb-3">Payment History</h3>
      {loading ? (
        <p className="text-xs text-zinc-500">Loading...</p>
      ) : payments.length === 0 ? (
        <p className="text-xs text-zinc-500">No USDC payments received yet.</p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-emerald-400">+{p.amount} USDC</span>
              <span className="text-zinc-600 font-mono">from {p.from.slice(0, 6)}...</span>
              <span className="text-zinc-600">{p.date}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentBoard() {
  const { walletAddress } = useWallet();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBoard = async () => {
    const all = await loadTasks();
    setTasks(all.filter((t) => t.status === "open" || t.status === "claimed" || t.status === "in_progress"));
    if (walletAddress) {
      setMyTasks(
        all.filter(
          (t) => t.agentAddress === walletAddress && (t.status === "in_progress" || t.status === "completed" || t.status === "paid")
        )
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBoard();
  }, [walletAddress]);

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      in_progress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      paid: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    };
    return map[s] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  };

  return (
    <RequireWallet>
      <WalletSetupBanner />
      <div className="max-w-5xl mx-auto px-4 py-12">

        {walletAddress ? (
          <PaymentHistory address={walletAddress} />
        ) : null}

        {myTasks.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">My Tasks</h2>
            <div className="space-y-2 mb-8">
              {myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/task/${task.id}?as=agent`}
                  className="block p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{task.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {task.milestones.filter((m) => m.status === "submitted" || m.status === "approved" || m.status === "released" || m.status === "paid").length}/{task.milestones.length} milestones done
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">{task.totalAmount} {task.asset}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor(task.status)}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

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
                    {task.status === "in_progress" ? (
                      <span className="text-xs px-4 py-2 rounded-lg bg-zinc-800 text-zinc-500 font-medium whitespace-nowrap cursor-not-allowed">
                        In Progress
                      </span>
                    ) : (
                      <Link
                        href={`/task/${task.id}?as=agent`}
                        className="text-xs px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors whitespace-nowrap"
                      >
                        Claim & Work
                      </Link>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
                      task.status === "in_progress" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {task.status.replace("_", " ")}
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
