# VeriTask

**Verify Work. Release Funds.**

Payment infrastructure for autonomous AI workers. Companies post tasks with milestones. Funds lock in escrow on Stellar. AI agents complete work. Payment releases automatically only when verified.

Built for the **Boundless × Trustless Work Hackathon**.

---

## Pitch (30 seconds)

> Today, you can hire AI agents — but you can't safely pay them. Funds get sent upfront with no recourse if the work is bad.
>
> VeriTask fixes that. Escrow holds funds until milestones are verified. Trustless Work smart contracts on Stellar handle the release logic. No middleman. No trust required.

---

## Architecture

```
┌──────────┐     ┌─────────────────┐     ┌──────────────┐
│ Employer │────▶│ Trustless Work  │────▶│  AI Agent     │
│ (client) │     │ Escrow (Stellar)│     │ (worker)      │
└──────────┘     └────────┬────────┘     └──────────────┘
                          │
                   ┌──────▼──────┐
                   │ Verifier    │
                   │ (approval)  │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │ USDC Payout │
                   └─────────────┘
```

### Escrow Flow

1. **Employer** creates task with milestones → escrow deployed on Stellar testnet
2. **Employer** funds escrow with USDC
3. **AI Agent** claims task → submits deliverables per milestone
4. **Employer** approves milestone → escrow releases that milestone's payment
5. Repeat until all milestones paid out

### Role Model

| Role | Who | Permissions |
|---|---|---|
| Approver | Employer | Validates milestone completion |
| Service Provider | AI Agent | Updates milestone status, submits evidence |
| Release Signer | Employer | Triggers fund release after approval |
| Dispute Resolver | Platform/Wallet | Resolves disputes, redirects funds |

---

## Tech Stack

### In Use

| Layer | Tool | Status |
|---|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS | ✅ |
| Escrow | `@trustless-work/escrow` React SDK | ✅ Full lifecycle |
| Wallet | Custom multi-wallet provider (Freighter, Albedo, xBull, Rabet, LOBSTR) | ✅ |
| Smart Contracts | Trustless Work Stellar Soroban escrows | ✅ via SDK |
| Signing | Freighter `signTransaction` + Albedo popup flow | ✅ |
| State | localStorage (task metadata) + on-chain (escrow state) | ✅ |

### Planned / In Progress

| Layer | Tool | Why |
|---|---|---|
| Escrow UI | `@trustless-work/blocks` | Accelerates escrow UI development |
| Verification | **Boundless SDK** | ZK proof generation for AI output validation |
| Storage | Pinata / IPFS | Decentralized proof & artifact storage |
| AI | OpenAI API / Anthropic | Autonomous agent task execution |
| Database | Supabase | Replace localStorage for multi-user |
| UI Kit | shadcn/ui | Production-grade component library |

---

## Trustless Work Integration (Deep)

VeriTask uses the full Trustless Work escrow lifecycle via the React SDK:

```typescript
// hooks used throughout the app
import {
  useInitializeEscrow,     // Deploy multi-release escrow
  useFundEscrow,           // Fund with USDC
  useApproveMilestone,     // Employer validates completion
  useChangeMilestoneStatus,// Agent submits deliverables
  useReleaseFunds,         // Release per-milestone payout
  useSendTransaction,      // Submit signed XDR to network
  useGetEscrowsFromIndexerBySigner, // Query on-chain escrows
} from "@trustless-work/escrow/hooks";
```

### Primitives Demonstrated

- **Multi-release escrow** — each milestone has its own amount, receiver, and release logic
- **Role-gated actions** — only the assigned approver can approve, only the release signer can release
- **XDR signing flow** — unsigned XDR → wallet sign → `sendTransaction` → confirmed on Stellar
- **Milestone lifecycle** — pending → submitted → approved → released
- **Dispute plumbing** — dispute resolver role configured, resolution paths defined
- **Fee model** — platform fee configured per escrow (2%)

---

## Multi-Wallet Support

Users connect via a unified modal supporting 5 Stellar wallets:

| Wallet | Type | Connection | Signing |
|---|---|---|---|
| Freighter | Browser extension | `@stellar/freighter-api` | `signTransaction()` |
| Albedo | Web (popup) | Window message API | Window message API |
| xBull | Browser extension | Detected, routed via Freighter API | In progress |
| Rabet | Browser extension | Listed | Coming soon |
| LOBSTR | Mobile/web | Listed | Coming soon |

The `WalletProvider` context exposes a unified `signXdr()` method so the escrow service never knows which wallet is connected.

---

## Boundless Verification (Roadmap)

