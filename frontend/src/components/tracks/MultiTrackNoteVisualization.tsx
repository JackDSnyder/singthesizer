import type { NoteEvent } from "../../services/audioAnalysis";
import { midiToLabel, noteEventToMidi } from "../../utils/notePitch";
import { computeTimelineBeats } from "../../utils/timelineBeats";

const ROW_PX_DEFAULT = 22;
const ROW_PX_COMPACT = 16;
const RANGE_PAD_SEMITONES = 2;
const MAX_BEAT_LINES = 256;

const EMPTY_ID_SET = new Set<number>();

/** Solid swatches for legend and project row dots (must match palette order). */
const TRACK_DOT_CLASSES = [
  "bg-cyan-400",
  "bg-fuchsia-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-sky-400",
  "bg-violet-400",
  "bg-lime-400",
] as const;

const TRACK_LAYER_STYLES: ReadonlyArray<{
  border: string;
  bg: string;
  shadow: string;
}> = [
  {
    border: "border-cyan-400/55",
    bg: "bg-cyan-400/35",
    shadow: "shadow-[0_0_10px_rgba(34,211,238,0.28)]",
  },
  {
    border: "border-fuchsia-400/55",
    bg: "bg-fuchsia-400/35",
    shadow: "shadow-[0_0_10px_rgba(232,121,249,0.28)]",
  },
  {
    border: "border-amber-400/55",
    bg: "bg-amber-400/35",
    shadow: "shadow-[0_0_10px_rgba(251,191,36,0.28)]",
  },
  {
    border: "border-emerald-400/55",
    bg: "bg-emerald-400/35",
    shadow: "shadow-[0_0_10px_rgba(52,211,153,0.28)]",
  },
  {
    border: "border-rose-400/55",
    bg: "bg-rose-400/35",
    shadow: "shadow-[0_0_10px_rgba(251,113,133,0.28)]",
  },
  {
    border: "border-sky-400/55",
    bg: "bg-sky-400/35",
    shadow: "shadow-[0_0_10px_rgba(56,189,248,0.28)]",
  },
  {
    border: "border-violet-400/55",
    bg: "bg-violet-400/35",
    shadow: "shadow-[0_0_10px_rgba(167,139,250,0.28)]",
  },
  {
    border: "border-lime-400/55",
    bg: "bg-lime-400/35",
    shadow: "shadow-[0_0_10px_rgba(163,230,53,0.28)]",
  },
];

export function trackLegendDotClass(trackIndex: number): string {
  return `${TRACK_DOT_CLASSES[trackIndex % TRACK_DOT_CLASSES.length]} ring-1 ring-white/25 shrink-0`;
}

function flattenEvents(
  tracks: ReadonlyArray<{ note_events: NoteEvent[] }>
): NoteEvent[] {
  const out: NoteEvent[] = [];
  for (const t of tracks) {
    out.push(...(t.note_events ?? []));
  }
  return out;
}

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

export type MultiTrackLayer = {
  id: number;
  name: string;
  note_events: NoteEvent[];
};

function isLayerDimmed(
  trackId: number,
  mutedTrackIds: ReadonlySet<number>,
  highlightSoloTrackId: number | null
): boolean {
  if (highlightSoloTrackId != null)
    return trackId !== highlightSoloTrackId;
  return mutedTrackIds.has(trackId);
}

export type MultiTrackNoteVisualizationProps = {
  tracks: MultiTrackLayer[];
  totalBeats: number;
  className?: string;
  compact?: boolean;
  /** Current playhead in beats while previewing; null hides the line. */
  playheadBeat?: number | null;
  /** Play-all mute state (client-only). */
  mutedTrackIds?: ReadonlySet<number>;
  /** When set (e.g. per-track preview playing), dims all other layers. */
  highlightSoloTrackId?: number | null;
};

/**
 * Single piano roll with notes from multiple tracks overlaid; per-track color from a fixed palette.
 */
export function MultiTrackNoteVisualization({
  tracks,
  totalBeats,
  className = "",
  compact = false,
  playheadBeat = null,
  mutedTrackIds,
  highlightSoloTrackId = null,
}: MultiTrackNoteVisualizationProps) {
  const muted = mutedTrackIds ?? EMPTY_ID_SET;
  const rowPx = compact ? ROW_PX_COMPACT : ROW_PX_DEFAULT;

  const allEvents = flattenEvents(tracks);
  const totalNoteCount = allEvents.length;

  if (tracks.length === 0) {
    return null;
  }

  if (totalNoteCount === 0) {
    return (
      <div
        className={`rounded-lg border border-synthwave-purple/25 bg-black/25 py-8 text-center text-sm text-synthwave-text-secondary ${className}`}
        role="img"
        aria-label="No notes in any track"
      >
        No notes in any track yet.
      </div>
    );
  }

  const range = computeMidiRange(allEvents);
  if (!range) return null;

  const { minMidi, maxMidi } = range;
  const timelineBeats = computeTimelineBeats(
    flattenEvents(tracks),
    totalBeats
  );
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
      aria-label={`Combined note timeline, ${totalNoteCount} notes over ${timelineBeats.toFixed(2)} beats`}
    >
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-3 py-2.5 border-b border-synthwave-purple/20 bg-black/25 text-xs">
        {tracks.map((t, idx) => {
          const dim = isLayerDimmed(t.id, muted, highlightSoloTrackId);
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 transition-opacity ${dim ? "opacity-35" : ""}`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${trackLegendDotClass(idx)}`}
                aria-hidden
              />
              <span className="font-medium text-synthwave-text-primary/95">
                {t.name}
              </span>
            </div>
          );
        })}
      </div>

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

          {tracks.flatMap((track, trackIdx) => {
            const layer =
              TRACK_LAYER_STYLES[trackIdx % TRACK_LAYER_STYLES.length];
            const z = 10 + trackIdx;
            const dim = isLayerDimmed(
              track.id,
              muted,
              highlightSoloTrackId
            );
            return (track.note_events ?? []).map((ev, i) => {
              const midi = noteEventToMidi(ev);
              if (midi < minMidi || midi > maxMidi) return null;
              const top = (maxMidi - midi) * rowPx + Math.max(2, rowPx * 0.12);
              const left = (ev.start / timelineBeats) * 100;
              const widthPct = (ev.duration / timelineBeats) * 100;
              return (
                <div
                  key={`${track.id}-${i}-${ev.start}-${ev.duration}`}
                  className={`absolute rounded-md border transition-opacity ${layer.border} ${layer.bg} ${layer.shadow} ${dim ? "opacity-35" : ""}`}
                  style={{
                    top,
                    height: rowPx - Math.max(4, rowPx * 0.22),
                    left: `${left}%`,
                    width: `max(${widthPct}%, 1.5%)`,
                    zIndex: z,
                  }}
                  title={`${track.name} · ${ev.pitch_class}${ev.octave} · ${ev.start.toFixed(2)}+${ev.duration.toFixed(2)} beats`}
                />
              );
            });
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
          {timelineBeats.toFixed(2)} beats · {(timelineBeats / 4).toFixed(2)}{" "}
          bars
        </span>
      </div>
    </div>
  );
}
