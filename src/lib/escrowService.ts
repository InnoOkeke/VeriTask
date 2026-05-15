"use client";

import { useWallet } from "@/components/WalletProvider";
import {
  useInitializeEscrow,
  useFundEscrow,
  useApproveMilestone,
  useChangeMilestoneStatus,
  useReleaseFunds,
  useSendTransaction,
  useUpdateEscrow,
} from "@trustless-work/escrow/hooks";
import type {
  InitializeMultiReleaseEscrowPayload,
  InitializeMultiReleaseEscrowResponse,
  FundEscrowPayload,
  ApproveMilestonePayload,
  ChangeMilestoneStatusPayload,
  MultiReleaseReleaseFundsPayload,
  UpdateMultiReleaseEscrowPayload,
} from "@trustless-work/escrow";

export const useEscrowService = () => {
  const { signTransaction } = useWallet();
  const { deployEscrow } = useInitializeEscrow();
  const { fundEscrow } = useFundEscrow();
  const { changeMilestoneStatus } = useChangeMilestoneStatus();
  const { approveMilestone } = useApproveMilestone();
  const { releaseFunds } = useReleaseFunds();
  const { sendTransaction } = useSendTransaction();
  const { updateEscrow } = useUpdateEscrow();

  const handleDeploy = async (payload: InitializeMultiReleaseEscrowPayload): Promise<InitializeMultiReleaseEscrowResponse> => {
    const unsigned = await deployEscrow(payload, "multi-release");
    if (!unsigned?.unsignedTransaction) {
      throw new Error(`Escrow API returned no unsigned transaction. Response: ${JSON.stringify(unsigned)}`);
    }
    const signedXdr = await signTransaction(unsigned.unsignedTransaction, payload.signer);
    const result = await sendTransaction(signedXdr) as InitializeMultiReleaseEscrowResponse;
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

  const handleUpdateMilestoneReceiver = async (
    contractId: string,
    milestoneIndex: number,
    agentAddress: string,
    signer: string,
    storedEscrow: Record<string, unknown>
  ) => {
    const r = storedEscrow.roles as Record<string, string>;
    const tl = storedEscrow.trustline as Record<string, string>;
    const milestones = [...(storedEscrow.milestones as Record<string, unknown>[])];
    milestones[milestoneIndex] = { ...milestones[milestoneIndex], receiver: agentAddress };

    const payload: UpdateMultiReleaseEscrowPayload = {
      contractId,
      signer,
      escrow: {
        engagementId: storedEscrow.engagementId as string,
        title: storedEscrow.title as string,
        description: storedEscrow.description as string,
        platformFee: storedEscrow.platformFee as number,
        roles: {
          approver: r.approver,
          serviceProvider: r.serviceProvider,
          platformAddress: r.platformAddress,
          releaseSigner: r.releaseSigner,
          disputeResolver: r.disputeResolver,
        },
        milestones: milestones as UpdateMultiReleaseEscrowPayload["escrow"]["milestones"],
        trustline: { symbol: tl.symbol || "USDC", address: tl.address || "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" },
        isActive: true,
      },
    };

    const unsigned = await updateEscrow(payload, "multi-release");
    const signedXdr = await signTransaction(unsigned.unsignedTransaction!, signer);
    return sendTransaction(signedXdr);
  };

  return {
    handleDeploy,
    handleFund,
    handleChangeMilestoneStatus,
    handleApproveMilestone,
    handleReleaseFunds,
    handleUpdateMilestoneReceiver,
  };
};
