/**
 * Browser microphone recording via MediaRecorder (typically WebM/Opus).
 */

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

export function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }
  for (const t of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
}

export async function requestMicrophonePermission(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

export function createRecorder(stream: MediaStream): {
  recorder: MediaRecorder;
  mimeType: string;
} {
  const mimeType = pickSupportedMimeType();
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);
  return { recorder, mimeType: recorder.mimeType || mimeType || "audio/webm" };
}

/**
 * Wire chunk collection and start recording. Call before `stopRecorder`.
 * `chunks` is mutated as data arrives (use a ref array in React).
 */
export function startRecorderWithChunks(
  recorder: MediaRecorder,
  chunks: BlobPart[]
): void {
  chunks.length = 0;
  recorder.ondataavailable = (e) => {
    if (e.data?.size) {
      chunks.push(e.data);
    }
  };
  // Periodic chunks so `stop()` always has data; 100ms is fine for voice
  recorder.start(100);
}

/**
 * Stop the recorder and resolve with a single Blob of all chunks.
 */
export function stopRecorder(
  recorder: MediaRecorder,
  chunks: BlobPart[]
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    recorder.onerror = () => {
      reject(new Error("MediaRecorder error"));
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || "audio/webm";
      resolve(new Blob(chunks, { type }));
    };

    if (recorder.state === "recording") {
      recorder.stop();
    } else {
      const type = recorder.mimeType || "audio/webm";
      resolve(new Blob(chunks, { type }));
    }
  });
}

/** Project length in seconds: bars × 4 beats × (60 / bpm) */
export function getTargetRecordingSeconds(bpm: number, bars: number): number {
  return (bars * 4 * 60) / bpm;
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
