"use client";

import { useState } from "react";

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
  score?: number;
}

interface VerifyResponse {
  verified: boolean;
  proofHash: string;
  proofType: string;
  timestamp: string;
  checks: CheckResult[];
  metadata: {
    taskId: string | null;
    milestoneIndex: number | null;
    outputLength: number;
    requirements: unknown;
  };
}

interface Props {
  milestoneDescription: string;
  evidence?: string;
  taskId: string;
  milestoneIndex: number;
  onVerified: (proofHash: string) => void;
  disabled?: boolean;
}

export function VerificationPanel({
  milestoneDescription,
  evidence,
  taskId,
  milestoneIndex,
  onVerified,
  disabled,
}: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);

  const runVerification = async () => {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const keywords = milestoneDescription
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 5);

      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          output: evidence || "",
          requirements: {
            description: milestoneDescription,
            minLength: 50,
            expectedFormat: "text",
            keywords,
          },
          taskId,
          milestoneIndex,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Verification request failed");
      }

      const data: VerifyResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification error");
    }

    setRunning(false);
  };

  const allPassed = result?.verified;
  const passedCount = result?.checks.filter((c) => c.passed).length || 0;
  const totalCount = result?.checks.length || 0;

  return (
    <div className="mt-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">🔍</span>
        <h4 className="text-sm font-semibold text-cyan-300">Boundless Verification</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
          ZK PROOF
        </span>
      </div>

      <p className="text-xs text-zinc-500 mb-3 truncate">{milestoneDescription}</p>

      {!result && !running && (
        <button
          onClick={runVerification}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50"
        >
          Run Verification
        </button>
      )}

      {running && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            Running Boundless verification checks...
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div>
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span>Checks</span>
            <span>{passedCount}/{totalCount} passed</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ${allPassed ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${(passedCount / totalCount) * 100}%` }}
            />
          </div>

          {/* Checks */}
          <div className="space-y-1 mb-3">
            {result.checks.map((c, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs ${c.passed ? "text-emerald-400" : "text-red-400"}`}
              >
                <span>{c.passed ? "✅" : "❌"}</span>
                <span className="font-medium">{c.name}:</span>
                <span className="text-zinc-500">{c.detail}</span>
                {c.score !== undefined && (
                  <span className="text-zinc-600 ml-auto">
                    {Math.round(c.score * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Proof hash */}
          <div className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-800 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500 font-mono">PROOF HASH</span>
              <span className="text-[10px] text-zinc-600 font-mono">{result.proofType}</span>
            </div>
            <p className="text-[10px] text-cyan-400 font-mono break-all leading-relaxed">
              {result.proofHash}
            </p>
          </div>

          {/* Result action */}
          {allPassed ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-400">
                  ✅ All {totalCount} checks passed. Proof verified.
                </p>
              </div>
              <button
                onClick={() => onVerified(result.proofHash)}
                disabled={disabled}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap disabled:opacity-50"
              >
                Approve & Release
              </button>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">
                ❌ {totalCount - passedCount} check(s) failed. Output does not meet requirements.
              </p>
              <button
                onClick={runVerification}
                disabled={disabled}
                className="mt-2 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Retry Verification
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
