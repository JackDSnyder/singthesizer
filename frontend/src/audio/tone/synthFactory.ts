import * as Tone from "tone";

/** Preview synth for analyzed note_events; polyphony for overlapping notes. */
export function createPreviewSynth(): Tone.PolySynth {
  return new Tone.PolySynth({
    voice: Tone.Synth,
    maxPolyphony: 32,
    options: {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.15,
      },
    },
  }).toDestination();
}
