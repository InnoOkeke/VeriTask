"use client";

import React from "react";
import type { ReactNode } from "react";
import { development, TrustlessWorkConfig } from "@trustless-work/escrow";

export function TrustlessWorkEscrowProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_TRUSTLESS_API_KEY || "";

  return (
    <TrustlessWorkConfig baseURL={development} apiKey={apiKey}>
      {children}
    </TrustlessWorkConfig>
  );
}
