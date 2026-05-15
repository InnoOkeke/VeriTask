# VeriTask

**Verify Work. Release Funds.**

Payment infrastructure for autonomous AI workers. Companies post tasks with milestones. Funds lock in escrow on Stellar. AI agents submit deliverables. Payment releases only when work is verified — on-chain, trustlessly.

Built for the **Boundless × Trustless Work Hackathon 2026**.

---

## The Problem

You can hire AI agents today — but you can't safely pay them. LLMs produce inconsistent quality. If you pay upfront, you have no recourse. If you pay after, agents have no guarantee. Both sides carry counterparty risk, and there is no standard payment rail for AI-to-human commerce.

## The Solution

VeriTask wraps every AI engagement in a **multi-release escrow on Stellar**. Employers stake USDC per milestone. Agents submit verifiable outputs. A deterministic verification engine validates submissions before funds are released. No middleman. No trust required. No chargebacks.

```
Employer stakes USDC → Agent submits work → Verification engine validates → Escrow auto-releases
```

---

## Architecture

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│   Employer    │────▶│  Trustless Work      │────▶│   AI Agent        │
│   (Browser)   │     │  Multi-Release Escrow│     │   (Browser)       │
│               │     │  Stellar Soroban     │     │                   │
└──────────────┘     └──────────┬───────────┘     └──────────────────┘
                                │
                     ┌──────────▼───────────┐
                     │   Verification Engine │
                     │   /api/verify         │
                     │   Deterministic ZK    │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │   USDC Payout        │
                     │   Stellar Network    │
                     └──────────────────────┘
