import type { NoteEvent } from "../services/audioAnalysis";

/**
 * Horizontal extent of the piano roll in beats: at least project length,
 * at least the last note end, and a small floor for empty edge cases.
 */
export function computeTimelineBeats(
  noteEvents: readonly NoteEvent[],
  totalBeats: number
): number {
  let end = 0;
  for (const ev of noteEvents) {
    end = Math.max(end, ev.start + ev.duration);
  }
  return Math.max(totalBeats, end, 0.25);
}
