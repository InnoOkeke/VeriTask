"use client";

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

interface BoundlessProofRequest {
  program: string;
  inputs: {
    output: string;
    requirements: {
      description: string;
      minLength?: number;
      expectedFormat?: string;
      keywords?: string[];
    };
    taskId?: string;
    milestoneIndex?: number;
  };
}

interface BoundlessProofResult extends VerifyResponse {}

interface BoundlessConfig {
  network: "testnet" | "mainnet";
}

export class BoundlessClient {
  private network: string;

  constructor(config: BoundlessConfig) {
    this.network = config.network;
  }

  async requestProof(request: BoundlessProofRequest): Promise<BoundlessProofResult> {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        output: request.inputs.output,
        requirements: request.inputs.requirements,
        taskId: request.inputs.taskId || null,
        milestoneIndex: request.inputs.milestoneIndex ?? null,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Proof request failed");
    }

    return response.json();
  }
}
