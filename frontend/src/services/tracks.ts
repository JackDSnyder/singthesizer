import api from "./api";
import type { NoteEvent } from "./audioAnalysis";

export interface Track {
  id: number;
  project: number;
  name: string;
  note_events: NoteEvent[];
  created_at: string;
  updated_at: string;
}

export async function listTracks(projectId: number): Promise<Track[]> {
  const response = await api.get<Track[]>(`projects/${projectId}/tracks/`);
  return response.data;
}

export async function createTrack(
  projectId: number,
  data: { name: string; note_events: NoteEvent[] }
): Promise<Track> {
  const response = await api.post<Track>(
    `projects/${projectId}/tracks/`,
    data
  );
  return response.data;
}

export async function updateTrack(
  trackId: number,
  data: { name: string }
): Promise<Track> {
  const response = await api.patch<Track>(`tracks/${trackId}/`, data);
  return response.data;
}

export async function deleteTrack(trackId: number): Promise<void> {
  await api.delete(`tracks/${trackId}/`);
}
