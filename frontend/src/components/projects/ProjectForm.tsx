import { useState } from "react";
import type { FormEvent } from "react";

export interface ProjectFormData {
  name: string;
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
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      await onSubmit({ name: name.trim() });
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: string | {
            name?: string | string[];
          };
        };
      };
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") {
          setError(data);
        } else if (data.name) {
          setError(Array.isArray(data.name) ? data.name[0] : data.name);
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
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="form-control w-full mb-4">
        <label className="label">
          <span className="label-text">Project Name</span>
        </label>
        <input
          type="text"
          placeholder="Enter project name"
          className="input input-bordered w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <span className="loading loading-spinner"></span> : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;

