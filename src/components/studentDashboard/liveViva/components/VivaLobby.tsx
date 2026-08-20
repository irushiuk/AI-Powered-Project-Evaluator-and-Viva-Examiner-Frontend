"use client";

import { ChevronRight, Loader2, Monitor } from "lucide-react";
import AgoraVideoRoom from "@/components/agora/AgoraVideoRoom";
import { Button } from "@/components/ui/button";

interface VivaLobbyProps {
  sessionId: string;
  phase: "scheduled" | "ongoing" | "live";
  demoEnabled: boolean;
  startingSession: boolean;
  onLocalTracks: (videoTrack: unknown, audioTrack: unknown) => void;
  onStartDemo: () => Promise<void>;
  onStartViva: () => Promise<void>;
}

export function VivaLobby({
  sessionId,
  phase,
  demoEnabled,
  startingSession,
  onLocalTracks,
  onStartDemo,
  onStartViva,
}: VivaLobbyProps) {
  return (
    <div className="relative flex h-full w-full bg-slate-950">
      <div className="relative flex-1">
        <AgoraVideoRoom
          sessionId={sessionId}
          className="rounded-none border-0"
          onLocalTracks={onLocalTracks}
          remoteJoinNotice="Examiner joining now"
          hideEndCallButton
        />
      </div>

      <div className="z-30 flex w-[360px] flex-col justify-center space-y-6 border-l border-slate-800/80 bg-slate-900/95 p-6 text-slate-100 shadow-2xl">
        <div className="space-y-3 text-center">
          <Monitor className="mx-auto h-12 w-12 animate-pulse text-blue-400" />
          <h3 className="text-lg font-bold text-slate-100">Lobby Room</h3>
          <p className="text-xs leading-relaxed text-slate-400">
            {phase === "ongoing"
              ? "Scheduled time has arrived. Waiting for participants to join..."
              : "At least one student is active in the room. You can start the evaluation below."}
          </p>
        </div>

        <div className="space-y-3">
          {demoEnabled ? (
            <Button
              onClick={onStartDemo}
              disabled={startingSession}
              className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              {startingSession ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting
                  Demo...
                </>
              ) : (
                <>
                  <Monitor className="mr-2 h-5 w-5" /> Start Demo
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={onStartViva}
              disabled={startingSession}
              className="h-11 w-full bg-blue-600 font-semibold text-white hover:bg-blue-700"
            >
              {startingSession ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  <ChevronRight className="mr-2 h-5 w-5" /> Start Viva
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
