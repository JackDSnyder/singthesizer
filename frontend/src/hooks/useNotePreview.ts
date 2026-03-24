import { useCallback, useEffect, useRef, useState } from "react";
import type { PolySynth } from "tone";
import { createPreviewSynth } from "../audio/tone/synthFactory";
import { playNoteEvents, stopPlayback } from "../audio/tone/playNoteEvents";
import type { NoteEvent } from "../services/audioAnalysis";

/**
 * Lazy PolySynth + Transport preview for analyzed note_events.
 * Teardown on unmount (Strict Mode / navigation).
 */
export function useNotePreview() {
  const synthRef = useRef<PolySynth | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getSynth = useCallback((): PolySynth => {
    if (!synthRef.current) {
      synthRef.current = createPreviewSynth();
    }
    return synthRef.current;
  }, []);

  const stop = useCallback(() => {
    stopPlayback(synthRef.current ?? undefined);
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    async (events: NoteEvent[], bpm: number) => {
      if (events.length === 0) return;
      stopPlayback(getSynth());
      setIsPlaying(true);
      try {
        await playNoteEvents(events, bpm, getSynth(), () => {
          setIsPlaying(false);
        });
      } catch {
        setIsPlaying(false);
      }
    },
    [getSynth]
  );

  useEffect(() => {
    return () => {
      stopPlayback(synthRef.current ?? undefined);
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, []);

  return { isPlaying, play, stop };
}
