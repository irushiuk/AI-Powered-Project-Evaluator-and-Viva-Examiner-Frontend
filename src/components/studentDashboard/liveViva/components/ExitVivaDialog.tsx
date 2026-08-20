"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExitVivaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ExitVivaDialog({
  open,
  onOpenChange,
  onConfirm,
}: ExitVivaDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-slate-700 bg-slate-900 text-slate-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-100">
            Exit Viva Session?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Your session is still in progress. If you leave now, your current
            question will be lost and you may not be able to rejoin. Are you
            sure you want to exit?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white">
            Stay in Session
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Exit Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
