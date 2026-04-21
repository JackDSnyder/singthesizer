import type { NoteEvent } from "../../services/audioAnalysis";
import { midiToLabel, noteEventToMidi } from "../../utils/notePitch";
import { computeTimelineBeats } from "../../utils/timelineBeats";

const ROW_PX_DEFAULT = 22;
const ROW_PX_COMPACT = 16;
const RANGE_PAD_SEMITONES = 2;
const MAX_BEAT_LINES = 256;

function computeMidiRange(noteEvents: NoteEvent[]): {
  minMidi: number;
  maxMidi: number;
} | null {
  if (noteEvents.length === 0) return null;
  let minM = 127;
  let maxM = 0;
  for (const ev of noteEvents) {
    const m = noteEventToMidi(ev);
    minM = Math.min(minM, m);
    maxM = Math.max(maxM, m);
  }
  return {
    minMidi: Math.max(0, minM - RANGE_PAD_SEMITONES),
    maxMidi: Math.min(127, maxM + RANGE_PAD_SEMITONES),
  };
}

export type TrackNoteVisualizationProps = {
  noteEvents: NoteEvent[];
  /** Project length in beats (e.g. bars × 4). Timeline is at least this wide. */
  totalBeats: number;
  className?: string;
  /** Smaller rows for dense cards (e.g. project list). */
  compact?: boolean;
  /** Current playhead in beats while previewing; null hides the line. */
  playheadBeat?: number | null;
};

/**
 * Piano-roll style view: time → horizontal, pitch → vertical. Reusable on record preview and project view.
 */
export function TrackNoteVisualization({
  noteEvents,
  totalBeats,
  className = "",
  compact = false,
  playheadBeat = null,
}: TrackNoteVisualizationProps) {
  const rowPx = compact ? ROW_PX_COMPACT : ROW_PX_DEFAULT;

  if (noteEvents.length === 0) {
    return (
      <div
        className={`rounded-lg border border-synthwave-purple/25 bg-black/25 py-8 text-center text-sm text-synthwave-text-secondary ${className}`}
        role="img"
        aria-label="No notes to display"
      >
        No notes to show on the timeline.
      </div>
    );
  }

  const range = computeMidiRange(noteEvents);
  if (!range) return null;

  const { minMidi, maxMidi } = range;
  const timelineBeats = computeTimelineBeats(noteEvents, totalBeats);
  const rowCount = maxMidi - minMidi + 1;
  const heightPx = rowCount * rowPx;

  const rows: number[] = [];
  for (let m = maxMidi; m >= minMidi; m--) {
    rows.push(m);
  }

  const beatLineCount = Math.min(
    Math.ceil(timelineBeats) + 1,
    MAX_BEAT_LINES
  );

  return (
    <div
      className={`rounded-lg border border-synthwave-purple/35 bg-synthwave-dark/60 overflow-x-hidden ${className}`}
      role="img"
      aria-label={`Note timeline, ${noteEvents.length} notes over ${timelineBeats.toFixed(2)} beats`}
    >
      <div className="flex w-full min-w-0">
        <div
          className="shrink-0 w-14 border-r border-synthwave-purple/25 bg-black/35"
          style={{ height: heightPx }}
        >
          {rows.map((midi) => (
            <div
              key={midi}
              className="flex items-center justify-end pr-1.5 font-mono text-synthwave-text-secondary/90 border-b border-white/[0.06]"
              style={{ height: rowPx, fontSize: compact ? 9 : 10 }}
            >
              {midiToLabel(midi)}
            </div>
          ))}
        </div>

        <div
          className="relative min-w-0 flex-1"
          style={{ height: heightPx }}
        >
          {Array.from({ length: beatLineCount }, (_, i) => (
            <div
              key={`beat-${i}`}
              className="absolute top-0 bottom-0 w-px bg-synthwave-purple/15 pointer-events-none"
              style={{ left: `${(i / timelineBeats) * 100}%` }}
            />
          ))}

          {rows.map((midi) => (
            <div
              key={`grid-${midi}`}
              className="absolute left-0 right-0 border-b border-white/[0.05] pointer-events-none"
              style={{
                top: (maxMidi - midi) * rowPx,
                height: rowPx,
              }}
            />
          ))}

          {noteEvents.map((ev, i) => {
            const midi = noteEventToMidi(ev);
            if (midi < minMidi || midi > maxMidi) return null;
            const top = (maxMidi - midi) * rowPx + Math.max(2, rowPx * 0.12);
            const left = (ev.start / timelineBeats) * 100;
            const widthPct = (ev.duration / timelineBeats) * 100;
            return (
              <div
                key={`${ev.start}-${ev.duration}-${ev.pitch_class}-${ev.octave}-${i}`}
                className="absolute rounded-md border border-fuchsia-400/50 bg-synthwave-purple/45 shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                style={{
                  top,
                  height: rowPx - Math.max(4, rowPx * 0.22),
                  left: `${left}%`,
                  width: `max(${widthPct}%, 1.5%)`,
                }}
                title={`${ev.pitch_class}${ev.octave} · ${ev.start.toFixed(2)}+${ev.duration.toFixed(2)} beats`}
              />
            );
          })}

          {playheadBeat != null && timelineBeats > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-amber-300 shadow-[0_0_8px_rgba(253,224,71,0.85)] pointer-events-none z-50"
              style={{
                left: `${(playheadBeat / timelineBeats) * 100}%`,
              }}
              aria-hidden
            />
          )}
        </div>
      </div>

      <div className="flex justify-between gap-2 px-3 py-2 font-mono text-synthwave-text-secondary border-t border-synthwave-purple/20 bg-black/20 text-[10px]">
        <span>0 beats</span>
        <span>
          {timelineBeats.toFixed(2)} beats · {(timelineBeats / 4).toFixed(2)} bars
        </span>
      </div>
    </div>
  );
}
