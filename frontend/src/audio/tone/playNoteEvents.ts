import * as Tone from "tone";
import type { NoteEvent } from "../../services/audioAnalysis";

/**
 * Stop transport, clear scheduled callbacks, reset timeline to the start, set BPM.
 */
export function configureTransport(bpm: number): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(0);
  transport.position = 0;
  transport.bpm.value = bpm;
}

/**
 * Halt preview: stop timeline, cancel future callbacks, reset position, silence synth.
 */
export function stopPlayback(synth?: Tone.PolySynth): void {
  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel(0);
  transport.position = 0;
  synth?.releaseAll();
}

/**
 * Schedule `note_events` from t = 0 on the shared Transport (beats → seconds via BPM).
 * Call from a user gesture after `await Tone.start()` (handled here).
 *
 * @param onEnded — invoked when the last note has finished (transport stopped).
 */
export async function playNoteEvents(
  events: NoteEvent[],
  bpm: number,
  synth: Tone.PolySynth,
  onEnded?: () => void
): Promise<void> {
  if (events.length === 0) return;

  await Tone.start();

  configureTransport(bpm);

  const transport = Tone.getTransport();
  const beatToSec = 60 / bpm;
  let maxEnd = 0;

  for (const ev of events) {
    const startSec = ev.start * beatToSec;
    const durSec = Math.max(0.02, ev.duration * beatToSec);
    const note = `${ev.pitch_class}${ev.octave}`;

    transport.schedule((time) => {
      synth.triggerAttackRelease(note, durSec, time);
    }, startSec);

    maxEnd = Math.max(maxEnd, startSec + durSec);
  }

  transport.schedule(() => {
    transport.stop();
    transport.cancel(0);
    transport.position = 0;
    synth.releaseAll();
    onEnded?.();
  }, maxEnd);

  transport.start();
}
