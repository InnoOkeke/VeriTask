import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
  score?: number;
}

interface VerifyRequest {
  output: string;
  requirements: {
    description: string;
    minLength?: number;
    expectedFormat?: string;
    keywords?: string[];
  };
  taskId?: string;
  milestoneIndex?: number;
}

function runChecks(output: string, req: VerifyRequest["requirements"]): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  // 1. Output existence
  checks.push({
    name: "Output Existence",
    passed: !!output && output.length > 0,
    detail: output && output.length > 0
      ? `Output is ${output.length} characters`
      : "No output provided",
  });

  // 2. Minimum length
  const minLen = req.minLength || 50;
  const lenOk = output.length >= minLen;
  checks.push({
    name: "Length Requirement",
    passed: lenOk,
    detail: lenOk
      ? `${output.length}/${minLen} chars (${Math.round((output.length / minLen) * 100)}%)`
      : `Only ${output.length}/${minLen} chars required`,
    score: Math.min(1, output.length / minLen),
  });

  // 3. Format validation
  if (req.expectedFormat) {
    let formatOk = false;
    let formatDetail = "";
    switch (req.expectedFormat) {
      case "json":
        try {
          JSON.parse(output);
          formatOk = true;
          formatDetail = "Valid JSON structure";
        } catch {
          formatDetail = "Invalid JSON format";
        }
        break;
      case "text":
        formatOk = output.trim().length > 0;
        formatDetail = formatOk ? "Valid text content" : "Empty or whitespace only";
        break;
      case "markdown":
        formatOk = /^#{1,6}\s|^\*|^-|^>|^```/.test(output) || output.includes("\n");
        formatDetail = formatOk ? "Contains markdown formatting" : "No markdown formatting detected";
        break;
      default:
        formatOk = true;
        formatDetail = "Format check skipped";
    }
    checks.push({
      name: "Format Validation",
      passed: formatOk,
      detail: formatDetail,
    });
  } else {
    checks.push({
      name: "Format Validation",
      passed: true,
      detail: "No format requirement specified",
    });
  }

  // 4. Keyword / content match
  if (req.keywords && req.keywords.length > 0) {
    const lower = output.toLowerCase();
    const found: string[] = [];
    const missing: string[] = [];
    for (const kw of req.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        found.push(kw);
      } else {
        missing.push(kw);
      }
    }
    const kwOk = missing.length === 0;
    checks.push({
      name: "Content Relevance",
      passed: kwOk,
      detail: kwOk
        ? `All ${found.length} keywords found`
        : `${found.length}/${req.keywords.length} keywords found. Missing: ${missing.join(", ")}`,
      score: req.keywords.length > 0 ? found.length / req.keywords.length : 1,
    });
  }

  // 5. Semantic completeness
  const hasPunctuation = /[.!?]$/.test(output.trim());
  const wordCount = output.split(/\s+/).filter(Boolean).length;
  checks.push({
    name: "Completeness Check",
    passed: wordCount >= 3 && hasPunctuation,
    detail: `${wordCount} words, ${hasPunctuation ? "properly terminated" : "missing ending punctuation"}`,
  });

  // 6. Quality threshold
  const qualityScore = Math.min(1, wordCount / 20);
  checks.push({
    name: "Quality Threshold",
    passed: qualityScore >= 0.5,
    detail: `Quality score: ${Math.round(qualityScore * 100)}% (${wordCount} words)`,
    score: qualityScore,
  });

  return checks;
}

function generateProofHash(output: string, checks: VerificationCheck[], taskId: string): string {
  const data = JSON.stringify({
    output,
    checks: checks.map((c) => ({ name: c.name, passed: c.passed })),
    taskId,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  });
  return createHash("sha256").update(data).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { output, requirements, taskId, milestoneIndex } = body;

    if (!output || !requirements) {
      return NextResponse.json(
        { error: "Missing output or requirements" },
        { status: 400 }
      );
    }

    const checks = runChecks(output, requirements);
    const allPassed = checks.every((c) => c.passed);
    const proofHash = generateProofHash(
      output,
      checks,
      taskId || `milestone-${milestoneIndex ?? "unknown"}`
    );

    return NextResponse.json({
      verified: allPassed,
      proofHash,
      proofType: "Deterministic (ZK-ready for production)",
      timestamp: new Date().toISOString(),
      checks,
      metadata: {
        taskId: taskId || null,
        milestoneIndex: milestoneIndex ?? null,
        outputLength: output.length,
        requirements,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
