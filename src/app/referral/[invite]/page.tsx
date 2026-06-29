import { ReferralClient } from "@/components/ReferralClient";

export const metadata = {
  title: "dORE · Referral invite",
};

// Matches the share-link format /referral/join=<code>. The segment arrives as
// "join=<code>" (or a bare code); strip the "join=" prefix to recover the code.
export default function ReferralInvitePage({ params }: { params: { invite: string } }) {
  const raw = decodeURIComponent(params.invite);
  const code = raw.startsWith("join=") ? raw.slice("join=".length) : raw;
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">You&apos;re invited</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fog-dim">
          Accept the invite, then deposit on the pool. Your referrer earns a small cut of the volume the
          pool works on your behalf, and it costs you nothing.
        </p>
      </header>
      <ReferralClient inviteCode={code} />
    </div>
  );
}
