"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/components/WalletProvider";
import { RequireWallet } from "@/components/RequireWallet";
import { getTask, updateMilestone, updateTask } from "@/lib/store";
import { useEscrowService } from "@/lib/escrowService";
import { VerificationPanel } from "@/components/VerificationPanel";
import { DEMO_TASKS } from "@/lib/demo";

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    in_progress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    submitted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    released: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    paid: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    disputed: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return map[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { walletAddress } = useWallet();
  const { handleApproveMilestone, handleReleaseFunds, handleChangeMilestoneStatus } = useEscrowService();
  const [role, setRole] = useState<"employer" | "agent">("employer");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [, forceUpdate] = useState(0);

  const task = getTask(id) || DEMO_TASKS.find((t) => t.id === id);
  const refresh = () => forceUpdate((n) => n + 1);
  const addLog = useCallback((msg: string) => setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]), []);

  if (!task) {
    return (
      <RequireWallet>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-zinc-500 mb-4">Task not found.</p>
          <Link href="/employer" className="text-violet-400 hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </RequireWallet>
    );
  }

  const handleApprove = async (milestoneId: string, milestoneIndex: number) => {
    if (!walletAddress || !task.escrowContractId || busy) return;
    setBusy(true);
    addLog(`Approving milestone ${milestoneIndex + 1}...`);
    try {
      await handleApproveMilestone({
        contractId: task.escrowContractId,
        milestoneIndex: String(milestoneIndex),
        approver: walletAddress,
      });
      addLog("Milestone approved on-chain");
      updateMilestone(task.id, milestoneId, { status: "approved" });
      refresh();
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setBusy(false);
  };

  const handleRelease = async (milestoneId: string, milestoneIndex: number) => {
    if (!walletAddress || !task.escrowContractId || busy) return;
    setBusy(true);
    addLog(`Releasing payment for milestone ${milestoneIndex + 1}...`);
    try {
      await handleReleaseFunds({
        contractId: task.escrowContractId,
        milestoneIndex: String(milestoneIndex),
        releaseSigner: walletAddress,
      });
      addLog("Payment released on-chain");
      updateMilestone(task.id, milestoneId, { status: "released" });
      const t = getTask(id);
      if (t && t.milestones.every((m) => m.status === "released" || m.status === "paid")) {
        updateTask(task.id, { status: "paid" });
        updateMilestone(task.id, milestoneId, { status: "paid" });
      }
      refresh();
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setBusy(false);
  };

  const handleSubmitWork = async (milestoneId: string, milestoneIndex: number) => {
    if (!walletAddress || !task.escrowContractId || busy) return;
    setBusy(true);
    addLog(`Submitting work for milestone ${milestoneIndex + 1}...`);
    try {
      await handleChangeMilestoneStatus({
        contractId: task.escrowContractId,
        milestoneIndex: String(milestoneIndex),
        newStatus: "Submitted",
        serviceProvider: walletAddress,
      });
      addLog("Work submitted on-chain");
      updateMilestone(task.id, milestoneId, {
        status: "submitted",
        evidence: "AI-generated output delivered. Ready for review.",
      });
      if (task.status === "claimed" || task.status === "open") {
        updateTask(task.id, { status: "in_progress", agentAddress: walletAddress });
      }
      refresh();
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setBusy(false);
  };

  const completedCount = task.milestones.filter(
    (m) => m.status === "approved" || m.status === "released" || m.status === "paid"
  ).length;
  const progressPct = task.milestones.length > 0 ? Math.round((completedCount / task.milestones.length) * 100) : 0;

  return (
    <RequireWallet>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-white transition-colors">
            ← Back
          </button>
          <div className="flex items-center gap-2 bg-zinc-900 rounded-lg border border-zinc-800 p-1">
            {(["employer", "agent"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`text-xs px-3 py-1.5 rounded-md capitalize transition-colors ${
                  role === r ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                View as {r}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl font-bold mb-2">{task.title}</h1>
              <p className="text-sm text-zinc-400">{task.description}</p>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border capitalize whitespace-nowrap ${
                task.status === "paid"
                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                  : task.status === "disputed"
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}
            >
              {task.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm mb-4">
            <span className="text-zinc-500">{task.totalAmount} {task.asset}</span>
            <span className="text-zinc-500">{task.milestones.length} milestones</span>
            {task.escrowContractId ? (
              <span className="text-xs text-violet-400 font-mono">Escrow: {task.escrowContractId.slice(0, 14)}...</span>
            ) : null}
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>Milestone Progress</span>
              <span>{completedCount}/{task.milestones.length} ({progressPct}%)</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {task.escrowContractId ? (
          <div className="p-4 rounded-xl border border-violet-500/10 bg-violet-500/5 mb-8">
            <div className="flex items-center gap-2 text-sm text-violet-300 mb-1">
              <span>🔒</span>
              <span className="font-medium">Escrow Active on Stellar Testnet</span>
            </div>
            <p className="text-xs text-violet-400/70">
              Funds locked in Trustless Work multi-release escrow. Payments release only on milestone approval.
            </p>
          </div>
        ) : null}

        <h2 className="text-lg font-semibold mb-4">Milestones</h2>
        <div className="space-y-3">
          {task.milestones.map((m, i) => (
            <div
              key={m.id}
              className={`p-5 rounded-xl border transition-all ${
                m.status === "approved" || m.status === "released" || m.status === "paid"
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : m.status === "submitted"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : m.status === "disputed"
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-zinc-600">#{i + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusBadge(m.status)}`}>
                      {m.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{m.description}</p>
                  <p className="text-xs text-zinc-500 mt-1">{m.amount} {task.asset}</p>
                  {m.evidence ? (
                    <div className="mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <p className="text-xs text-zinc-500 mb-1">Evidence</p>
                      <p className="text-sm text-zinc-400">{m.evidence}</p>
                    </div>
                  ) : null}

                  {role === "employer" && m.status === "submitted" ? (
                    <VerificationPanel
                      milestoneDescription={m.description}
                      evidence={m.evidence}
                      taskId={task.id}
                      milestoneIndex={i}
                      onVerified={() => { updateMilestone(task.id, m.id, { status: "approved" }); refresh(); }}
                      disabled={busy}
                    />
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {role === "agent" ? (
                    <>
                      {m.status === "pending" && task.escrowContractId ? (
                        <button
                          onClick={() => handleSubmitWork(m.id, i)}
                          disabled={busy}
                          className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          Submit Deliverable
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {role === "employer" ? (
                    <>
                      {m.status === "approved" && task.escrowContractId ? (
                        <button
                          onClick={() => handleRelease(m.id, i)}
                          disabled={busy}
                          className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          Release Payment
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {(m.status === "released" || m.status === "paid") ? (
                    <span className="text-xs text-emerald-400">✓ Paid</span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {task.status === "paid" ? (
          <div className="mt-8 p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center">
            <p className="text-lg font-semibold text-emerald-400 mb-1">All Milestones Complete</p>
            <p className="text-sm text-zinc-500">{task.totalAmount} {task.asset} paid out via Trustless Work escrow on Stellar.</p>
          </div>
        ) : null}

        {log.length > 0 ? (
          <div className="mt-6 p-4 rounded-xl border border-zinc-800 bg-zinc-950">
            <p className="text-xs text-zinc-500 mb-2">Transaction Log</p>
            {log.map((l, i) => (
              <p key={i} className="text-xs text-zinc-400 font-mono leading-relaxed">{l}</p>
            ))}
          </div>
        ) : null}
      </div>
    </RequireWallet>
  );
}
