import { useState } from "react";
import type { FormEvent } from "react";

export interface ProjectFormData {
  name: string;
  bpm: number;
  key: string;
  bars: number;
}

interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  loading?: boolean;
  barsLocked?: boolean;
}

const ProjectForm = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  loading = false,
  barsLocked = false,
}: ProjectFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [bpm, setBpm] = useState<number>(initialData?.bpm ?? 120);
  const [key, setKey] = useState(initialData?.key || "C");
  const [bars, setBars] = useState<number>(initialData?.bars ?? 4);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    const bpmNum = parseInt(bpm.toString(), 10);
    if (isNaN(bpmNum) || bpmNum < 40 || bpmNum > 200) {
      setError("BPM must be between 40 and 200.");
      return;
    }

    try {
      await onSubmit({ name: name.trim(), bpm: bpmNum, key: key.trim(), bars });
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?:
            | string
            | {
                name?: string | string[];
                bpm?: string | string[];
                key?: string | string[];
                bars?: string | string[];
              };
        };
      };
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") {
          setError(data);
        } else if (data.name) {
          setError(Array.isArray(data.name) ? data.name[0] : data.name);
        } else if (data.bpm) {
          setError(Array.isArray(data.bpm) ? data.bpm[0] : data.bpm);
        } else if (data.key) {
          setError(Array.isArray(data.key) ? data.key[0] : data.key);
        } else if (data.bars) {
          setError(Array.isArray(data.bars) ? data.bars[0] : data.bars);
        } else {
          setError("Failed to save project. Please try again.");
        }
      } else {
        setError("Failed to save project. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
          <span className="neon-glow-orange">{error}</span>
        </div>
      )}

      <div className="form-control w-full mb-5">
        <label className="label pb-2">
          <span className="label-text text-synthwave-text-secondary">
            Project Name
          </span>
        </label>
        <input
          type="text"
          placeholder="Enter project name"
          className="input input-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="form-control w-full mb-5">
        <label className="label pb-2">
          <span className="label-text text-synthwave-text-secondary">BPM</span>
        </label>
        <input
          type="number"
          placeholder="120"
          min="40"
          max="200"
          className="input input-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4"
          value={bpm}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            setBpm(isNaN(value) ? 120 : value);
          }}
          required
          disabled={loading}
        />
      </div>

      <div className="form-control w-full mb-5">
        <label className="label pb-2">
          <span className="label-text text-synthwave-text-secondary">Key</span>
        </label>
        <select
          className="select select-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          disabled={loading}
        >
          <option value="C">C</option>
          <option value="C#">C#</option>
          <option value="D">D</option>
          <option value="D#">D#</option>
          <option value="E">E</option>
          <option value="F">F</option>
          <option value="F#">F#</option>
          <option value="G">G</option>
          <option value="G#">G#</option>
          <option value="A">A</option>
          <option value="A#">A#</option>
          <option value="B">B</option>
        </select>
      </div>

      <div className="form-control w-full mb-5">
        <label className="label pb-2">
          <span className="label-text text-synthwave-text-secondary">
            Length
          </span>
        </label>
        <p className="mb-3 text-base leading-snug text-synthwave-text-secondary">
          ≈ {((bars * 4 * 60) / bpm).toFixed(1)}s at {bpm} BPM
        </p>
        <div
          className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4"
          role="group"
          aria-label="Project length in bars"
        >
          {[4, 8, 12, 16].map((n) => (
            <button
              key={n}
              type="button"
              className={`btn min-h-[2.75rem] w-full shrink-0 border px-2 text-sm sm:text-base ${
                bars === n
                  ? "border-synthwave-purple bg-synthwave-purple text-white neon-border-purple"
                  : "border-synthwave-purple/50 bg-synthwave-card text-synthwave-text-secondary hover:bg-synthwave-card/80"
              } ${barsLocked ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => !barsLocked && setBars(n)}
              disabled={loading || barsLocked}
            >
              {n} bars
            </button>
          ))}
        </div>
        {barsLocked && (
          <p className="text-xs text-synthwave-text-secondary mt-2 opacity-70">
            Length cannot be changed after tracks have been added.
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-end mt-6">
        {onCancel && (
          <button
            type="button"
            className="btn bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary hover:bg-synthwave-card/80 rounded-lg py-2.5 px-6"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2.5 px-6"
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner"></span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
