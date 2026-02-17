import { useState } from "react";
import type { FormEvent } from "react";

export interface ProjectFormData {
  name: string;
  bpm: number;
  key: string;
}

interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  loading?: boolean;
}

const ProjectForm = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  loading = false,
}: ProjectFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [bpm, setBpm] = useState<number>(initialData?.bpm ?? 120);
  const [key, setKey] = useState(initialData?.key || "C");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    // Validate BPM
    const bpmNum = parseInt(bpm.toString(), 10);
    if (isNaN(bpmNum) || bpmNum < 1 || bpmNum > 300) {
      setError("BPM must be between 1 and 300.");
      return;
    }

    try {
      await onSubmit({ name: name.trim(), bpm: bpmNum, key: key.trim() });
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: string | {
            name?: string | string[];
            bpm?: string | string[];
            key?: string | string[];
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
          <span className="label-text text-synthwave-text-secondary">Project Name</span>
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
          min="1"
          max="300"
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
          {loading ? <span className="loading loading-spinner"></span> : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;

