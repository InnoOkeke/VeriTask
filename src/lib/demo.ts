import type { Task } from "./types";

export const DEMO_TASKS: Task[] = [
  {
    id: "demo-1",
    title: "Generate Product Descriptions for E-Commerce Catalog",
    description:
      "Write SEO-optimized product descriptions for 500 SKUs in our fashion catalog. Must follow brand tone guidelines.",
    totalAmount: 250,
    asset: "USDC",
    status: "open",
    milestones: [
      { id: "m1", description: "Submit 50 sample descriptions for review", amount: 50, status: "pending" },
      { id: "m2", description: "Complete remaining 450 descriptions", amount: 100, status: "pending" },
      { id: "m3", description: "SEO optimization pass and final delivery", amount: 100, status: "pending" },
    ],
    employerAddress: "GDEMO...EMPLOYER",
    engagementId: "eng-001",
    createdAt: new Date("2026-05-10"),
  },
  {
    id: "demo-2",
    title: "Moderate 10,000 User Comments",
    description:
      "Review and classify user-generated comments for a social platform. Flag inappropriate content following our moderation guidelines.",
    totalAmount: 500,
    asset: "USDC",
    status: "open",
    milestones: [
      { id: "m1", description: "Complete first batch of 2,500 comments", amount: 125, status: "pending" },
      { id: "m2", description: "Complete second batch of 2,500 comments", amount: 125, status: "pending" },
      { id: "m3", description: "Complete third batch of 2,500 comments", amount: 125, status: "pending" },
      { id: "m4", description: "Final batch and quality report", amount: 125, status: "pending" },
    ],
    employerAddress: "GDEMO...EMPLOYER",
    engagementId: "eng-002",
    createdAt: new Date("2026-05-12"),
  },
];
