import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProject, updateProject, deleteProject, type Project } from "../../services/projects";
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
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
        <Link to="/projects" className="btn btn-ghost">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-4">
        <Link to="/projects" className="btn btn-ghost btn-sm">
          ← Back to Projects
        </Link>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          {isEditing ? (
            <>
              <h2 className="card-title mb-4">Edit Project</h2>
              <ProjectForm
                key={`edit-${project.id}-${isEditing}`}
                initialData={{ name: project.name }}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
                submitLabel="Save"
                loading={updateLoading}
              />
            </>
          ) : (
            <>
              <div className="flex justify-between items-start mb-4">
                <h2 className="card-title text-3xl">{project.name}</h2>
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="divider"></div>

              <div className="space-y-2">
                <p className="text-sm text-base-content/70">
                  <span className="font-semibold">Created:</span> {formatDate(project.created_at)}
                </p>
                <p className="text-sm text-base-content/70">
                  <span className="font-semibold">Last Updated:</span> {formatDate(project.updated_at)}
                </p>
              </div>

              <div className="divider"></div>

              <div>
                <h3 className="text-xl font-semibold mb-4">Tracks</h3>
                <p className="text-base-content/70">
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
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Delete Project</h3>
            <p className="mb-4">
              Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
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
          <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}></div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;

