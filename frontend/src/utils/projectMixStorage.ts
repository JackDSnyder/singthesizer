const STORAGE_PREFIX = "singthesizer.mix.v1";

export interface ProjectMixState {
  master: number;
  tracks: Record<number, number>;
}

export function clampGain(v: number): number {
  if (Number.isNaN(v)) return 1;
  return Math.max(0, Math.min(1, v));
}

function storageKey(projectId: number): string {
  return `${STORAGE_PREFIX}:${projectId}`;
}

export function loadProjectMix(projectId: number): ProjectMixState {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return { master: 1, tracks: {} };
    const parsed = JSON.parse(raw) as Partial<ProjectMixState>;
    const tracks: Record<number, number> = {};
    if (parsed.tracks && typeof parsed.tracks === "object") {
      for (const [k, v] of Object.entries(parsed.tracks)) {
        const id = Number(k);
        if (!Number.isFinite(id)) continue;
        tracks[id] = clampGain(typeof v === "number" ? v : 1);
      }
    }
    return {
      master: clampGain(
        typeof parsed.master === "number" ? parsed.master : 1
      ),
      tracks,
    };
  } catch {
    return { master: 1, tracks: {} };
  }
}

/**
 * Persist mix for a project. Only `validTrackIds` are written under `tracks`
 * (prunes deleted tracks). Values are clamped to 0–1.
 */
export function saveProjectMix(
  projectId: number,
  state: ProjectMixState,
  validTrackIds: readonly number[]
): void {
  const tracks: Record<number, number> = {};
  for (const id of validTrackIds) {
    const v = state.tracks[id];
    tracks[id] = v !== undefined ? clampGain(v) : 1;
  }
  try {
    localStorage.setItem(
      storageKey(projectId),
      JSON.stringify({
        master: clampGain(state.master),
        tracks,
      })
    );
  } catch {
    // quota / private mode
  }
}

/** Update master only; keeps existing per-track entries in storage. */
export function saveProjectMixMaster(projectId: number, master: number): void {
  const cur = loadProjectMix(projectId);
  const ids = Object.keys(cur.tracks).map(Number).filter(Number.isFinite);
  saveProjectMix(projectId, { master: clampGain(master), tracks: cur.tracks }, ids);
}
