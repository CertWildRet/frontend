"use client";

import { useMemo } from "react";
import { Connection } from "@solana/web3.js";
import { rpcEndpoint } from "@/lib/cwr";

/**
 * Read-only Solana connection for routes that do not mount wallet-adapter
 * providers (e.g. /stats). Uses the same `/api/rpc` proxy as vault pages.
 */
export function useReadonlyRpc(): Connection {
  return useMemo(() => new Connection(rpcEndpoint(), { commitment: "confirmed" }), []);
}
