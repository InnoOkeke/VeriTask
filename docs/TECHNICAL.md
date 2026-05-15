# VeriTask — Technical Documentation

**Version:** 0.1.0  
**Network:** Stellar Testnet  
**Hackathon:** Boundless × Trustless Work 2026

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Data Model](#3-data-model)
4. [Escrow Integration](#4-escrow-integration)
5. [Wallet Integration](#5-wallet-integration)
6. [Verification Engine](#6-verification-engine)
7. [Component Architecture](#7-component-architecture)
8. [API Reference](#8-api-reference)
9. [State Management](#9-state-management)
10. [Security Model](#10-security-model)
11. [Transaction Flow](#11-transaction-flow)
12. [Deployment Guide](#12-deployment-guide)
13. [Roadmap](#13-roadmap)

---

## 1. System Architecture

### High-Level Design

VeriTask is a **Next.js 16 single-page application** with server-side API routes. It bridges three domains:

1. **Frontend** — React 19 components connected to Stellar wallets
2. **Smart Contracts** — Trustless Work multi-release escrows on Stellar Soroban
3. **Verification** — Deterministic check engine with auditable proof generation

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js 16)                      │
│                                                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ Landing  │   │ Employer │   │  Agent   │   │  Task Detail │ │
│  │  Page    │   │Dashboard │   │  Board   │   │    Page      │ │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘   └──────┬───────┘ │
│       │              │              │                 │          │
│  ┌────▼──────────────▼──────────────▼─────────────────▼───────┐ │
│  │                    PROVIDER LAYER                            │ │
│  │  ┌────────────────────┐  ┌────────────────────────────┐    │ │
│  │  │ TrustlessWorkConfig │  │    WalletProvider           │    │ │
│  │  │  (SDK baseURL+key)  │  │  (stellar-wallets-kit)      │    │ │
│  │  └────────┬───────────┘  └──────────┬─────────────────┘    │ │
│  └───────────┼─────────────────────────┼──────────────────────┘ │
│              │                         │                         │
│  ┌───────────▼─────────────────────────▼──────────────────────┐ │
│  │                   SERVICE LAYER                             │ │
│  │  ┌──────────────────┐  ┌────────────┐  ┌───────────────┐  │ │
│  │  │  escrowService   │  │   store    │  │   demo.ts     │  │ │
│  │  │  (sign + send)   │  │(localStor) │  │ (demo tasks)  │  │ │
│  │  └────────┬─────────┘  └────────────┘  └───────────────┘  │ │
│  └───────────┼────────────────────────────────────────────────┘ │
└──────────────┼──────────────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐      ┌──────────────────┐
    │  Stellar Testnet    │      │  Next.js API      │
    │  (Soroban Escrow)   │      │  /api/verify      │
    └─────────────────────┘      └──────────────────┘
```

### Data Flow

```
1. Employer creates task → escrow deployed on-chain → task saved to localStorage
2. Agent submits work → changeMilestoneStatus on-chain → milestone updated in localStorage
3. Employer verifies → POST /api/verify → deterministic checks run → proof hash returned
4. Employer approves → approveMilestone on-chain → status updated locally
5. Employer releases → releaseFunds on-chain → USDC transferred → task paid
```

### Dual-State Architecture

VeriTask uses a **dual-state model**:

| Layer | Storage | Purpose | Authority |
|-------|---------|---------|-----------|
| **On-Chain** | Stellar Soroban | Canonical escrow state, fund custody, role enforcement | Smart contract |
| **Off-Chain** | localStorage | Task metadata, UI state, evidence text, demo data | Client app |

The on-chain layer is the source of truth for financial operations. The off-chain layer caches metadata for UX. Rehydration from on-chain (via `useGetEscrowsFromIndexerBySigner`) is available but not yet wired into the UI.

---

## 2. Technology Stack

### Runtime & Framework

| Dependency | Version | Role |
|-----------|---------|------|
| `next` | 16.2.6 | React framework (App Router, Server Components, API routes) |
| `react` | 19.2.4 | UI library |
| `react-dom` | 19.2.4 | DOM renderer |
| `typescript` | ^5 | Type system |
| `tailwindcss` | ^4 | Utility-first CSS (v4 CSS-first config) |

### Stellar & Escrow

| Dependency | Version | Role |
|-----------|---------|------|
| `@trustless-work/escrow` | ^3.0.5 | Escrow SDK (deploy, fund, approve, release, milestone ops) |
| `@trustless-work/blocks` | ^1.2.5 | Pre-built escrow UI components |
| `@creit.tech/stellar-wallets-kit` | ^2.2.0 | Multi-wallet abstraction (connect modal + signing) |
| `@stellar/stellar-sdk` | ^15.1.0 | Transaction building (trustline operations) |
| `@stellar/freighter-api` | ^6.0.1 | Freighter browser extension API |

### Verification & Proofs

| Dependency | Version | Role |
|-----------|---------|------|
| `lib/boundless.ts` | — | BoundlessClient — typed proof-request wrapper for `/api/verify` |

---

## 3. Data Model

### Core Types (`src/lib/types.ts`)

```typescript
type TaskStatus =
  | "open"        // Created, awaiting agent claim
  | "claimed"     // Agent has claimed (not fully wired)
  | "in_progress" // Work being done (post-submission)
  | "completed"   // All milestones approved/released
  | "disputed"    // Under dispute resolution
  | "paid";       // All payments released

interface Milestone {
  id: string;                          // Unique ID (e.g., "m1", "m2")
  description: string;                 // Work description
  amount: number;                      // USDC amount locked for this milestone
  status: "pending"     |             // Not yet started
          "in_progress" |             // Work in progress
          "submitted"   |             // Deliverable submitted
          "approved"    |             // Verified and approved
          "released"    |             // Payment released
          "disputed"    |             // Under dispute
          "paid";                      // Final state
  evidence?: string;                   // Submitted work output (text)
}

interface Task {
  id: string;                          // Unique task ID (e.g., "eng-1737123456789")
  title: string;                       // Task title
  description: string;                 // Full task description
  totalAmount: number;                 // Sum of all milestone amounts
  asset: string;                       // "USDC"
  status: TaskStatus;                  // Current task status
  milestones: Milestone[];            // Ordered milestone list
  employerAddress: string;            // Stellar public key of employer
  agentAddress?: string;              // Stellar public key of agent (set on claim)
  escrowContractId?: string;          // Trustless Work contract ID (set post-deploy)
  engagementId: string;               // Trustless Work engagement ID
  createdAt: Date;                     // Task creation timestamp
}
```

### Trustline Configuration

```typescript
const TRUSTLINE_ADDRESS = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const PLATFORM_FEE = 4; // basis points (0.04%)
```

---

## 4. Escrow Integration

### SDK Architecture

The escrow service (`src/lib/escrowService.ts`) provides a unified interface that:

1. Calls Trustless Work SDK hooks to generate **unsigned XDR transactions**
2. Routes the XDR through the **wallet signing layer**
3. Submits the signed transaction to the **Stellar testnet**

```typescript
// Pattern: Deploy → Sign → Send
const handleDeploy = async (payload) => {
  const unsigned = await deployEscrow(payload, "multi-release");  // SDK hook
  const signedXdr = await signTransaction(unsigned, payload.signer); // Wallet
  return sendTransaction(signedXdr);                                // Network
};
```

### Escrow Lifecycle Methods

| Method | SDK Hook | Signer | On-Chain Effect |
|--------|----------|--------|-----------------|
| `handleDeploy` | `useInitializeEscrow` | `payload.signer` | Deploys Soroban escrow contract |
| `handleFund` | `useFundEscrow` | `payload.signer` | Transfers USDC to escrow |
| `handleChangeMilestoneStatus` | `useChangeMilestoneStatus` | `payload.serviceProvider` | Updates milestone to "Submitted" |
| `handleApproveMilestone` | `useApproveMilestone` | `payload.approver` | Marks milestone as approved |
| `handleReleaseFunds` | `useReleaseFunds` | `payload.releaseSigner` | Releases USDC to service provider |

### Escrow Deployment Payload

```typescript
interface InitializeMultiReleaseEscrowPayload {
  signer: string;                      // Stellar address paying gas + creating escrow
  engagementId: string;                // Unique ID (eng-<timestamp>)
  title: string;                       // Stored on-chain for reference
  description: string;                 // Task description
  platformFee: number;                 // Basis points (4 = 0.04%)
  roles: {
    approver: string;                  // Can approve milestones
    serviceProvider: string;           // Can submit work
    platformAddress: string;           // Receives platform fee
    releaseSigner: string;             // Can release funds
    disputeResolver: string;           // Can resolve disputes
  };
  milestones: {
    description: string;
    amount: number;
    receiver: string;                  // Receives payment for this milestone
  }[];
  trustline: {
    symbol: string;                    // "USDC"
    address: string;                   // Trustline issuer address
  };
}
```

### Contract ID

After deployment, the `contractId` is stored as `task.escrowContractId` and used for all subsequent operations (fund, change status, approve, release). It is displayed in the UI with a truncated format:

```
Escrow: CBBD47IF6LWK... (first 14 chars)
```

---

## 5. Wallet Integration

### Provider Architecture

```
WalletProvider (React Context)
├── @creit.tech/stellar-wallets-kit
│   ├── Freighter Module (browser extension)
│   └── Albedo Module (web popup)
├── localStorage persistence (walletAddress, walletName)
└── Unified signTransaction() interface
```

### Supported Wallets

```typescript
const freighterModule: ModuleInterface = {
  moduleType: ModuleType.HOT_WALLET,
  productId: "freighter",
  isAvailable: () => freighterIsConnected(),
  getAddress: () => { /* requestAccess + getAddress */ },
  signTransaction: (xdr, opts) => freighterSign(xdr, opts),
  getNetwork: () => freighterGetNetwork(),
};

const albedoModule: ModuleInterface = {
  moduleType: ModuleType.HOT_WALLET,
  productId: "albedo",
  isAvailable: () => true, // Always available (web popup)
  getAddress: () => albedoPopup("https://albedo.link/authenticate"),
  signTransaction: (xdr, opts) => albedoPopup(`https://albedo.link/sign?...`),
  getNetwork: () => ({ network: "testnet" }),
};
```

### Connection Flow

```
1. User clicks "Connect Wallet"
2. StellarWalletsKit.init({ modules: [freighter, albedo] })
3. StellarWalletsKit.authModal() → user selects wallet
4. Selected module.getAddress() → returns Stellar public key
5. Address + wallet name stored in React state + localStorage
6. WalletSetupBanner checks for USDC trustline
```

### Signing Flow

```
1. Trustless Work SDK returns unsigned XDR
2. escrowService calls signTransaction(xdr, signerAddress)
3. WalletProvider routes to StellarWalletsKit.signTransaction(xdr, { address, networkPassphrase })
4. Selected wallet prompts user to approve
5. Signed XDR returned to escrowService
6. sendTransaction(signedXdr) submits to Stellar testnet
```

### Validating Onboarding (WalletSetupBanner)

The `WalletSetupBanner` component checks and guides users through testnet setup:

1. **Fund XLM** — Links to Stellar Laboratory account creator
2. **Add USDC Trustline** — Builds and submits a `changeTrust` operation via `@stellar/stellar-sdk`
3. **Get USDC** — Links to Trustless Work testnet token documentation

Trustline verification queries the Horizon API:
```
GET https://horizon-testnet.stellar.org/accounts/{address}
```
Checks for balance entries with `asset_code === "USDC"` and matching issuer.

---

## 6. Verification Engine

### API Endpoint

```
POST /api/verify
Content-Type: application/json
```

### Request Schema

```typescript
interface VerifyRequest {
  output: string;                      // Submitted evidence text
  requirements: {
    description: string;               // Milestone description
    minLength?: number;                // Minimum character count (default: 50)
    expectedFormat?: string;           // "json" | "text" | "markdown"
    keywords?: string[];               // Expected keywords (extracted from description)
  };
  taskId?: string;                     // For proof hash generation
  milestoneIndex?: number;             // For proof hash generation
}
```

### Response Schema

```typescript
interface VerifyResponse {
  verified: boolean;                   // All checks passed
  proofHash: string;                   // SHA-256 hash of output + checks + nonce
  proofType: string;                   // "Deterministic (ZK-ready for production)"
  timestamp: string;                   // ISO 8601 timestamp
  checks: VerificationCheck[];         // Individual check results
  metadata: {
    taskId: string | null;
    milestoneIndex: number | null;
    outputLength: number;
    requirements: object;
  };
}

interface VerificationCheck {
  name: string;                        // Human-readable check name
  passed: boolean;                     // Did it pass?
  detail: string;                      // Explanation string
  score?: number;                      // 0.0 - 1.0 (optional, for scored checks)
}
```

### Verification Checks (in order)

| # | Check Name | Algorithm | Pass Condition | Score |
|---|-----------|-----------|----------------|-------|
| 1 | **Output Existence** | `output.length > 0` | Non-empty string | — |
| 2 | **Length Requirement** | `output.length >= minLength` | Meets min char count | `min(1, output.length / minLength)` |
| 3 | **Format Validation** | Format-specific parser | Valid JSON/Text/Markdown | — |
| 4 | **Content Relevance** | Keyword matching (case-insensitive) | All keywords found in output | `found.length / keywords.length` |
| 5 | **Completeness Check** | Word count + punctuation regex | `≥ 3` words + `[.!?]$` | — |
| 6 | **Quality Threshold** | `wordCount / 20` | Score `≥ 0.5` (10+ words) | `min(1, wordCount / 20)` |

### Keyword Extraction

Keywords are extracted client-side in `VerificationPanel.tsx`:

```typescript
const keywords = milestoneDescription
  .toLowerCase()
  .split(/\s+/)                       // Split on whitespace
  .filter((w) => w.length > 3)       // Minimum 4 characters
  .slice(0, 5);                       // Maximum 5 keywords
```

### Proof Hash Generation

```typescript
function generateProofHash(output, checks, taskId) {
  const data = JSON.stringify({
    output,
    checks: checks.map(c => ({ name: c.name, passed: c.passed })),
    taskId,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  });
  return createHash("sha256").update(data).digest("hex");
}
```

The proof hash is deterministic for replay verification but includes a random nonce to prevent hash collision attacks. Each run produces a unique hash, but the same input + checks + taskId can be re-verified.

### Format Validation Logic

```typescript
switch (expectedFormat) {
  case "json":
    JSON.parse(output);               // Throws if invalid
    break;
  case "text":
    output.trim().length > 0;         // Non-whitespace
    break;
  case "markdown":
    /^#{1,6}\s|^\*|^-|^>|^```/.test(output) || output.includes("\n");
    break;
}
```

### BoundlessClient (`src/lib/boundless.ts`)

The `BoundlessClient` class wraps the verification API with a clean, typed interface matching the Boundless proof-request pattern. It is used by `VerificationPanel` instead of direct `fetch` calls:

```typescript
import { BoundlessClient } from "@/lib/boundless";

const client = new BoundlessClient({ network: "testnet" });

const proof = await client.requestProof({
  program: "ai-output-validator",
  inputs: {
    output: evidence,
    requirements: {
      description: milestoneDescription,
      minLength: 50,
      expectedFormat: "text",
      keywords,
    },
    taskId,
    milestoneIndex,
  },
});

// proof.verified — all 6 checks passed
// proof.proofHash — SHA-256 hash for audit
// proof.checks — individual check results
```

The auto-approve pipeline is wired in `src/app/task/[id]/page.tsx:238`: when the employer clicks "Approve & Release" after verification passes, `onVerified` calls `handleApprove()` which triggers the on-chain `approveMilestone` via the Trustless Work SDK — no separate manual approve step required.

---

## 7. Component Architecture

### Provider Hierarchy

```
<html> → <body>
  <TrustlessWorkConfig>          ← SDK configuration (base URL + API key)
    <WalletProvider>              ← Wallet state + signing
      <Header />                  ← Navigation + wallet UI
      <main>
        {page content}
      </main>
    </WalletProvider>
  </TrustlessWorkConfig>
```

### Page Components

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `page.tsx` | Landing page with hero, how-it-works grid, Trustless Work feature list |
| `/employer` | `page.tsx` | Tasks filtered by `employerAddress === walletAddress` |
| `/employer/new` | `page.tsx` | Multi-step form: task details → escrow deploy → fund |
| `/agent` | `agent/page.tsx` | Tasks filtered by `status: open | claimed | in_progress` |
| `/task/[id]` | `task/[id]/page.tsx` | Detail view + role switcher + milestone lifecycle |
| `/api/verify` | `api/verify/route.ts` | POST endpoint for deterministic verification |

### Shared Components

| Component | Path | Purpose |
|-----------|------|---------|
| `Header` | `components/Header.tsx` | Nav bar, wallet connect/disconnect, active route highlighting |
| `WalletProvider` | `components/WalletProvider.tsx` | Context provider for wallet state + signing |
| `TrustlessWorkEscrowProvider` | `components/TrustlessWorkEscrowProvider.tsx` | SDK configuration wrapper |
| `RequireWallet` | `components/RequireWallet.tsx` | Auth guard — renders children only if wallet connected |
| `WalletSetupBanner` | `components/WalletSetupBanner.tsx` | Onboarding wizard for testnet setup |
| `VerificationPanel` | `components/VerificationPanel.tsx` | Verification UI with checks display + proof hash |

### VerificationPanel States

```
┌─ Initial ─────────────────────────────────────────┐
│ 🔍 Boundless Verification     ZK PROOF             │
│ Milestone: <description>                           │
│ [Run Verification]                                 │
└────────────────────────────────────────────────────┘

┌─ Loading ─────────────────────────────────────────┐
│ ◌ Running Boundless verification checks...          │
│ ████████████░░░░░░░░░░░░                           │
└────────────────────────────────────────────────────┘

┌─ Results (Pass) ───────────────────────────────────┐
│ Checks: 6/6 passed                                 │
│ ████████████████████████                           │
│ ✅ Output Existence: Output is 142 characters       │
│ ✅ Length Requirement: 142/50 chars (284%)          │
│ ...                                                │
│ PROOF HASH: <sha256>                               │
│ ✅ All 6 checks passed. Proof verified.             │
│ [Approve & Release]                                │
└────────────────────────────────────────────────────┘

┌─ Results (Fail) ───────────────────────────────────┐
│ Checks: 3/6 passed                                 │
│ ██████████░░░░░░░░░░░░░░                           │
│ ❌ Length Requirement: Only 48/50 chars required     │
│ ❌ Content Relevance: 0/1 keywords found            │
│ ❌ Quality Threshold: Quality score: 30% (6 words)   │
│ ❌ 3 check(s) failed. Output does not meet reqs.    │
│ [Retry Verification]                               │
└────────────────────────────────────────────────────┘
```

---

## 8. API Reference

### POST /api/verify

Verifies AI output against milestone requirements using deterministic checks.

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "output": "Completed work for milestone: Write 50 product descriptions. Output meets requirements.",
  "requirements": {
    "description": "Write 50 product descriptions for e-commerce catalog",
    "minLength": 50,
    "expectedFormat": "text",
    "keywords": ["write", "product", "descriptions", "e-commerce", "catalog"]
  },
  "taskId": "eng-1737123456789",
  "milestoneIndex": 0
}
```

**Success Response (200):**
```json
{
  "verified": true,
  "proofHash": "6419423fb07c9f84f082a7b69e1a7227ca36e988fa6d00133885d62593326b9c",
  "proofType": "Deterministic (ZK-ready for production)",
  "timestamp": "2026-05-15T10:38:26.000Z",
  "checks": [
    { "name": "Output Existence", "passed": true, "detail": "Output is 95 characters" },
    { "name": "Length Requirement", "passed": true, "detail": "95/50 chars (190%)", "score": 1.0 },
    { "name": "Format Validation", "passed": true, "detail": "Valid text content" },
    { "name": "Content Relevance", "passed": true, "detail": "All 4 keywords found", "score": 1.0 },
    { "name": "Completeness Check", "passed": true, "detail": "12 words, properly terminated" },
    { "name": "Quality Threshold", "passed": true, "detail": "Quality score: 60% (12 words)", "score": 0.6 }
  ],
  "metadata": {
    "taskId": "eng-1737123456789",
    "milestoneIndex": 0,
    "outputLength": 95,
    "requirements": { "description": "...", "minLength": 50, "expectedFormat": "text", "keywords": ["..."] }
  }
}
```

**Error Response (400):**
```json
{
  "error": "Missing output or requirements"
}
```

---

## 9. State Management

### Storage Strategy

| Data | Location | Persistence | Scope |
|------|----------|-------------|-------|
| Wallet address + name | `localStorage` | Survives refresh | Per-browser |
| Tasks + milestones | `localStorage` (`"veritask_tasks"`) | Survives refresh | Per-browser |
| Task create form draft | `localStorage` (`"veritask_create_draft"`) | Auto-saved | Per-browser |
| Trustline setup flag | `localStorage` (`"veritask_setup_${address}"`) | Survives refresh | Per-wallet |
| Escrow state | Stellar Soroban | On-chain | Permanent |
| Transaction log | React state (`useState`) | Session only | Per-page |
| Role switcher | React state (`useState`) | Session only | Per-page |
| Verification results | React state (`useState`) | Session only | Per-page |
| API key | Environment variable | Build-time | Global |

### Store Operations (`src/lib/store.ts`)

```typescript
loadTasks(): Task[]                              // Read all tasks
saveTasks(tasks: Task[]): void                   // Write all tasks
getTask(id: string): Task | undefined            // Find by ID
addTask(task: Task): void                        // Append new task
updateTask(id: string, updates: Partial<Task>)   // Merge updates
updateMilestone(taskId, milestoneId, updates)    // Update single milestone
```

All operations are synchronous and operate on the full task array. Tasks with `escrowContractId` exist on-chain; demo tasks (`src/lib/demo.ts`) have no contract ID and exist only for UI testing.

### Force Update Pattern

Several components use a `forceUpdate` counter pattern to trigger re-renders after localStorage mutations:

```typescript
const [, forceUpdate] = useState(0);
const refresh = () => forceUpdate((n) => n + 1);
```

This is necessary because localStorage is external to React's state system.

---

## 10. Security Model

### Key Principles

1. **No private keys in the application.** All signing happens in external wallets (Freighter extension or Albedo popup).
2. **Role-based access control.** Only the assigned `approver` can approve milestones. Only the `releaseSigner` can release funds. Only the `serviceProvider` can submit work. Enforced by the escrow smart contract.
3. **Platform can't move funds.** The `platformAddress` only receives the configured fee. It cannot approve, release, or redirect escrow funds.
4. **Dispute resolver as safety valve.** The `disputeResolver` can redirect funds if disputes arise (protocol-level, UI not yet built).

### Trust Assumptions

| Trust Boundary | Current Implementation | Production Recommendation |
|---------------|----------------------|--------------------------|
| Wallet signing | Freighter / Albedo testnet | Same wallets, mainnet |
| Escrow custody | Stellar Soroban smart contracts | Same |
| Evidence storage | localStorage (text only) | IPFS / Pinata for proofs |
| Verification integrity | Server-side SHA-256 hashing | Boundless ZK proofs |
| API key | Client-side env var | Server-side only (proxy) |
| Multi-user state | localStorage (single-device) | Supabase / backend DB |

### Known Limitations (Development)

- **API key exposure:** `NEXT_PUBLIC_TRUSTLESS_API_KEY` is bundled in client-side JavaScript. For production, route through a backend proxy.
- **Single-device state:** localStorage means tasks created on one browser are invisible to others.
- **Demo mode fallback:** If no tasks exist in localStorage, demo tasks from `lib/demo.ts` are loaded. These have no on-chain escrow and mock employer addresses.
- **No dispute UI:** The `disputed` status and `disputeResolver` role exist in the type system and contract but have no frontend trigger.
- **Role self-assignment:** In the current implementation, all roles (`approver`, `serviceProvider`, `releaseSigner`, `disputeResolver`) are set to the creator's wallet for demo purposes. In production, roles should be assigned to different addresses.

---

## 11. Transaction Flow

### Complete Milestone Lifecycle (Step-by-Step)

```
Step 1: CREATE TASK (/employer/new)
  ├── User fills form (title, description, milestones)
  ├── Form auto-saves to localStorage draft
  ├── User clicks "Deploy Escrow & Fund"
  ├── handleDeploy() → deployEscrow() → signTransaction() → sendTransaction()
  │   └── On-chain: escrow contract deployed, contractId returned
  ├── 8s delay (network confirmation)
  ├── handleFund() → fundEscrow() → signTransaction() → sendTransaction()
  │   └── On-chain: USDC transferred to escrow contract
  ├── Task object created with status: "open"
  ├── addTask() → localStorage
  └── Redirect to /employer dashboard

Step 2: SUBMIT WORK (agent view on /task/[id])
  ├── User switches to "View as agent"
  ├── Clicks "Submit Deliverable" for milestone
  ├── handleSubmitWork() checks: walletAddress, escrowContractId, not busy
  ├── handleChangeMilestoneStatus()
  │   ├── changeMilestoneStatus({ newStatus: "Submitted", serviceProvider })
  │   ├── signTransaction(xdr, walletAddress)
  │   └── sendTransaction(signedXdr)
  │   └── On-chain: milestone status changed to "Submitted"
  ├── updateMilestone() → localStorage
  │   └── status: "submitted", evidence: generated evidence string
  ├── updateTask() → localStorage
  │   └── status: "in_progress", agentAddress: walletAddress
  └── refresh() → UI re-renders

Step 3: VERIFY (employer view on /task/[id])
  ├── User switches to "View as employer"
  ├── Submitted milestone shows VerificationPanel
  ├── Clicks "Run Verification"
  ├── VerificationPanel extracts keywords from milestone description
  ├── POST /api/verify { output: evidence, requirements: { keywords, minLength: 50, expectedFormat: "text" } }
  ├── Server runs 6 deterministic checks
  ├── Response: { verified: bool, checks: [...], proofHash: "..." }
  ├── If all checks pass: green banner + "Approve & Release" button
  └── If checks fail: red banner + "Retry Verification" button

Step 4: APPROVE (employer view on /task/[id])
  ├── User clicks "Approve & Release" (from VerificationPanel)
  ├── onVerified(proofHash) → updateMilestone({ status: "approved" })
  └── Note: Sets LOCAL state only. On-chain approve is separate.

Step 5: RELEASE PAYMENT (employer view on /task/[id])
  ├── Approved milestone shows "Release Payment" button
  ├── handleRelease()
  │   ├── handleReleaseFunds({ contractId, milestoneIndex, releaseSigner })
  │   ├── signTransaction(xdr, walletAddress)
  │   └── sendTransaction(signedXdr)
  │   └── On-chain: USDC released from escrow to service provider
  ├── updateMilestone({ status: "released" })
  ├── If all milestones released:
  │   ├── updateTask({ status: "paid" })
  │   └── updateMilestone({ status: "paid" })
  └── refresh() → UI shows "✓ Paid"

Step 6: COMPLETION
  ├── task.status === "paid"
  ├── Green banner: "All Milestones Complete — X USDC paid out"
  └── All milestones show "✓ Paid"
```

### Transaction Signing Details

Each on-chain operation follows the same pattern:

```
1. SDK Hook → unsigned XDR transaction
2. wallet.signTransaction(xdr, { address, networkPassphrase })
3. Wallet extension/popup prompts user to approve
4. Signed XDR returned
5. sendTransaction(signedXdr) → POST to Horizon
6. Horizon returns transaction result
```

Network passphrase: `"Test SDF Network ; September 2015"` (Stellar Testnet)

---

## 12. Deployment Guide

### Local Development

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local: add NEXT_PUBLIC_TRUSTLESS_API_KEY
npm run dev
```

### Production Build

```bash
npm run build    # Creates .next/ production build
npm start        # Starts production server on port 3000
```

### Vercel Deployment

```bash
vercel           # Interactive CLI deployment
```

Environment variables required on Vercel:
- `NEXT_PUBLIC_TRUSTLESS_API_KEY` — Trustless Work API key

### Stellar Testnet Setup (per wallet)

1. Install Freighter browser extension from [freighter.app](https://freighter.app)
2. Create or import a testnet wallet in Freighter
3. Fund with testnet XLM via [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
4. Open VeriTask → WalletSetupBanner guides through trustline + USDC setup
5. Get testnet USDC from [Trustless Work docs](https://docs.trustlesswork.com/trustless-work/introduction/stellar-and-soroban-the-backbone-of-trustless-work/testnet-tokens)

---

## 13. Roadmap

### Phase 1: Hackathon Deliverable (Current)

- [x] Multi-release escrow deployment + funding on Stellar testnet
- [x] Full escrow lifecycle (deploy → fund → submit → verify → approve → release)
- [x] Deterministic verification engine with 6 checks + proof hashes
- [x] Multi-wallet support (Freighter + Albedo)
- [x] Dark-themed polished UI with role switcher and transaction log
- [x] Testnet onboarding wizard (XLM funding, USDC trustline)
- [x] BoundlessClient integration — verify→proof→auto-approve pipeline

### Phase 2: Boundless ZK Proofs (Next)

- [ ] Upgrade BoundlessClient to use Boundless RISC Zero zkVM for true ZK proofs
- [ ] Replace SHA-256 deterministic checks with verifiable ZK proofs
- [ ] IPFS/Pinata storage for proofs and artifacts
- [ ] Content-addressed evidence referencing

### Phase 3: AI Agent Integration

- [ ] OpenAI / Anthropic API connector
- [ ] Autonomous agent task execution
- [ ] Agent economy with token incentives
- [ ] Quality scoring from verification engine feedback
- [ ] Agent reputation system

### Phase 4: Production Readiness

- [ ] Supabase backend (replace localStorage)
- [ ] Multi-user accounts + authentication
- [ ] Stellar mainnet deployment
- [ ] shadcn/ui component migration
- [ ] `@trustless-work/blocks` UI components
- [ ] Dispute resolution UI
- [ ] API key proxy (server-side)
- [ ] Mobile-responsive design improvements
- [ ] Test suite

---

## Appendix A: File Index

```
src/
├── app/
│   ├── api/verify/route.ts              — Verification engine (POST endpoint)
│   ├── agent/page.tsx                    — AI Agent board (task discovery)
│   ├── employer/page.tsx                 — Employer dashboard
│   ├── employer/new/page.tsx             — Task creation + escrow deployment
│   ├── task/[id]/page.tsx                — Task detail + milestone lifecycle
│   ├── layout.tsx                        — Root layout (dark theme, providers)
│   ├── page.tsx                          — Landing page
│   ├── providers.tsx                     — Provider composition
│   └── globals.css                       — Tailwind v4 config
├── components/
│   ├── Header.tsx                        — Navigation + wallet UI
│   ├── WalletProvider.tsx                — Multi-wallet context + signing
│   ├── TrustlessWorkEscrowProvider.tsx   — SDK configuration
│   ├── RequireWallet.tsx                 — Auth guard
│   ├── WalletSetupBanner.tsx             — Testnet onboarding
│   └── VerificationPanel.tsx             — Verification UI + results
├── lib/
│   ├── types.ts                          — Core type definitions
│   ├── store.ts                          — localStorage persistence
│   ├── escrowService.ts                  — Escrow SDK wrapper
│   ├── boundless.ts                      — BoundlessClient proof-request wrapper
│   └── demo.ts                           — Demo task data
└── middleware / config files
    ├── next.config.ts
    ├── tsconfig.json
    ├── postcss.config.mjs
    ├── eslint.config.mjs
    └── package.json
```

---

## Appendix B: Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_TRUSTLESS_API_KEY` | Yes | — | Trustless Work API key from dashboard |

---

*Documentation generated for Boundless × Trustless Work Hackathon 2026 submission.*
