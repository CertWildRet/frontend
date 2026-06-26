import { ReferralClient } from "@/components/ReferralClient";

export const metadata = {
  title: "CWR · Referral program",
};

export default function ReferralPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Earn 0.1% Every Minute</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
          Invite your friends and earn 0.1% of the deploy volume. Choose to claim your referral earnings at
          the end of the pool cycle or get it dripfed to your wallet every 5 minutes.
        </p>
      </header>
      <ReferralClient />
    </div>
  );
}