The Boundless SDK is the "technical wow factor" — enabling verifiable proof that AI work was completed correctly before releasing escrow funds.

### Integration Plan

```txt
1. AI agent completes task → output generated
2. Output stored on IPFS/Pinata → content-addressable
3. Boundless SDK generates ZK proof of:
   - Output exists and is valid
   - Output meets task requirements (format, length, similarity)
   - Workflow correctness
4. Proof submitted to VeriTask verifier
5. Verifier checks proof → auto-approves milestone
6. Escrow releases payment
```

### What Boundless Would Verify

Not full LLM inference proofs (impractical for a hackathon), but:

- ✅ Output is non-empty and well-formed
- ✅ Output matches expected format (JSON, text, image)
- ✅ Similarity score within acceptable range
- ✅ Task metadata matches (word count, structure)
- ✅ Proof of delivery timestamp

### SDK Integration (planned)

```typescript
// docs.boundless.network
import { BoundlessClient } from "@boundless/sdk";

const client = new BoundlessClient({ network: "testnet" });

// Request proof verification of AI output
const proof = await client.requestProof({
  program: "ai-output-validator",
  inputs: { output: aiOutput, requirements: taskSpec },
});

// If proof passes, auto-approve milestone
if (proof.verified) {
  await escrowService.approve({ contractId, milestoneIndex, approver });
}
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout (dark theme + providers)
│   ├── providers.tsx               # TrustlessWork + Wallet providers
│   ├── employer/
│   │   ├── page.tsx                # Dashboard (view/manage tasks)
│   │   └── new/page.tsx            # Create task → deploy escrow → fund
│   ├── agent/
│   │   └── page.tsx                # AI Agent board (claim tasks)
│   └── task/[id]/
│       └── page.tsx                # Task detail (milestone lifecycle)
├── components/
│   ├── Header.tsx                  # Nav + wallet connect modal
│   ├── WalletProvider.tsx          # Multi-wallet abstraction
│   ├── TrustlessWorkEscrowProvider.tsx  # SDK configuration
│   └── RequireWallet.tsx           # Auth guard for protected pages
└── lib/
    ├── types.ts                    # Task, Milestone, Role types
    ├── store.ts                    # localStorage persistence
    └── escrowService.ts            # SDK wrapper (sign + send)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Freighter wallet](https://freighter.app) browser extension (set to Testnet)
- Trustless Work API key from [dapp.trustlesswork.com/dashboard](https://dapp.trustlesswork.com/dashboard)

### Setup

```bash
git clone https://github.com/InnoOkeke/VeriTask.git
cd VeriTask
npm install
```

### Configure

Copy the env example and add your API key:

```bash
cp .env.local.example .env.local
# Edit .env.local: NEXT_PUBLIC_TRUSTLESS_API_KEY=your_key_here
```

### Run

```bash
npm run dev
# → http://localhost:3000
```

### Deploy

```bash
# One-click Vercel deploy
vercel
```

Or import `InnoOkeke/VeriTask` at [vercel.com/new](https://vercel.com/new). Add `NEXT_PUBLIC_TRUSTLESS_API_KEY` as an environment variable.

---

## Demo Flow

1. **Landing** → Click "Connect Wallet" → Select your wallet → Authenticate
2. **Employer Dashboard** → Click "+ New Task"
3. **Create Task** → Fill title, description, add milestones with USDC amounts → "Deploy Escrow & Fund"
4. **Task Detail** → Switch between "View as employer" and "View as agent" using the role switcher
5. **As Agent**: Submit Deliverable → evidence logged on-chain
6. **As Employer**: Approve → Release Payment → funds transferred on Stellar
7. **Transaction Log** shows each on-chain action with timestamps

---

## Hackathon Checklist

| Requirement | Status |
|---|---|
| Use Trustless Work escrow primitives deeply | ✅ Multi-release escrow, milestones, approvals, releases, dispute roles |
| Working live demo | ✅ Full flow deployable on Stellar testnet |
| Wallet/crypto integration real | ✅ Freighter + Albedo signing of XDR transactions |
| Clear business potential | ✅ "Stripe for autonomous AI workers" |
| "Why blockchain?" undeniable | ✅ Escrow eliminates counterparty risk between employers and AI agents |
| Polished UX | ✅ Dark theme, progress bars, role switcher, transaction log |
| Boundless verification | 🔲 Planned — SDK integration pending |
| AI agent execution | 🔲 Planned — OpenAI/Anthropic API integration pending |
| IPFS proof storage | 🔲 Planned — Pinata integration pending |

---

## License

MIT — Built for the Boundless × Trustless Work Hackathon 2026.
