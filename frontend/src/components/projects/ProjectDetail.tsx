import axios from "axios";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getProject,
  updateProject,
  deleteProject,
  type Project,
} from "../../services/projects";
import type { NoteEvent } from "../../services/audioAnalysis";
import {
  deleteTrack,
  listTracks,
  updateTrack,
  type Track,
} from "../../services/tracks";
import type { PlayableNote } from "../../audio/tone/playNoteEvents";
import { useNotePreview } from "../../hooks/useNotePreview";
import { usePlayheadBeat } from "../../hooks/usePlayheadBeat";
import { computeTimelineBeats } from "../../utils/timelineBeats";
import {
  MultiTrackNoteVisualization,
  trackLegendDotClass,
} from "../tracks/MultiTrackNoteVisualization";
import ProjectForm, { type ProjectFormData } from "./ProjectForm";
import {
  clampGain,
  loadProjectMix,
  saveProjectMix,
} from "../../utils/projectMixStorage";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

function mergeProjectTrackNotes(tracks: Track[]): NoteEvent[] {
  const out: NoteEvent[] = [];
  for (const t of tracks) {
    out.push(...(t.note_events ?? []));
  }
  out.sort((a, b) => a.start - b.start || a.duration - b.duration);
  return out;
}

/** Notes merged for Play all: all tracks except those muted for the mix. */
function mergeNotesForPlayAll(
  tracks: Track[],
  mutedTrackIds: ReadonlySet<number>
): NoteEvent[] {
  const include = tracks.filter((t) => !mutedTrackIds.has(t.id));
  return mergeProjectTrackNotes(include);
}

