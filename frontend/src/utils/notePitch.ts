import type { NoteEvent } from "../services/audioAnalysis";

/** Must match backend `ALL_PITCH_CLASSES` order. */
export const PITCH_CLASSES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const FALLBACK_MIDI = 60;

/**
 * MIDI note number (0–127), same convention as backend `pitch_tuple_to_midi`.
 */
export function noteEventToMidi(ev: NoteEvent): number {
  const idx = PITCH_CLASSES.indexOf(ev.pitch_class as (typeof PITCH_CLASSES)[number]);
  if (idx === -1) return FALLBACK_MIDI;
  return Math.min(127, Math.max(0, idx + 12 * (ev.octave + 1)));
}

export function midiToLabel(midi: number): string {
  const m = Math.round(Math.max(0, Math.min(127, midi)));
  const pc = PITCH_CLASSES[m % 12];
  const octave = Math.floor(m / 12) - 1;
  return `${pc}${octave}`;
}
