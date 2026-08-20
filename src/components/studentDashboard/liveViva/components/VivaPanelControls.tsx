"use client";

import { ArrowLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VivaPanelControlsProps {
  panelOpen: boolean;
  hasCurrentQuestion: boolean;
  onTogglePanel: () => void;
  onExit: () => void;
}

export function VivaPanelControls({
  panelOpen,
  hasCurrentQuestion,
  onTogglePanel,
  onExit,
}: VivaPanelControlsProps) {
  return (
    <>
      <div className="mx-1 h-8 w-px bg-slate-700/50" />
      <Button
        variant={panelOpen ? "default" : "outline"}
        size="icon"
        onClick={onTogglePanel}
        className={`relative h-12 w-12 rounded-full shadow-md transition-all duration-300 hover:scale-105 ${panelOpen ? "bg-blue-600 text-white hover:bg-blue-700" : ""}`}
        title="Toggle Q&A Panel"
      >
        <MessageSquareText className="h-5 w-5" />
        {hasCurrentQuestion && !panelOpen && (
          <span className="absolute -top-1 -right-1 h-3 w-3 animate-pulse rounded-full bg-red-500" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onExit}
        className="ml-1 rounded-full px-3 text-slate-400 hover:bg-slate-800 hover:text-white"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Exit
      </Button>
    </>
  );
}

interface CollapsedQATabProps {
  visible: boolean;
  hasCurrentQuestion: boolean;
  onOpen: () => void;
}

export function CollapsedQATab({
  visible,
  hasCurrentQuestion,
  onOpen,
}: CollapsedQATabProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onOpen}
      className="absolute right-0 top-1/2 z-30 flex -translate-y-1/2 cursor-pointer flex-col items-center gap-2
        rounded-l-2xl bg-blue-600/90 px-4 py-8 text-white shadow-xl backdrop-blur-md
        transition-all duration-300 hover:bg-blue-600 hover:px-5"
      aria-label="Open Q&A panel"
    >
      <ChevronRight className="h-5 w-5 rotate-180" />
      <span className="rotate-180 text-[14px] font-bold tracking-wider [writing-mode:vertical-lr]">
        Q&amp;A
      </span>
      {hasCurrentQuestion && (
        <span className="mt-1 h-3 w-3 animate-pulse rounded-full bg-red-500" />
      )}
    </button>
  );
}
