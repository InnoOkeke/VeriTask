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
    },

    fund: async (payload: FundEscrowPayload) => {
      const res = await fundEscrow(payload, "multi-release" as EscrowType);
      if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
        throw new Error(`Fund failed: ${JSON.stringify(res)}`);
      }
      return signAndSend(res.unsignedTransaction);
    },

    approve: async (payload: ApproveMilestonePayload) => {
      const res = await approveMilestone(payload, "multi-release" as EscrowType);
      if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
        throw new Error("Failed to approve milestone");
      }
      return signAndSend(res.unsignedTransaction);
    },

    changeStatus: async (payload: ChangeMilestoneStatusPayload) => {
      const res = await changeMilestoneStatus(payload, "multi-release" as EscrowType);
      if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
        throw new Error("Failed to change milestone status");
      }
      return signAndSend(res.unsignedTransaction);
    },

    release: async (payload: MultiReleaseReleaseFundsPayload) => {
      const res = await releaseFunds(payload, "multi-release" as EscrowType);
      if (res.status !== "SUCCESS" || !res.unsignedTransaction) {
        throw new Error("Failed to release funds");
      }
      return signAndSend(res.unsignedTransaction);
    },

    getEscrows: async (params: GetEscrowsFromIndexerBySignerParams) => {
      return getEscrowsBySigner(params);
    },
  };
}
