"use client";

/**
 * useOreLive — live ORE stats over the analytics WebSocket (/stream).
 *
 * There is no wss precedent in this app (only the brain SSE via useLiveStats), so
 * this is net-new: it models useLiveStats' connect -> reconnect -> cleanup effect
 * lifecycle but swaps EventSource for a raw WebSocket with manual exponential
 * backoff (EventSource auto-reconnects; WebSocket does not). Frames are
 * { type: 'round:new' | 'round:live' | 'participants', data }.
 */
import { useEffect, useRef, useState } from "react";
import { ORE_WS_URL } from "@/lib/oreStats";

export type LiveRound = {
  round_id: number;
  expires_at: string | null;
  total_deployed: string | null;
  total_miners: string | null;
  total_vaulted: string | null;
  total_winnings: string | null;
  motherlode_paid: string | null;
  top_miner: string | null;
  top_miner_reward: string | null;
  winning_tile: number | null;
  deployed: string[]; // 25
  count: string[]; // 25
};

export type LiveParticipants = {
  round_id: number;
  miners: number;
  top: { authority: string; deploys: number; total_sol: string }[];
  attribution: string;
};

export function useOreLive() {
  const [connected, setConnected] = useState(false);
  const [round, setRound] = useState<LiveRound | null>(null);
  const [participants, setParticipants] = useState<LiveParticipants | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);

  // keep the latest setters stable across reconnects via refs
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let closed = false;
    let backoff = 1000;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(ORE_WS_URL);
      } catch {
        schedule();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        backoff = 1000; // reset backoff on a clean connect
      };
      ws.onmessage = (e) => {
        try {
          const frame = JSON.parse(e.data) as { type: string; data: any };
          if (frame.type === "round:live") setRound(frame.data as LiveRound);
          else if (frame.type === "participants") setParticipants(frame.data as LiveParticipants);
          else if (frame.type === "round:new") setParticipants(null); // fresh round -> clear last round's board
          setUpdatedAt(Date.now());
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        schedule();
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* already closing */ }
      };
    };

    const schedule = () => {
      if (closed || retry) return;
      retry = setTimeout(() => {
        retry = null;
        backoff = Math.min(backoff * 1.8, 20_000); // capped exponential backoff
        connect();
      }, backoff);
    };

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, []);

  return { connected, round, participants, updatedAt };
}
