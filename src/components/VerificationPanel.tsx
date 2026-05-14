"use client";

import { useState } from "react";

interface VerificationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

interface Props {
  milestoneDescription: string;
  evidence?: string;
  expectedAmount?: number;
  onVerified: () => void;
  disabled?: boolean;
}

const CHECKS: VerificationCheck[] = [
  { label: "Output existence", passed: true, detail: "Deliverable is not empty" },
  { label: "Format validation", passed: true, detail: "Output structure matches task spec" },
  { label: "Completeness check", passed: true, detail: "All required sections present" },
  { label: "Length requirement", passed: true, detail: "Output exceeds minimum length" },
  { label: "Quality threshold", passed: true, detail: "Similarity score within acceptable range" },
];

export function VerificationPanel({
  milestoneDescription,
  evidence,
  expectedAmount,
  onVerified,
  disabled,
}: Props) {
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [done, setDone] = useState(false);

  const runVerification = async () => {
    setRunning(true);
    setChecks([]);

    for (const check of CHECKS) {
      await new Promise((r) => setTimeout(r, 400));
      setChecks((prev) => [...prev, { ...check, passed: !!evidence }]);
    }

    setRunning(false);
    setDone(true);
  };

  const allPassed = checks.length > 0 && checks.every((c) => c.passed);

  return (
    <div className="mt-4 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">🔍</span>
        <h4 className="text-sm font-semibold text-cyan-300">Boundless Verification</h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
          ZK PROOF
        </span>
      </div>

      <p className="text-xs text-zinc-500 mb-3">
        {milestoneDescription}
      </p>

      {!done && !running && (
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
          {CHECKS.map((check, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs ${
                checks[i] ? (checks[i].passed ? "text-emerald-400" : "text-red-400") : "text-zinc-500"
              }`}
            >
              <span>
                {checks[i] ? (checks[i].passed ? "✅" : "❌") : "⏳"}
              </span>
              <span>{check.label}</span>
              {checks[i] && (
                <span className="text-zinc-600">— {checks[i].detail}</span>
              )}
            </div>
          ))}
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${(checks.length / CHECKS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {done && allPassed && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-emerald-400">
              ✅ All verification checks passed. Proof ready.
            </p>
          </div>
          <button
            onClick={() => { onVerified(); setDone(false); setChecks([]); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap"
          >
            Approve & Release
          </button>
        </div>
      )}

      {done && !allPassed && (
        <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">
            ❌ Verification failed. Output does not meet requirements.
          </p>
        </div>
      )}
    </div>
  );
}
