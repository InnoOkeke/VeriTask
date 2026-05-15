"use client";

import { useWallet } from "@/components/WalletProvider";
import {
  useInitializeEscrow,
  useFundEscrow,
  useApproveMilestone,
  useChangeMilestoneStatus,
  useReleaseFunds,
  useSendTransaction,
  useGetEscrowsFromIndexerBySigner,
} from "@trustless-work/escrow/hooks";
import type {
  EscrowType,
  InitializeMultiReleaseEscrowPayload,
  InitializeMultiReleaseEscrowResponse,
  FundEscrowPayload,
  ApproveMilestonePayload,
  ChangeMilestoneStatusPayload,
  MultiReleaseReleaseFundsPayload,
  GetEscrowsFromIndexerBySignerParams,
} from "@trustless-work/escrow";

function extractError(err: unknown): string {
  const e = err as { response?: { data?: unknown; status?: number }; message?: string };
  if (e.response?.data) {
    return `API ${e.response.status || "error"}: ${JSON.stringify(e.response.data)}`;
  }
  return e.message || String(err);
}

export function useEscrowService() {
  const { signXdr } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { approveMilestone } = useApproveMilestone();
  const { changeMilestoneStatus } = useChangeMilestoneStatus();
  const { releaseFunds } = useReleaseFunds();
  const { sendTransaction } = useSendTransaction();
  const { getEscrowsBySigner } = useGetEscrowsFromIndexerBySigner();

  const signAndSend = async (unsignedXdr: string) => {
    const signed = await signXdr(unsignedXdr);
    return sendTransaction(signed);
  };

  return {
    deploy: async (payload: InitializeMultiReleaseEscrowPayload) => {
      try {
        const res = await deployEscrow(payload, "multi-release" as EscrowType);
        if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
          throw new Error(`Deploy failed: ${JSON.stringify(res)}`);
        }
        const txRes = await signAndSend(res.unsignedTransaction);
        if (txRes.status !== "SUCCESS") {
          throw new Error(`Deploy tx failed: ${JSON.stringify(txRes)}`);
        }
        const initRes = txRes as InitializeMultiReleaseEscrowResponse;
        if (!initRes.contractId) {
          throw new Error(`No contractId in response: ${JSON.stringify(txRes)}`);
        }
        return initRes;
      } catch (err) {
        throw new Error(`Deploy error: ${extractError(err)}`);
      }
    },

    fund: async (payload: FundEscrowPayload) => {
      try {
        const res = await fundEscrow(payload, "multi-release" as EscrowType);
        if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
          throw new Error(`Fund failed: ${JSON.stringify(res)}`);
        }
        return signAndSend(res.unsignedTransaction);
      } catch (err) {
        throw new Error(`Fund error: ${extractError(err)}`);
      }
    },

    approve: async (payload: ApproveMilestonePayload) => {
      try {
        const res = await approveMilestone(payload, "multi-release" as EscrowType);
        if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
          throw new Error(`Approve failed: ${JSON.stringify(res)}`);
        }
        return signAndSend(res.unsignedTransaction);
      } catch (err) {
        throw new Error(`Approve error: ${extractError(err)}`);
      }
    },

    changeStatus: async (payload: ChangeMilestoneStatusPayload) => {
      try {
        const res = await changeMilestoneStatus(payload, "multi-release" as EscrowType);
        if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
          throw new Error(`Status change failed: ${JSON.stringify(res)}`);
        }
        return signAndSend(res.unsignedTransaction);
      } catch (err) {
        throw new Error(`Status error: ${extractError(err)}`);
      }
    },

    release: async (payload: MultiReleaseReleaseFundsPayload) => {
      try {
        const res = await releaseFunds(payload, "multi-release" as EscrowType);
        if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
          throw new Error(`Release failed: ${JSON.stringify(res)}`);
        }
        return signAndSend(res.unsignedTransaction);
      } catch (err) {
        throw new Error(`Release error: ${extractError(err)}`);
      }
    },

    getEscrows: async (params: GetEscrowsFromIndexerBySignerParams) => {
      return getEscrowsBySigner(params);
    },
  };
}
