import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getProject,
  updateProject,
  deleteProject,
  type Project,
} from "../../services/projects";
import ProjectForm, { type ProjectFormData } from "./ProjectForm";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject(parseInt(id));
    }
  }, [id]);

  const loadProject = async (projectId: number) => {
    try {
      setLoading(true);
      setError("");
      const data = await getProject(projectId);
      setProject(data);
    } catch (err: unknown) {
      const error = err as { response?: { status: number } };
      if (error.response?.status === 401) {
        return;
      }
      if (error.response?.status === 404) {
        setError("Project not found.");
      } else {
        setError("Failed to load project. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!project) return;

    setUpdateLoading(true);
    try {
      const updated = await updateProject(project.id, data);
      setProject(updated);
      setIsEditing(false);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    setDeleteLoading(true);
    try {
      await deleteProject(project.id);
      navigate("/projects");
    } catch (err: unknown) {
      const error = err as { response?: { status: number } };
      if (error.response?.status === 401) {
        // Handled by interceptor
        return;
      }
      alert("Failed to delete project. Please try again.");
    } finally {
      setDeleteLoading(false);
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
          {isEditing ? (
            <>
              <h2 className="card-title mb-4 synthwave-gradient-text">
                Edit Project
              </h2>
              <ProjectForm
                key={`edit-${project.id}-${isEditing}`}
                initialData={{
                  name: project.name,
                  bpm: project.bpm,
                  key: project.key,
                }}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
                submitLabel="Save"
                loading={updateLoading}
              />
            </>
          ) : (
            <>
              <div className="flex justify-between items-start mb-4">
                <h2 className="card-title text-3xl synthwave-gradient-text neon-glow-purple">
                  {project.name}
                </h2>
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2 px-4"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm bg-red-900/50 hover:bg-red-900/70 border-red-500/50 text-red-200 rounded-lg py-2 px-4"
                    onClick={() => setShowDeleteModal(true)}
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
                <p className="text-synthwave-text-secondary">
                  Track management will be implemented in Phase 2.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal modal-open">
          <div className="modal-box synthwave-card border border-red-500/50 p-6 max-w-md">
            <h3 className="font-bold text-2xl mb-4 text-red-200">
              Delete Project
            </h3>
            <p className="mb-6 text-synthwave-text-secondary">
              Are you sure you want to delete &quot;{project.name}&quot;? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-4 mt-6">
              <button
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => setShowDeleteModal(false)}
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
          <div
            className="modal-backdrop bg-black/70"
            onClick={() => setShowDeleteModal(false)}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