```

### Escrow Lifecycle

| Step | Actor | Action | On-Chain? |
|------|-------|--------|-----------|
| 1 | Employer | Creates task with milestones → deploys escrow contract | Yes |
| 2 | Employer | Funds escrow with total USDC amount | Yes |
| 3 | Agent | Claims task from agent board | No (local) |
| 4 | Agent | Submits deliverable + evidence per milestone | Yes |
| 5 | Employer | Runs verification engine on evidence | No (API) |
| 6 | Employer | Approves milestone on-chain | Yes |
| 7 | Employer | Releases payment for milestone | Yes |
| 8 | — | Repeat 4-7 for each milestone until all paid | — |

### Role Model (Trustless Work Escrow Primitives)

| Role | Assigned To | Permissions |
|------|-------------|-------------|
| **Approver** | Employer | Validates milestone completion, triggers approval |
| **Service Provider** | Agent | Updates milestone status, submits work evidence |
| **Release Signer** | Employer | Releases funds per milestone after approval |
| **Dispute Resolver** | Platform | Arbitrates disputes, redirects funds |
| **Platform Address** | VeriTask | Collects platform fee (2%) |

---

## Full Feature Scope

### Implemented

- Multi-release escrow deployment on Stellar testnet via Trustless Work SDK
- USDC funding with real on-chain transactions
- Milestone-gated work submission with evidence logging
- Deterministic verification engine (6 checks: existence, length, format, relevance, completeness, quality)
- SHA-256 proof hash generation (ZK-ready architecture)
- On-chain milestone approval via signed XDR transactions
- On-chain payment release per milestone
- Full escrow lifecycle: pending → submitted → approved → released → paid
- Role switcher (View as Employer / View as Agent) for demo testing
- Real-time transaction log with timestamps
- Dark-themed responsive UI (Next.js 16 + Tailwind CSS v4)
- Auto-save form drafts (task creation)
- Demo tasks for testing without escrow

### Planned / In Progress

| Layer | Tool | Purpose |
|-------|------|---------|
| ZK Verification | Boundless SDK | Generate verifiable ZK proofs for AI output validation |
| AI Integration | OpenAI / Anthropic API | Autonomous agent task execution |
| Decentralized Storage | Pinata / IPFS | Content-addressed proof & artifact storage |
| Multi-User Database | Supabase | Replace localStorage for persistent multi-user state |
| Escrow UI Blocks | `@trustless-work/blocks` | Production-grade escrow UI components |
| UI Components | shadcn/ui | Expand component library |
| Agent Economy | Token rewards | Incentivize quality AI work at scale |

---

## Tech Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| **Framework** | Next.js 16 (App Router) + React 19 + TypeScript | Production |
| **Styling** | Tailwind CSS v4 + Geist font | Production |
| **Escrow Protocol** | Trustless Work Smart Contracts (Stellar Soroban) | Production |
| **Escrow SDK** | `@trustless-work/escrow` v3.0.5 (React hooks) | Production |
| **Wallet Kit** | `@creit.tech/stellar-wallets-kit` v2.2.0 | Production |
| **Wallet Signing** | Freighter browser extension + Albedo web wallet | Production |
| **Stellar SDK** | `@stellar/stellar-sdk` v15.1.0 | Production |
| **State** | localStorage (client-side) + on-chain (canonical) | Development |
| **Verification** | Next.js API route with SHA-256 hashing | Production |
| **Network** | Stellar Testnet | Development |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page (hero + feature grid + Trustless Work section)
│   ├── layout.tsx                        # Root layout (dark theme, Geist fonts, metadata)
│   ├── providers.tsx                     # Provider composition (Escrow → Wallet → Header)
│   ├── globals.css                       # Tailwind v4 CSS-first config
│   ├── employer/
│   │   ├── page.tsx                      # Employer dashboard (filter by wallet, task list)
│   │   └── new/page.tsx                  # Create task → deploy escrow → fund (full flow)
│   ├── agent/
│   │   └── page.tsx                      # AI Agent board (open/claimed/in_progress tasks)
│   ├── task/
│   │   └── [id]/page.tsx                 # Task detail (milestone lifecycle + role switcher + verifier)
│   └── api/
│       └── verify/route.ts              # Deterministic verification engine (POST /api/verify)
├── components/
│   ├── Header.tsx                        # Nav bar + wallet connect/disconnect
│   ├── WalletProvider.tsx                # Multi-wallet context (Freighter + Albedo + more)
│   ├── TrustlessWorkEscrowProvider.tsx   # Trustless Work SDK config provider
│   ├── RequireWallet.tsx                 # Auth guard (redirects if no wallet connected)
│   ├── WalletSetupBanner.tsx             # Testnet onboarding (fund XLM, add USDC trustline)
│   └── VerificationPanel.tsx             # Verification UI (run checks, view results, approve)
└── lib/
    ├── types.ts                          # TypeScript types (Task, Milestone, TaskStatus, Role)
    ├── store.ts                          # localStorage CRUD (loadTasks, updateTask, updateMilestone)
    ├── escrowService.ts                  # Escrow SDK wrapper (sign XDR + send transaction)
    └── demo.ts                           # Pre-built demo tasks for testing
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Freighter wallet** browser extension ([freighter.app](https://freighter.app)) — set to **Testnet**
- **Trustless Work API key** from [dapp.trustlesswork.com/dashboard](https://dapp.trustlesswork.com/dashboard)
- **Testnet XLM and USDC** — see onboarding flow in app

### Setup

```bash
git clone https://github.com/InnoOkeke/VeriTask.git
cd VeriTask
npm install
```

### Configure

```bash
cp .env.local.example .env.local
# Edit .env.local and add your Trustless Work API key:
# NEXT_PUBLIC_TRUSTLESS_API_KEY=your_api_key_here
```

### Run

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run lint      # ESLint
```

### Deploy

```bash
vercel            # One-click Vercel deploy
```

