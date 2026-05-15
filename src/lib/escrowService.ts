"use client";

import { useWallet } from "@/components/WalletProvider";
import {
  useInitializeEscrow,
  useFundEscrow,
  useApproveMilestone,
  useChangeMilestoneStatus,
  useReleaseFunds,
  useSendTransaction,
} from "@trustless-work/escrow/hooks";
import type {
  InitializeMultiReleaseEscrowPayload,
  FundEscrowPayload,
  ApproveMilestonePayload,
  ChangeMilestoneStatusPayload,
  MultiReleaseReleaseFundsPayload,
} from "@trustless-work/escrow";

export const useEscrowService = () => {
  const { walletAddress, signTransaction } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { changeMilestoneStatus } = useChangeMilestoneStatus();
  const { approveMilestone } = useApproveMilestone();
  const { releaseFunds } = useReleaseFunds();
  const { sendTransaction } = useSendTransaction();

  const handleDeploy = async (payload: InitializeMultiReleaseEscrowPayload) => {
    const unsigned = await deployEscrow(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.signer);
    const result = await sendTransaction(signedXdr);
    return result;
  };

  const handleFund = async (payload: FundEscrowPayload) => {
    const unsigned = await fundEscrow(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.signer);
    return sendTransaction(signedXdr);
  };

  const handleChangeMilestoneStatus = async (payload: ChangeMilestoneStatusPayload) => {
    const unsigned = await changeMilestoneStatus(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.serviceProvider);
    return sendTransaction(signedXdr);
  };

  const handleApproveMilestone = async (payload: ApproveMilestonePayload) => {
    const unsigned = await approveMilestone(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.approver);
    return sendTransaction(signedXdr);
  };

  const handleReleaseFunds = async (payload: MultiReleaseReleaseFundsPayload) => {
    const unsigned = await releaseFunds(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, payload.releaseSigner);
    return sendTransaction(signedXdr);
  };

  return {
    handleDeploy,
    handleFund,
    handleChangeMilestoneStatus,
    handleApproveMilestone,
    handleReleaseFunds,
  };
};
