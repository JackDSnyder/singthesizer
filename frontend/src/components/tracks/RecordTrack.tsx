import axios from "axios";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProject, type Project } from "../../services/projects";
import { getTargetRecordingSeconds } from "../../services/recording";
import { analyzeAudio, type NoteEvent } from "../../services/audioAnalysis";
import { createTrack } from "../../services/tracks";
import { useRecording } from "../../hooks/useRecording";
import { useNotePreview } from "../../hooks/useNotePreview";
import { usePlayheadBeat } from "../../hooks/usePlayheadBeat";
import { TrackNoteVisualization } from "./TrackNoteVisualization";
import {
  clampGain,
  loadProjectMix,
  saveProjectMixMaster,
} from "../../utils/projectMixStorage";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

const formatSeconds = (s: number) => s.toFixed(1);

/** Unified copy when analysis returns zero notes (not a server error). */
const EMPTY_NOTE_EVENTS_GUIDANCE =
  "No notes detected. Try singing a little louder or closer to the mic, then discard this take and record again.";

const RecordTrack = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? parseInt(id, 10) : NaN;

  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadingProject, setLoadingProject] = useState(true);

  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [noteEvents, setNoteEvents] = useState<NoteEvent[] | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [previewMaster, setPreviewMaster] = useState(1);

  const maxSeconds =
    project && !Number.isNaN(projectId)
      ? getTargetRecordingSeconds(project.bpm, project.bars)
      : undefined;

  const {
    status,
    countdown,
    elapsedSeconds,
    blob,
    error: recordingError,
    startRecording,
    stopRecording,
    reset,
    targetSeconds,
  } = useRecording({ maxSeconds });

  const { isPlaying, play, stop: stopPreview } = useNotePreview();

  const playheadBeat = usePlayheadBeat({
    isPlaying,
    bpm: project?.bpm ?? 120,
    noteEvents: noteEvents ?? [],
    totalBeats: project ? project.bars * 4 : 4,
  });

  useEffect(() => {
    if (Number.isNaN(projectId)) {
      setLoadError("Invalid project.");
      setLoadingProject(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingProject(true);
        setLoadError("");
        const data = await getProject(projectId);
        if (!cancelled) {
          setProject(data);
          setPreviewMaster(loadProjectMix(data.id).master);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setLoadError("Project not found.");
          } else {
            setLoadError(
              getApiErrorMessage(
                err,
                "Failed to load project. Please try again.",
              ),
            );
          }
        }
      } finally {
        if (!cancelled) setLoadingProject(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const pid = project?.id;
    if (pid == null) return;
    const tmr = window.setTimeout(() => {
      saveProjectMixMaster(pid, previewMaster);
    }, 250);
    return () => window.clearTimeout(tmr);
  }, [project?.id, previewMaster]);

  const handleAnalyze = async () => {
    if (!project || !blob) return;
    stopPreview();
    setAnalyzeError("");
    setAnalyzeLoading(true);
    try {
      const events = await analyzeAudio(project.id, blob);
      setNoteEvents(events);
    } catch (err: unknown) {
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === "object" &&
        "audio_file" in err.response.data
      ) {
        const af = (err.response.data as { audio_file?: string[] }).audio_file;
        setAnalyzeError(
          Array.isArray(af) && af[0] ? String(af[0]) : "Invalid audio file.",
        );
      } else {
        setAnalyzeError(
          getApiErrorMessage(err, "Analysis failed. Please try again."),
        );
      }
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!project || noteEvents === null || noteEvents.length === 0) return;
    stopPreview();
    setSaveError("");
    setSaveLoading(true);
    try {
      const name = `Track ${project.track_count + 1}`;
      await createTrack(project.id, { name, note_events: noteEvents });
      navigate(`/projects/${project.id}`);
    } catch (err: unknown) {
      setSaveError(
        getApiErrorMessage(err, "Could not save track. Please try again."),
      );
    } finally {
      setSaveLoading(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-synthwave-purple"></span>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="container mx-auto p-4 max-w-6xl min-h-screen">
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
        >
          <span className="neon-glow-orange">
            {loadError || "Project not found."}
          </span>
        </div>
        <Link
          to="/projects"
          className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2 px-4"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const targetLabel =
    targetSeconds != null
      ? `${formatSeconds(targetSeconds)}s (${project.bars} bar${project.bars === 1 ? "" : "s"} at ${project.bpm} BPM)`
      : "—";

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen">
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => navigate(`/projects/${project.id}`)}
          className="btn btn-sm bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2 px-4"
        >
          ← Back to project
        </button>
      </div>

      <div className="card synthwave-card shadow-2xl">
        <div className="card-body p-6">
          <h1 className="text-3xl font-bold synthwave-gradient-text neon-glow-purple mb-2">
            Record track
          </h1>
          <p className="text-synthwave-text-secondary mb-6">
            Project:{" "}
            <span className="text-synthwave-text-primary font-semibold">
              {project.name}
            </span>
            {" · "}
            Key {project.key} · {project.bpm} BPM
          </p>

          <div className="rounded-lg bg-synthwave-card/50 border border-synthwave-purple/30 p-4 mb-6">
            <p className="text-sm text-synthwave-text-secondary">
              Max length:{" "}
              <span className="text-synthwave-text-primary font-mono">
                {targetLabel}
              </span>
            </p>
            <p className="text-xs text-synthwave-text-secondary mt-2">
              Pressing Start recording begins a 3-second count-in, then
              recording. Stops at this length or when you press Stop.
            </p>
          </div>

          {recordingError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
            >
              <span className="neon-glow-orange">{recordingError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 items-center mb-6">
            {status === "idle" && (
              <button
                type="button"
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => void startRecording()}
              >
                Start recording
              </button>
            )}
            {status === "counting" && countdown !== null && (
              <div className="flex flex-wrap items-center gap-4 w-full">
                <div
                  className="flex min-w-[5rem] h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-synthwave-purple/60 bg-synthwave-dark/80 text-6xl font-bold tabular-nums text-synthwave-text-primary neon-border-purple"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {countdown}
                </div>
                <div className="flex flex-col gap-3 min-w-0 flex-1 justify-center">
                  <p className="text-synthwave-text-secondary text-sm">
                    Recording starts next. Cancel to start over.
                  </p>
                  <button
                    type="button"
                    className="btn w-fit min-h-[2.75rem] rounded-lg border-2 border-synthwave-purple/55 bg-synthwave-dark/70 px-6 py-2.5 text-synthwave-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:border-synthwave-purple hover:bg-synthwave-purple/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-synthwave-purple active:bg-synthwave-purple/25"
                    onClick={() => reset()}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {status === "recording" && (
              <>
                <button
                  type="button"
                  className="btn bg-red-900/50 hover:bg-red-900/70 border-red-500/50 text-red-200 rounded-lg py-2.5 px-6"
                  onClick={() => void stopRecording()}
                >
                  Stop
                </button>
                <span className="text-synthwave-text-primary font-mono text-lg">
                  {formatSeconds(elapsedSeconds)}s
                  {targetSeconds != null && (
                    <span className="text-synthwave-text-secondary text-base">
                      {" "}
                      / {formatSeconds(targetSeconds)}s
                    </span>
                  )}
                </span>
                <span className="loading loading-dots loading-md text-synthwave-purple" />
              </>
            )}
            {status === "stopped" && (
              <>
                <button
                  type="button"
                  className="btn bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary rounded-lg py-2.5 px-6 disabled:opacity-50"
                  disabled={analyzeLoading || saveLoading}
                  onClick={() => {
                    stopPreview();
                    reset();
                    setNoteEvents(null);
                    setAnalyzeError("");
                    setSaveError("");
                  }}
                >
                  Discard & re-record
                </button>
                {noteEvents === null ? (
                  <button
                    type="button"
                    className="btn bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2.5 px-6 min-h-[2.75rem] min-w-[11rem] inline-flex items-center justify-center gap-2"
                    onClick={() => void handleAnalyze()}
                    disabled={analyzeLoading || !blob}
                  >
                    {analyzeLoading ? (
                      <>
                        <span
                          className="loading loading-spinner loading-md text-white"
                          aria-hidden
                        />
                        <span>Analyzing…</span>
                      </>
                    ) : (
                      "Analyze audio"
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn bg-emerald-800/90 hover:bg-emerald-700 border-emerald-500/80 text-white rounded-lg py-2.5 px-6 min-h-[2.75rem] min-w-[9rem] inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    onClick={() => void handleSave()}
                    disabled={saveLoading || noteEvents.length === 0}
                    title={
                      noteEvents.length === 0
                        ? "No notes to save — re-record or analyze again after discarding"
                        : undefined
                    }
                  >
                    {saveLoading ? (
                      <>
                        <span
                          className="loading loading-spinner loading-md text-white"
                          aria-hidden
                        />
                        <span>Saving…</span>
                      </>
                    ) : (
                      "Save track"
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {analyzeError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
            >
              <span className="neon-glow-orange">{analyzeError}</span>
            </div>
          )}

          {saveError && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
            >
              <span className="neon-glow-orange">{saveError}</span>
            </div>
          )}

          {noteEvents !== null && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold synthwave-gradient-text mb-1">
                Analysis preview
              </h2>
              {noteEvents.length === 0 && (
                <div
                  className="alert border-amber-500/35 bg-amber-950/20 text-amber-100/95 mb-3"
                  role="status"
                >
                  {EMPTY_NOTE_EVENTS_GUIDANCE}
                </div>
              )}
              <p className="text-xs text-synthwave-text-secondary mb-3 opacity-85">
                Detected notes from your take (timeline below). Use Play to hear
                them with the built-in synth.
              </p>

              <div className="flex flex-wrap gap-3 items-center mb-4">
                <span className="text-sm text-synthwave-text-secondary font-semibold">
                  Preview playback
                </span>
                <label className="flex items-center gap-2 min-w-0 max-w-[200px]">
                  <span className="text-xs text-synthwave-text-secondary shrink-0">
                    Master
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(previewMaster * 100)}
                    aria-label="Master volume for preview"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(previewMaster * 100)}
                    disabled={isPlaying}
                    onChange={(e) =>
                      setPreviewMaster(clampGain(Number(e.target.value) / 100))
                    }
                    className="range range-xs range-primary flex-1 min-h-8 opacity-90"
                  />
                </label>
                {!isPlaying && (
                  <button
                    type="button"
                    className="btn rounded-lg py-2 px-5 bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple"
                    disabled={
                      noteEvents.length === 0 ||
                      status === "recording" ||
                      status === "counting" ||
                      analyzeLoading ||
                      saveLoading
                    }
                    onClick={() =>
                      void play(
                        noteEvents.map((ev) => ({
                          ...ev,
                          gain: clampGain(previewMaster),
                        })),
                        project.bpm,
                      )
                    }
                  >
                    Play
                  </button>
                )}
                {isPlaying && (
                  <button
                    type="button"
                    className="btn rounded-lg py-2 px-5 transition-all bg-synthwave-purple hover:bg-synthwave-purple/90 border-synthwave-purple text-white neon-border-purple shadow-[0_0_20px_rgba(168,85,247,0.55)] ring-2 ring-fuchsia-400/70"
                    onClick={() => stopPreview()}
                  >
                    Stop preview
                  </button>
                )}
                {noteEvents.length === 0 && (
                  <span className="text-xs text-synthwave-text-secondary">
                    {EMPTY_NOTE_EVENTS_GUIDANCE}
                  </span>
                )}
              </div>

              <TrackNoteVisualization
                noteEvents={noteEvents}
                totalBeats={project.bars * 4}
                className="mb-4"
                playheadBeat={playheadBeat}
              />

              <p className="text-xs text-synthwave-text-secondary mt-2 opacity-70">
                {noteEvents.length} note{noteEvents.length === 1 ? "" : "s"}{" "}
                detected.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordTrack;
