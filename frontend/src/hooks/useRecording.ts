import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRecorder,
  requestMicrophonePermission,
  startRecorderWithChunks,
  stopRecorder,
  stopMediaStream,
} from "../services/recording";

/** `counting` = mic acquired, 3s count-in before MediaRecorder starts */
export type RecordingStatus = "idle" | "counting" | "recording" | "stopped";

const COUNT_IN_SECONDS = 3;
const COUNT_IN_STEP_MS = 1000;

export interface UseRecordingOptions {
  /** When set, auto-stops recording at this many seconds (project length). */
  maxSeconds?: number;
}

export function useRecording(options: UseRecordingOptions = {}) {
  const { maxSeconds } = options;

  const [status, setStatus] = useState<RecordingStatus>("idle");
  /** During count-in: 3, 2, 1 — then recording starts */
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const countInTimeoutsRef = useRef<number[]>([]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearCountIn = useCallback(() => {
    countInTimeoutsRef.current.forEach((id) => clearTimeout(id));
    countInTimeoutsRef.current = [];
    setCountdown(null);
  }, []);

  const stopRecording = useCallback(async () => {
    clearCountIn();
    clearTimer();
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setStatus((s) => {
        if (s === "recording") return "stopped";
        if (s === "counting") return "idle";
        return s;
      });
      return;
    }

    try {
      const b = await stopRecorder(recorder, chunksRef.current);
      setBlob(b);
      setStatus("stopped");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to finalize recording");
      setStatus("idle");
    } finally {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
    }
  }, [clearCountIn, clearTimer]);

  const startRecording = useCallback(async () => {
    setError(null);
    setBlob(null);
    chunksRef.current = [];
    clearTimer();
    clearCountIn();

    try {
      const stream = await requestMicrophonePermission();
      streamRef.current = stream;
      const { recorder } = createRecorder(stream);
      recorderRef.current = recorder;

      setStatus("counting");
      setCountdown(3);

      const t1 = window.setTimeout(() => {
        setCountdown(2);
      }, COUNT_IN_STEP_MS);
      const t2 = window.setTimeout(() => {
        setCountdown(1);
      }, COUNT_IN_STEP_MS * 2);
      const t3 = window.setTimeout(() => {
        startRecorderWithChunks(recorder, chunksRef.current);
        setStatus("recording");
        setCountdown(null);
        setElapsedSeconds(0);
        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          setElapsedSeconds(elapsed);

          if (
            maxSeconds !== undefined &&
            maxSeconds > 0 &&
            elapsed >= maxSeconds
          ) {
            void stopRecording();
          }
        }, 100);
      }, COUNT_IN_SECONDS * 1000);

      countInTimeoutsRef.current = [t1, t2, t3];
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError(
          "Microphone access was denied. Allow the microphone in your browser settings and try again."
        );
      } else if (name === "NotFoundError") {
        setError("No microphone was found.");
      } else {
        setError(
          e instanceof Error ? e.message : "Could not access the microphone."
        );
      }
      setStatus("idle");
      setCountdown(null);
      stopMediaStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
    }
  }, [clearCountIn, clearTimer, maxSeconds, stopRecording]);

  const reset = useCallback(() => {
    clearCountIn();
    clearTimer();
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setBlob(null);
    setError(null);
    setElapsedSeconds(0);
    setStatus("idle");
  }, [clearCountIn, clearTimer]);

  useEffect(() => {
    return () => {
      clearCountIn();
      clearTimer();
      stopMediaStream(streamRef.current);
    };
  }, [clearCountIn, clearTimer]);

  return {
    status,
    countdown,
    elapsedSeconds,
    blob,
    error,
    startRecording,
    stopRecording,
    reset,
    targetSeconds: maxSeconds !== undefined ? maxSeconds : null,
  };
}
