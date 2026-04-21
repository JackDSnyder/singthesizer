import { useEffect, useMemo, useState } from "react";
import * as Tone from "tone";
import type { NoteEvent } from "../services/audioAnalysis";
import { computeTimelineBeats } from "../utils/timelineBeats";

export type UsePlayheadBeatOptions = {
  isPlaying: boolean;
  bpm: number;
  noteEvents: NoteEvent[];
  /** Project length in beats (e.g. bars × 4). */
  totalBeats: number;
  /**
   * Horizontal extent for clamping / display (must match the roll).
   * When omitted, uses `computeTimelineBeats(noteEvents, totalBeats)`.
   */
  timelineWidthBeats?: number;
};

/**
 * Maps Tone Transport time to beat position for a piano-roll playhead.
 * Returns null when not playing.
 */
export function usePlayheadBeat({
  isPlaying,
  bpm,
  noteEvents,
  totalBeats,
  timelineWidthBeats: timelineOverride,
}: UsePlayheadBeatOptions): number | null {
  const [beat, setBeat] = useState<number | null>(null);

  const timelineWidth = useMemo(
    () => timelineOverride ?? computeTimelineBeats(noteEvents, totalBeats),
    [timelineOverride, noteEvents, totalBeats],
  );

  useEffect(() => {
    let frameId = 0;

    if (!isPlaying) {
      frameId = requestAnimationFrame(() => setBeat(null));
      return () => cancelAnimationFrame(frameId);
    }

    const tick = () => {
      const sec = Tone.getTransport().seconds;
      const b = sec * (bpm / 60);
      const clamped = Math.min(Math.max(0, b), timelineWidth);
      setBeat(clamped);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, bpm, timelineWidth]);

  return beat;
}