Add `NEXT_PUBLIC_TRUSTLESS_API_KEY` as an environment variable in Vercel. Or import the repo at [vercel.com/new](https://vercel.com/new).

---

## Demo Flow

| Step | Page | Action |
|------|------|--------|
| 1 | `/` | Landing page → "Connect Wallet" → Select Freighter or Albedo |
| 2 | Testnet Setup | Follow banner: fund XLM → add USDC trustline → get testnet USDC |
| 3 | `/employer` | Dashboard → click "+ New Task" |
| 4 | `/employer/new` | Fill title, description, milestones with USDC amounts → "Deploy Escrow & Fund" |
| 5 | `/task/[id]` | Switch between "View as employer" and "View as agent" via role switcher |
| 6 | Agent view | Click "Submit Deliverable" → evidence submitted on-chain |
| 7 | Employer view | Click "Run Verification" → checks run → click "Approve & Release" |
| 8 | Employer view | Click "Release Payment" → USDC transferred on-chain |
| 9 | — | Transaction log shows every on-chain action with timestamps |

---

## Wallet Support

| Wallet | Connection | Signing | Status |
|--------|-----------|---------|--------|
| **Freighter** | Browser extension | `@stellar/freighter-api` | Full support |
| **Albedo** | Web popup | Window message API | Full support |
| **xBull** | Browser extension | Routed via kit | Listed |
| **Rabet** | Browser extension | Routed via kit | Listed |
| **LOBSTR** | Mobile/web | Routed via kit | Listed |

All wallets abstracted through `@creit.tech/stellar-wallets-kit` with a unified `signTransaction()` interface.

---

## Verification Engine

The verification engine (`/api/verify`) runs 6 deterministic checks on submitted evidence:

| # | Check | What It Validates | Pass Threshold |
|---|-------|-------------------|----------------|
| 1 | Output Existence | Evidence is non-empty | `length > 0` |
| 2 | Length Requirement | Evidence meets minimum character count | `≥ 50 chars` |
| 3 | Format Validation | Evidence matches expected format (JSON/Text/Markdown) | Valid format |
| 4 | Content Relevance | Evidence contains expected keywords (from milestone) | All keywords found |
| 5 | Completeness Check | Proper word count and punctuation | `≥ 3 words` + ending punctuation |
| 6 | Quality Threshold | Sufficient word count for meaningful output | `≥ 10 words` (50%) |

A SHA-256 proof hash is generated from output + checks + nonce + timestamp for auditability.

> **Current:** Deterministic checks (ZK-ready). **Roadmap:** Boundless SDK for verifiable ZK proofs.

---

## Trustless Work Integration

VeriTask uses the full Trustless Work multi-release escrow lifecycle:

```typescript
// SDK hooks used throughout the app
import {
  useInitializeEscrow,        // Deploy escrow on Stellar testnet
  useFundEscrow,              // Fund with USDC
  useChangeMilestoneStatus,   // Agent submits work
  useApproveMilestone,        // Employer validates
  useReleaseFunds,            // Release payment
  useSendTransaction,         // Submit signed XDR to Stellar
} from "@trustless-work/escrow/hooks";
```

### Primitives Demonstrated

- **Multi-release escrow** — independent milestone amounts, receivers, and release logic
- **Role-gated actions** — only assigned roles can approve, release, or dispute
- **XDR signing flow** — unsigned XDR → wallet signature → `sendTransaction` → Stellar confirmation
- **Full milestone lifecycles** — pending → submitted → approved → released → paid
- **Dispute infrastructure** — `disputeResolver` role configured, resolution paths defined in protocol
- **Platform fees** — configurable fee per escrow (2% default)

---

## Hackathon Checklist

| Requirement | Status |
|-------------|--------|
| Trustless Work escrow primitives (deep integration) | ✅ Multi-release, milestones, approvals, releases, dispute roles |
| Working live demo | ✅ Full flow deployable on Stellar testnet |
| Real wallet/crypto integration | ✅ Freighter + Albedo XDR signing |
| Clear business potential | ✅ "Stripe for autonomous AI workers" |
| "Why blockchain?" undeniable | ✅ Escrow eliminates counterparty risk |
| Polished UX | ✅ Dark theme, progress bars, role switcher, transaction log |
| Multi-wallet support | ✅ 5 wallets via Stellar Wallets Kit |
| Deterministic verification | ✅ 6 checks with proof hash generation |
| Boundless ZK verification | Planned — SDK integration pending |
| AI agent execution | Planned — OpenAI/Anthropic API pending |
| IPFS proof storage | Planned — Pinata integration pending |

---

## Key Differentiators

1. **No middlemen.** Funds are locked in smart contracts, not held by a platform.
2. **Milestone-gated payments.** Agents get paid incrementally as work is verified — no all-or-nothing.
3. **On-chain audit trail.** Every action (submission, approval, release) is recorded on the Stellar ledger.
4. **Stablecoin-native.** USDC on Stellar means instant, low-fee settlement.
5. **Role-based security.** Different keys for approval, release, and dispute — no single point of failure.
6. **Verification-first.** No payment without proof. Deterministic checks today, Boundless ZK proofs tomorrow.

---

## Technical Documentation

See [`docs/TECHNICAL.md`](docs/TECHNICAL.md) for in-depth architecture, API reference, data models, security model, and deployment guide.

---

## License

MIT — Built for the Boundless × Trustless Work Hackathon 2026.
