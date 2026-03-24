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
