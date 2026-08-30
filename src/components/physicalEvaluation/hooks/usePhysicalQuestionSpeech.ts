"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { physicalEvaluationService } from "@/services/physicalEvaluationService";
import type { VivaQuestion } from "@/types/vivaSession";

type Options = {
  enabled: boolean;
  sessionId: string | null;
  question: VivaQuestion | null;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
};

/**
 * Plays the server-generated ElevenLabs question in the physical kiosk.
 * The browser voice remains a last-resort fallback so a TTS outage can never
 * prevent a viva from continuing.
 */
export function usePhysicalQuestionSpeech({
  enabled,
  sessionId,
  question,
  onPlaybackStart,
  onPlaybackEnd,
}: Options) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [replayVersion, setReplayVersion] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speakingRef = useRef(false);
  const playbackIdRef = useRef(0);
  const onStartRef = useRef(onPlaybackStart);
  const onEndRef = useRef(onPlaybackEnd);

  useEffect(() => {
    onStartRef.current = onPlaybackStart;
    onEndRef.current = onPlaybackEnd;
  }, [onPlaybackEnd, onPlaybackStart]);

  const finishSpeaking = useCallback(() => {
    if (!speakingRef.current) return;
    speakingRef.current = false;
    setIsSpeaking(false);
    onEndRef.current?.();
  }, []);

  const cancel = useCallback(() => {
    playbackIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    finishSpeaking();
  }, [finishSpeaking]);

  const replay = useCallback(() => {
    if (!enabled || !sessionId || !question) return;
    setReplayVersion((current) => current + 1);
  }, [enabled, question, sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId || !question?.question_text) {
      cancel();
      return;
    }

    cancel();
    const playbackId = ++playbackIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    speakingRef.current = true;
    setIsSpeaking(true);
    onStartRef.current?.();

    const isCurrent = () => (
      playbackIdRef.current === playbackId && !controller.signal.aborted
    );
    const wait = (milliseconds: number) => new Promise<void>((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });

    const playFromUrl = (url: string): Promise<boolean> => {
      if (!isCurrent()) return Promise.resolve(false);
      return new Promise<boolean>((resolve) => {
        const audio = new Audio(url);
        audio.preload = "auto";
        audioRef.current = audio;
        let settled = false;
        const settle = (played: boolean) => {
          if (settled) return;
          settled = true;
          if (!played) {
            audio.pause();
            if (audioRef.current === audio) audioRef.current = null;
          }
          resolve(played);
        };
        audio.onplay = () => {
          if ("speechSynthesis" in window) window.speechSynthesis.cancel();
          settle(true);
        };
        audio.onended = () => {
          if (audioRef.current === audio) audioRef.current = null;
          if (isCurrent()) finishSpeaking();
        };
        audio.onerror = () => settle(false);
        void audio.play().catch(() => settle(false));
      });
    };

    const speakWithBrowser = () => {
      if (!isCurrent()) return;
      if (!("speechSynthesis" in window)) {
        finishSpeaking();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(question.question_text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onend = () => {
        if (isCurrent()) finishSpeaking();
      };
      utterance.onerror = () => {
        if (isCurrent()) finishSpeaking();
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    const playQuestion = async () => {
      const ttsStatus = question.tts_status ?? "disabled";
      if (ttsStatus === "disabled" || ttsStatus === "failed") {
        speakWithBrowser();
        return;
      }

      if (question.audio_url && await playFromUrl(question.audio_url)) return;

      try {
        const delays = [150, 300, 500, 800];
        for (const delay of delays) {
          await wait(delay);
          if (!isCurrent()) return;
          const response = await physicalEvaluationService.getQuestionAudio(
            sessionId,
            question.question_id,
            controller.signal,
          );
          if (!isCurrent()) return;

          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const payload = await response.json() as { audio_url?: string };
              if (payload.audio_url && await playFromUrl(payload.audio_url)) return;
            } else {
              const blob = await response.blob();
              if (!isCurrent()) return;
              const blobUrl = URL.createObjectURL(blob);
              blobUrlRef.current = blobUrl;
              if (await playFromUrl(blobUrl)) return;
              URL.revokeObjectURL(blobUrl);
              if (blobUrlRef.current === blobUrl) blobUrlRef.current = null;
            }
          }
          if (response.status !== 200 && response.status !== 202) break;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }

      if (isCurrent()) speakWithBrowser();
    };

    void playQuestion();
    return cancel;
  }, [
    cancel,
    enabled,
    finishSpeaking,
    question?.audio_url,
    question?.question_id,
    question?.question_text,
    question?.tts_status,
    replayVersion,
    sessionId,
  ]);

  useEffect(() => cancel, [cancel]);

  return { isSpeaking, replay, cancel };
}
