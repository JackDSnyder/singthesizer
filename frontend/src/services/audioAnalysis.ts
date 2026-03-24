import api from "./api";

export interface NoteEvent {
  start: number;
  duration: number;
  pitch_class: string;
  octave: number;
}

interface AnalyzeResponse {
  note_events: NoteEvent[];
}

/**
 * POST multipart audio to the analyze endpoint. Field name must match the backend serializer.
 */
export async function analyzeAudio(
  projectId: number,
  audioBlob: Blob
): Promise<NoteEvent[]> {
  const formData = new FormData();
  const ext = audioBlob.type.includes("webm") ? "webm" : "wav";
  formData.append("audio_file", audioBlob, `recording.${ext}`);

  const response = await api.post<AnalyzeResponse>(
    `projects/${projectId}/analyze-audio/`,
    formData,
    {
      // Shared `api` defaults to application/json; strip so FormData gets multipart + boundary
      transformRequest: [
        (data, headers) => {
          if (headers && typeof headers === "object" && "set" in headers) {
            (headers as { delete: (key: string) => void }).delete("Content-Type");
          }
          return data;
        },
      ],
    }
  );

  return response.data.note_events;
}
