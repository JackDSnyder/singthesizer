import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProjects, createProject, deleteProject, type Project } from "../../services/projects";
import ProjectForm, { type ProjectFormData } from "./ProjectForm";

const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProjects();
      setProjects(data);
    } catch (err: unknown) {
      const error = err as { response?: { status: number } };
      if (error.response?.status === 401) {
        return;
      }
      setError("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: ProjectFormData) => {
    setCreateLoading(true);
    try {
      const newProject = await createProject(data);
      setProjects([newProject, ...projects]);
      setShowCreateModal(false);
      navigate(`/projects/${newProject.id}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      await deleteProject(deleteTarget);
      setProjects(projects.filter((p) => p.id !== deleteTarget));
      setDeleteTarget(null);
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
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Project
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
            <p className="text-base-content/70 mb-4">
              Create your first project to get started!
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">{project.name}</h2>
                <p className="text-sm text-base-content/70">
                  Created {formatDate(project.created_at)}
                </p>
                <div className="card-actions justify-end mt-4">
                  <Link to={`/projects/${project.id}`} className="btn btn-sm btn-primary">
                    Open
                  </Link>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => setDeleteTarget(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create New Project</h3>
            <ProjectForm
              key={`create-${showCreateModal}`}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              submitLabel="Create"
              loading={createLoading}
            />
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}></div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Delete Project</h3>
            <p className="mb-4">
              Are you sure you want to delete this project? This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteTarget(null)}
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
          <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}></div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;

