import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getProjects,
  createProject,
  deleteProject,
  type Project,
} from "../../services/projects";
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
        <span className="loading loading-spinner loading-lg text-synthwave-purple"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl h-[calc(100vh-80px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold synthwave-gradient-text neon-glow-purple">
          My Projects
        </h1>
        <button
          className="btn bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2.5 px-6"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Project
        </button>
      </div>

      {error && (
        <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
          <span className="neon-glow-orange">{error}</span>
        </div>
      )}

      {projects.length === 0 && !showCreateModal ? (
        <div className="card synthwave-card shadow-2xl">
          <div className="card-body text-center py-12 p-6">
            <h2 className="text-2xl font-semibold mb-2 synthwave-gradient-text">
              No projects yet
            </h2>
            <p className="text-synthwave-text-secondary mb-4">
              Create your first project to get started!
            </p>
            <button
              className="btn bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2.5 px-6"
              onClick={() => setShowCreateModal(true)}
            >
              Create Project
            </button>
          </div>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card synthwave-card shadow-2xl hover:neon-border-purple transition-all"
            >
              <div className="card-body p-6">
                <h2 className="card-title text-synthwave-text-primary mb-3 text-xl font-bold">
                  {project.name}
                </h2>
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-synthwave-text-secondary">
                    <span className="font-semibold text-synthwave-text-primary">
                      Created:
                    </span>{" "}
                    {formatDate(project.created_at)}
                  </p>
                  <p className="text-sm text-synthwave-text-secondary">
                    <span className="font-semibold text-synthwave-text-primary">
                      Updated:
                    </span>{" "}
                    {formatDate(project.updated_at)}
                  </p>
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
                </div>
                <div className="flex justify-end mt-4 gap-3">
                  <Link
                    to={`/projects/${project.id}`}
                    className="btn btn-sm bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2 px-4"
                  >
                    Open
                  </Link>
                  <button
                    className="btn btn-sm bg-red-900/50 hover:bg-red-900/70 border-red-500/50 text-red-200 rounded-lg py-2 px-4"
                    onClick={() => setDeleteTarget(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box synthwave-card border border-synthwave-purple/50 p-6 w-full max-w-full">
            <h3 className="font-bold text-2xl mb-6 synthwave-gradient-text neon-glow-purple">
              Create New Project
            </h3>
            <ProjectForm
              key={`create-${showCreateModal}`}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              submitLabel="Create"
              loading={createLoading}
            />
          </div>
          <div
            className="modal-backdrop bg-black/70"
            onClick={() => setShowCreateModal(false)}
          ></div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal modal-open">
          <div className="modal-box synthwave-card border border-red-500/50 p-6 w-full max-w-full md:max-w-md lg:w-[calc((100%-2rem)/3)] lg:max-w-none">
            <h3 className="font-bold text-2xl mb-4 text-red-200">
              Delete Project
            </h3>
            <p className="mb-6 text-synthwave-text-secondary">
              Are you sure you want to delete this project? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-4 mt-6">
              <button
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => setDeleteTarget(null)}
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
            onClick={() => setDeleteTarget(null)}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
