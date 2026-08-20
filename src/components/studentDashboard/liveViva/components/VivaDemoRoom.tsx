"use client";

import { CheckCircle2, Loader2, Monitor } from "lucide-react";
import AgoraVideoRoom from "@/components/agora/AgoraVideoRoom";
import type { ScreenTrack } from "@/components/agora/components/AgoraRoomView";
import { Button } from "@/components/ui/button";

interface VivaDemoRoomProps {
  sessionId: string;
  endingDemo: boolean;
  onLocalTracks: (videoTrack: unknown, audioTrack: unknown) => void;
  onScreenTrackChange: (track: ScreenTrack) => void;
  onEndDemo: () => Promise<void>;
}

export function VivaDemoRoom({
  sessionId,
  endingDemo,
  onLocalTracks,
  onScreenTrackChange,
  onEndDemo,
}: VivaDemoRoomProps) {
  return (
    <div className="relative flex h-full w-full bg-slate-950">
      <div className="relative flex-1">
        <AgoraVideoRoom
          sessionId={sessionId}
          className="rounded-none border-0"
          onLocalTracks={onLocalTracks}
          onScreenShareChange={(_sharing, track) => onScreenTrackChange(track)}
          remoteJoinNotice="Examiner joining now"
          hideEndCallButton
        />
      </div>

      <div className="z-30 flex w-[360px] flex-col justify-center space-y-6 border-l border-slate-800/80 bg-slate-900/95 p-6 text-slate-100 shadow-2xl">
        <div className="space-y-3 text-center">
          <Monitor className="mx-auto h-12 w-12 text-amber-400" />
          <h3 className="text-lg font-bold text-slate-100">
            Presentation Demo
          </h3>
          <p className="text-xs leading-relaxed text-slate-400">
            Use &quot;Share Screen&quot; to present. Any student in the project
            group can trigger the transition to the viva.
          </p>
        </div>

        <Button
          onClick={onEndDemo}
          disabled={endingDemo}
          className="h-11 w-full bg-blue-600 font-semibold text-white shadow-xl hover:bg-blue-700"
        >
          {endingDemo ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Transitioning...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" /> End Demo &amp; Start
              Viva
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