function mergeNotesForPlayAllWithGain(
  tracks: Track[],
  mutedTrackIds: ReadonlySet<number>,
  master: number,
  trackVolume: (id: number) => number
): PlayableNote[] {
  const m = clampGain(master);
  const out: PlayableNote[] = [];
  for (const t of tracks) {
    if (mutedTrackIds.has(t.id)) continue;
    const g = m * clampGain(trackVolume(t.id));
    for (const ev of t.note_events ?? []) {
      out.push({ ...ev, gain: g });
    }
  }
  out.sort((a, b) => a.start - b.start || a.duration - b.duration);
  return out;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteProjectError, setDeleteProjectError] = useState("");

  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState("");
  const [playingTrackId, setPlayingTrackId] = useState<number | "all" | null>(
    null
  );
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [deleteTrackLoading, setDeleteTrackLoading] = useState(false);
  const [deleteTrackError, setDeleteTrackError] = useState("");
  const [trackToRename, setTrackToRename] = useState<Track | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [mutedTrackIds, setMutedTrackIds] = useState<Set<number>>(
    () => new Set()
  );

  const [mix, setMix] = useState<{
    master: number;
    tracks: Record<number, number>;
  }>({ master: 1, tracks: {} });

  const lastProjectIdRef = useRef<number | null>(null);

  const { isPlaying, play, stop: stopPreview } = useNotePreview();

  const mergedTrackNotes = useMemo(
    () => mergeProjectTrackNotes(tracks),
    [tracks]
  );

  const mergeNotesForPlayAllComputed = useMemo(
    () => mergeNotesForPlayAll(tracks, mutedTrackIds),
    [tracks, mutedTrackIds]
  );

  const playAllNotesWithGain = useMemo(
    () =>
      mergeNotesForPlayAllWithGain(
        tracks,
        mutedTrackIds,
        mix.master,
        (tid) => mix.tracks[tid] ?? 1
      ),
    [tracks, mutedTrackIds, mix.master, mix.tracks]
  );

  /** While previewing one track, combined roll highlights it and dims others (solo-style). */
  const highlightSoloTrackId =
    isPlaying && typeof playingTrackId === "number"
      ? playingTrackId
      : null;

  useEffect(() => {
    const valid = new Set(tracks.map((t) => t.id));
    setMutedTrackIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [tracks]);

  useEffect(() => {
    if (!project) return;
    const projectChanged = lastProjectIdRef.current !== project.id;
    lastProjectIdRef.current = project.id;

    setMix((prev) => {
      const stored = loadProjectMix(project.id);
      if (projectChanged) {
        const nextTracks: Record<number, number> = {};
        for (const t of tracks) {
          nextTracks[t.id] = stored.tracks[t.id] ?? 1;
        }
        return { master: stored.master, tracks: nextTracks };
      }
      const nextTracks: Record<number, number> = {};
      for (const t of tracks) {
        nextTracks[t.id] = prev.tracks[t.id] ?? stored.tracks[t.id] ?? 1;
      }
      return { master: prev.master, tracks: nextTracks };
    });
  }, [project?.id, tracks]);

  useEffect(() => {
    if (!project) return;
    const ids = tracks.map((t) => t.id);
    const tmr = window.setTimeout(() => {
      saveProjectMix(project.id, mix, ids);
    }, 250);
    return () => window.clearTimeout(tmr);
  }, [project?.id, mix, tracks]);

  const rollTimelineBeats = useMemo(() => {
    if (!project) return 0.25;
    return computeTimelineBeats(mergedTrackNotes, project.bars * 4);
  }, [mergedTrackNotes, project]);

  const playheadBeat = usePlayheadBeat({
    isPlaying,
    bpm: project?.bpm ?? 120,
    noteEvents: mergedTrackNotes,
    totalBeats: project ? project.bars * 4 : 4,
    timelineWidthBeats: rollTimelineBeats,
  });

  useEffect(() => {
    if (id) {
      loadProject(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    if (!isPlaying) setPlayingTrackId(null);
  }, [isPlaying]);

  const loadProjectTracks = useCallback(async () => {
    const pid = project?.id;
    if (pid == null) return;
    setTracksLoading(true);
    setTracksError("");
    try {
      const data = await listTracks(pid);
      setTracks(data);
    } catch (err: unknown) {
      setTracksError(
        getApiErrorMessage(err, "Failed to load tracks. Please try again.")
      );
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    void loadProjectTracks();
  }, [loadProjectTracks]);

  const refreshProject = useCallback(async () => {
    if (!project) return;
    try {
      const data = await getProject(project.id);
      setProject(data);
    } catch {
      // Non-blocking: track list is authoritative; count may lag until next navigation
      console.warn("Could not refresh project metadata.");
    }
  }, [project]);

  const loadProject = async (projectId: number) => {
    try {
      setLoading(true);
      setError("");
      const data = await getProject(projectId);
      setProject(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError("Project not found.");
      } else {
        setError(
          getApiErrorMessage(err, "Failed to load project. Please try again.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!project) return;

    setUpdateLoading(true);
    setEditError("");
    try {
      const updated = await updateProject(project.id, data);
      setProject(updated);
      setShowEditModal(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setEditError(
        getApiErrorMessage(err, "Failed to update project. Please try again.")
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    setDeleteLoading(true);
    setDeleteProjectError("");
    try {
      await deleteProject(project.id);
      navigate("/projects");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setDeleteProjectError(
        getApiErrorMessage(err, "Failed to delete project. Please try again.")
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteTrack = async () => {
    if (!trackToDelete) return;

    setDeleteTrackLoading(true);
    setDeleteTrackError("");
    try {
      if (playingTrackId === trackToDelete.id) {
        stopPreview();
        setPlayingTrackId(null);
      }
      await deleteTrack(trackToDelete.id);
      setTrackToDelete(null);
      await loadProjectTracks();
      await refreshProject();
    } catch (err: unknown) {
      setDeleteTrackError(
        getApiErrorMessage(err, "Could not delete track. Please try again.")
      );
    } finally {
      setDeleteTrackLoading(false);
    }
  };

  const MAX_TRACK_NAME_LEN = 200;

  const handleRenameTrack = async () => {
    if (!trackToRename) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      setRenameError("Name cannot be empty.");
      return;
    }
    if (trimmed.length > MAX_TRACK_NAME_LEN) {
      setRenameError(`Name must be at most ${MAX_TRACK_NAME_LEN} characters.`);
      return;
    }

    setRenameLoading(true);
    setRenameError("");
    try {
      await updateTrack(trackToRename.id, { name: trimmed });
      setTrackToRename(null);
      setRenameName("");
      await loadProjectTracks();
      await refreshProject();
    } catch (err: unknown) {
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === "object" &&
        "name" in err.response.data
      ) {
        const raw = (err.response.data as { name?: string | string[] }).name;
        if (Array.isArray(raw) && raw.length) {
          setRenameError(raw.join(" "));
          return;
        }
        if (typeof raw === "string") {
          setRenameError(raw);
          return;
        }
      }
      setRenameError(
        getApiErrorMessage(err, "Could not rename track. Please try again.")
      );
    } finally {
      setRenameLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-synthwave-purple"></span>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="container mx-auto p-4 max-w-6xl min-h-screen">
        <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
          <span className="neon-glow-orange">{error}</span>
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

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen">
      <div className="mb-4">
        <Link
          to="/projects"
          className="btn btn-sm bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2 px-4"
        >
          ← Back to Projects
        </Link>
      </div>

      <div className="card synthwave-card shadow-2xl">
        <div className="card-body p-6">
          <>
            <div className="flex justify-between items-start mb-4">
                <h2 className="card-title text-3xl synthwave-gradient-text neon-glow-purple">
                  {project.name}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/projects/${project.id}/record`}
                    className="btn btn-sm bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2 px-4"
                  >
                    Record track
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2 px-4"
                    onClick={() => {
                      setEditError("");
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm bg-red-900/50 hover:bg-red-900/70 border-red-500/50 text-red-200 rounded-lg py-2 px-4"
                    onClick={() => {
                      setDeleteProjectError("");
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="divider border-synthwave-purple/30"></div>

              <div className="space-y-2">
                <p className="text-sm text-synthwave-text-secondary">
                  <span className="font-semibold text-synthwave-text-primary">
                    BPM:
                  </span>{" "}
                  {project.bpm}
                </p>
                <p className="text-sm text-synthwave-text-secondary">
                  <span className="font-semibold text-synthwave-text-primary">
                    Key:
                  </span>{" "}
                  {project.key}
                </p>
                <p className="text-sm text-synthwave-text-secondary">
                  <span className="font-semibold text-synthwave-text-primary">
                    Length:
                  </span>{" "}
                  {project.bars} {project.bars === 1 ? "bar" : "bars"} &middot;{" "}
                  {((project.bars * 4 * 60) / project.bpm).toFixed(1)}s at {project.bpm} BPM
                </p>
                <p className="text-sm text-synthwave-text-secondary">
                  <span className="font-semibold text-synthwave-text-primary">
                    Created:
                  </span>{" "}
                  {formatDate(project.created_at)}
                </p>
                <p className="text-sm text-synthwave-text-secondary">
                  <span className="font-semibold text-synthwave-text-primary">
                    Last Updated:
                  </span>{" "}
                  {formatDate(project.updated_at)}
                </p>
              </div>

              <div className="divider border-synthwave-purple/30"></div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4 synthwave-gradient-text">
                  Tracks
                </h3>

                {tracksLoading && (
                  <div className="flex items-center gap-2 py-4 text-sm text-synthwave-text-secondary">
                    <span className="loading loading-spinner loading-sm text-synthwave-purple" />
                    Loading tracks…
                  </div>
                )}

                {!tracksLoading && tracksError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-200 mb-4 flex flex-wrap items-center gap-2 justify-between">
                    <span>{tracksError}</span>
                    <button
                      type="button"
                      className="btn btn-sm bg-synthwave-purple/80 hover:bg-synthwave-purple border-synthwave-purple text-white rounded-lg"
                      onClick={() => void loadProjectTracks()}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!tracksLoading && !tracksError && tracks.length === 0 && (
                  <p className="text-sm text-synthwave-text-secondary opacity-80">
                    No tracks yet. Record one to see it here.
                  </p>
                )}

                {!tracksLoading && !tracksError && tracks.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <MultiTrackNoteVisualization
                      tracks={tracks.map((t) => ({
                        id: t.id,
                        name: t.name,
                        note_events: t.note_events ?? [],
                      }))}
                      totalBeats={project.bars * 4}
                      compact
                      playheadBeat={playheadBeat}
                      mutedTrackIds={mutedTrackIds}
                      highlightSoloTrackId={highlightSoloTrackId}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-synthwave-purple/25 bg-black/20 px-3 py-2.5">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm font-semibold text-synthwave-text-secondary">
                          Preview all tracks together
                        </span>
                        {mergeNotesForPlayAllComputed.length === 0 &&
                          mergedTrackNotes.length > 0 && (
                            <span className="text-xs text-amber-200/80">
                              Unmute a track to preview.
                            </span>
                          )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 min-w-0 max-w-[200px] sm:max-w-[240px]">
                          <span className="text-xs text-synthwave-text-secondary shrink-0">
                            Master
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(mix.master * 100)}
                            aria-label="Master volume for preview"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(mix.master * 100)}
                            disabled={isPlaying}
                            onChange={(e) => {
                              const v = Number(e.target.value) / 100;
                              setMix((prev) => ({
                                ...prev,
                                master: clampGain(v),
                              }));
                            }}
                            className="range range-xs range-primary flex-1 min-h-8 opacity-90"
                          />
                        </label>
                        {!(isPlaying && playingTrackId === "all") && (
                          <button
                            type="button"
                            className="btn btn-sm rounded-lg py-2 px-4 bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple"
                            disabled={
                              mergeNotesForPlayAllComputed.length === 0
                            }
                            onClick={() => {
                              setPlayingTrackId("all");
                              void play(
                                playAllNotesWithGain,
                                project.bpm
                              );
                            }}
                          >
                            Play all
                          </button>
                        )}
                        {isPlaying && playingTrackId === "all" && (
                          <button
                            type="button"
                            className="btn btn-sm rounded-lg py-2 px-4 bg-synthwave-purple hover:bg-synthwave-purple/90 border-synthwave-purple text-white neon-border-purple shadow-[0_0_16px_rgba(168,85,247,0.45)] ring-2 ring-fuchsia-400/60"
                            onClick={() => {
                              stopPreview();
                              setPlayingTrackId(null);
                            }}
                          >
                            Stop
                          </button>
                        )}
                      </div>
                    </div>

                    <ul className="divide-y divide-synthwave-purple/15 rounded-lg border border-synthwave-purple/20 bg-black/15">
                      {tracks.map((track, trackIdx) => {
                        const n = track.note_events?.length ?? 0;
                        const isThisPlaying =
                          isPlaying && playingTrackId === track.id;
                        return (
                          <li
                            key={track.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
                          >
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${trackLegendDotClass(trackIdx)}`}
                                aria-hidden
                              />
                              <span className="font-semibold text-synthwave-text-primary truncate">
                                {track.name}
                              </span>
                              <span className="text-xs text-synthwave-text-secondary">
                                {formatDate(track.created_at)}
                                {" · "}
                                {n} note{n === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
                              <label className="flex items-center gap-1.5 max-w-[120px] sm:max-w-[140px]">
                                <span className="sr-only">
                                  Volume for {track.name}
                                </span>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(
                                    (mix.tracks[track.id] ?? 1) * 100
                                  )}
                                  aria-label={`Volume for ${track.name}`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={Math.round(
                                    (mix.tracks[track.id] ?? 1) * 100
                                  )}
                                  disabled={isPlaying}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) / 100;
                                    setMix((prev) => ({
                                      ...prev,
                                      tracks: {
                                        ...prev.tracks,
                                        [track.id]: clampGain(v),
                                      },
                                    }));
                                  }}
                                  className="range range-xs range-secondary flex-1 min-h-8 opacity-90"
                                />
                              </label>
                              <button
                                type="button"
                                title={
                                  mutedTrackIds.has(track.id)
                                    ? "Unmute in Play all"
                                    : "Mute in Play all"
                                }
                                className={`btn btn-xs rounded-md border inline-flex items-center justify-center p-2 min-h-[2.5rem] min-w-[2.5rem] ${
                                  mutedTrackIds.has(track.id)
                                    ? "bg-black/55 border-amber-950/50"
                                    : "bg-black/30 border-synthwave-purple/35 text-synthwave-text-secondary"
                                }`}
                                aria-pressed={mutedTrackIds.has(track.id)}
                                aria-label={
                                  mutedTrackIds.has(track.id)
                                    ? "Unmute track in Play all"
                                    : "Mute track in Play all"
                                }
                                onClick={() => {
                                  setMutedTrackIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(track.id)) next.delete(track.id);
                                    else next.add(track.id);
                                    return next;
                                  });
                                }}
                              >
                                {mutedTrackIds.has(track.id) ? (
                                  <VolumeX
                                    className="h-4 w-4 text-amber-900/90"
                                    aria-hidden
                                  />
                                ) : (
                                  <Volume2 className="h-4 w-4" aria-hidden />
                                )}
                              </button>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              {!isThisPlaying && (
                                <button
                                  type="button"
                                  className="btn btn-sm rounded-lg py-2 px-4 bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple"
                                  disabled={n === 0}
                                  onClick={() => {
                                    setPlayingTrackId(track.id);
                                    const g =
                                      clampGain(mix.master) *
                                      clampGain(mix.tracks[track.id] ?? 1);
                                    void play(
                                      (track.note_events ?? []).map((ev) => ({
                                        ...ev,
                                        gain: g,
                                      })),
                                      project.bpm
                                    );
                                  }}
                                >
                                  Play
                                </button>
                              )}
                              {isThisPlaying && (
                                <button
                                  type="button"
                                  className="btn btn-sm rounded-lg py-2 px-4 bg-synthwave-purple hover:bg-synthwave-purple/90 border-synthwave-purple text-white neon-border-purple shadow-[0_0_16px_rgba(168,85,247,0.45)] ring-2 ring-fuchsia-400/60"
                                  onClick={() => {
                                    stopPreview();
                                    setPlayingTrackId(null);
                                  }}
                                >
                                  Stop
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm rounded-lg py-2 px-4 border border-cyan-400/35 bg-cyan-950/25 text-cyan-100/90 hover:bg-cyan-950/45 hover:border-cyan-400/55 disabled:opacity-50 disabled:hover:bg-cyan-950/25 disabled:hover:border-cyan-400/35"
                                disabled={
                                  deleteTrackLoading ||
                                  tracksLoading ||
                                  renameLoading
                                }
                                onClick={() => {
                                  setRenameError("");
                                  setTrackToRename(track);
                                  setRenameName(track.name);
                                }}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm rounded-lg py-2 px-4 bg-red-900/40 hover:bg-red-900/60 border-red-500/40 text-red-200"
                                disabled={deleteTrackLoading || tracksLoading}
                                onClick={() => {
                                  setDeleteTrackError("");
                                  setTrackToDelete(track);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
          </>
        </div>
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!updateLoading) {
                setEditError("");
                setShowEditModal(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl synthwave-modal-panel border border-synthwave-purple/40 p-6">
            <h3 className="font-bold text-2xl mb-4 text-synthwave-text-primary">
              Edit Project
            </h3>
            {editError && (
              <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
                {editError}
              </div>
            )}
            <ProjectForm
              key={`edit-${project.id}-${showEditModal}`}
              initialData={{
                name: project.name,
                bpm: project.bpm,
                key: project.key,
                bars: project.bars,
              }}
              onSubmit={handleUpdate}
              onCancel={() => {
                if (!updateLoading) {
                  setEditError("");
                  setShowEditModal(false);
                }
              }}
              submitLabel="Save"
              loading={updateLoading}
              barsLocked={project.track_count > 0}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleteLoading) {
                setDeleteProjectError("");
                setShowDeleteModal(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl synthwave-modal-panel border border-red-500/50 p-6">
            <h3 className="font-bold text-2xl mb-4 text-red-200">
              Delete Project
            </h3>
            <p className="mb-6 text-synthwave-text-secondary">
              Are you sure you want to delete &quot;{project.name}&quot;? This
              action cannot be undone.
            </p>
            {deleteProjectError && (
              <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
                {deleteProjectError}
              </div>
            )}
            <div className="flex justify-end gap-4 mt-6">
              <button
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => {
                  setDeleteProjectError("");
                  setShowDeleteModal(false);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-900/50 hover:bg-red-900/70 border-red-500/50 text-red-200 rounded-lg py-2.5 px-6"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Track Modal */}
      {trackToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!renameLoading) {
                setTrackToRename(null);
                setRenameName("");
                setRenameError("");
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl synthwave-modal-panel border border-synthwave-purple/40 p-6">
            <h3 className="font-bold text-2xl mb-4 text-synthwave-text-primary">
              Rename track
            </h3>
            <label className="block mb-3 text-sm text-synthwave-text-secondary">
              Name
            </label>
            <input
              type="text"
              className="input input-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4 mb-4"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              maxLength={MAX_TRACK_NAME_LEN}
              disabled={renameLoading}
              autoFocus
            />
            {renameError && (
              <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
                {renameError}
              </div>
            )}
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => {
                  if (!renameLoading) {
                    setTrackToRename(null);
                    setRenameName("");
                    setRenameError("");
                  }
                }}
                disabled={renameLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => void handleRenameTrack()}
                disabled={renameLoading}
              >
                {renameLoading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Track Modal */}
      {trackToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleteTrackLoading) setTrackToDelete(null);
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl synthwave-modal-panel border border-red-500/50 p-6">
            <h3 className="font-bold text-2xl mb-4 text-red-200">
              Delete Track
            </h3>
            <p className="mb-4 text-synthwave-text-secondary">
              Are you sure you want to delete &quot;{trackToDelete.name}&quot;?
              This action cannot be undone.
            </p>
            {deleteTrackError && (
              <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
                {deleteTrackError}
              </div>
            )}
            <div className="flex justify-end gap-4 mt-6">
              <button
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => setTrackToDelete(null)}
                disabled={deleteTrackLoading}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-900/50 hover:bg-red-900/70 border-red-500/50 text-red-200 rounded-lg py-2.5 px-6"
                onClick={handleDeleteTrack}
                disabled={deleteTrackLoading}
              >
                {deleteTrackLoading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
