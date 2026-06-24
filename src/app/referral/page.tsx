import { ReferralClient } from "@/components/ReferralClient";

export const metadata = {
  title: "CWR · Referral program",
};

export default function ReferralPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Referral program</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
          Bring miners to the pool and earn 0.1% of the deploy volume their capital works — paid from the
          protocol fee, never out of their pocket. Register for a share link, watch it accrue, and claim
          anytime (or let the keeper auto-send it).
        </p>
      </header>
      <ReferralClient />
    </div>
  );
}
