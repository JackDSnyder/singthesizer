import axios from "axios";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
} from "../../services/projects";
import ProjectForm, { type ProjectFormData } from "./ProjectForm";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteProjectError, setDeleteProjectError] = useState("");
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
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
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setError(
        getApiErrorMessage(err, "Failed to load projects. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: ProjectFormData) => {
    setCreateLoading(true);
    setCreateError("");
    try {
      const newProject = await createProject(data);
      setProjects([newProject, ...projects]);
      setShowCreateModal(false);
      navigate(`/projects/${newProject.id}`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setCreateError(
        getApiErrorMessage(err, "Could not create project. Please try again."),
      );
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditSave = async (data: ProjectFormData) => {
    if (!editProject) return;

    setEditLoading(true);
    setEditError("");
    try {
      const updated = await updateProject(editProject.id, data);
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setEditProject(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setEditError(
        getApiErrorMessage(err, "Could not update project. Please try again.")
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setDeleteProjectError("");
    try {
      await deleteProject(deleteTarget);
      setProjects(projects.filter((p) => p.id !== deleteTarget));
      setDeleteTarget(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setDeleteProjectError(
        getApiErrorMessage(err, "Failed to delete project. Please try again."),
      );
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
    <div className="container mx-auto max-w-6xl w-full px-4 h-[calc(100vh-80px)] overflow-y-auto py-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold synthwave-gradient-text neon-glow-purple">
          My Projects
        </h1>
        {projects.length > 0 && (
          <button
            type="button"
            className="btn bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2.5 px-6"
            onClick={() => {
              setCreateError("");
              setShowCreateModal(true);
            }}
          >
            Create New Project
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
        >
          <span className="neon-glow-orange">{error}</span>
        </div>
      )}

      {projects.length === 0 && !showCreateModal ? (
        <div className="card synthwave-card w-full shadow-2xl">
          <div className="card-body text-center py-12 p-6">
            <h2 className="text-2xl font-semibold mb-2 synthwave-gradient-text">
              No projects yet
            </h2>
            <p className="text-synthwave-text-secondary mb-4">
              Create your first project to get started!
            </p>
            <button
              className="btn bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2.5 px-6"
              onClick={() => {
                setCreateError("");
                setShowCreateModal(true);
              }}
            >
              Create Project
            </button>
          </div>
        </div>
      ) : projects.length > 0 ? (
        <ul className="flex w-full flex-col gap-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className="synthwave-card shadow-2xl hover:neon-border-purple transition-all rounded-xl"
            >
              <div className="flex w-full min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
                  <h2 className="min-w-0 shrink-0 text-xl font-bold text-synthwave-text-primary">
                    {project.name}
                  </h2>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-synthwave-text-secondary">
                    <span>
                      <span className="font-semibold text-synthwave-text-primary">
                        Created:
                      </span>{" "}
                      {formatDate(project.created_at)}
                    </span>
                    <span>
                      <span className="font-semibold text-synthwave-text-primary">
                        Updated:
                      </span>{" "}
                      {formatDate(project.updated_at)}
                    </span>
                    <span>
                      <span className="font-semibold text-synthwave-text-primary">
                        BPM:
                      </span>{" "}
                      {project.bpm}
                    </span>
                    <span>
                      <span className="font-semibold text-synthwave-text-primary">
                        Key:
                      </span>{" "}
                      {project.key}
                    </span>
                    <span>
                      <span className="font-semibold text-synthwave-text-primary">
                        Length:
                      </span>{" "}
                      {project.bars} {project.bars === 1 ? "bar" : "bars"}{" "}
                      &middot;{" "}
                      {((project.bars * 4 * 60) / project.bpm).toFixed(1)}s
                    </span>
                  </div>
                </div>
                <div className="flex w-full min-w-0 shrink-0 flex-nowrap items-center justify-end gap-3 overflow-x-auto sm:w-auto sm:justify-end">
                  <Link
                    to={`/projects/${project.id}`}
                    className="btn btn-sm bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2 px-4"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary hover:bg-synthwave-card/80 rounded-lg py-2 px-4"
                    onClick={() => {
                      setEditError("");
                      setEditProject(project);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm bg-red-900/50 hover:bg-red-900/70 border-red-500/50 text-red-200 rounded-lg py-2 px-4"
                    onClick={() => {
                      setDeleteProjectError("");
                      setDeleteTarget(project.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!createLoading) {
                setCreateError("");
                setShowCreateModal(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl synthwave-modal-panel border border-synthwave-purple/40 p-6">
            <h3 className="font-bold text-2xl mb-4 text-synthwave-text-primary">
              Create New Project
            </h3>
            {createError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
              >
                <span className="neon-glow-orange">{createError}</span>
              </div>
            )}
            <ProjectForm
              key={`create-${showCreateModal}`}
              onSubmit={handleCreate}
              onCancel={() => {
                if (!createLoading) {
                  setCreateError("");
                  setShowCreateModal(false);
                }
              }}
              submitLabel="Create"
              loading={createLoading}
            />
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!editLoading) {
                setEditError("");
                setEditProject(null);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl synthwave-modal-panel border border-synthwave-purple/40 p-6">
            <h3 className="font-bold text-2xl mb-4 text-synthwave-text-primary">
              Edit Project
            </h3>
            {editError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
              >
                <span className="neon-glow-orange">{editError}</span>
              </div>
            )}
            <ProjectForm
              key={`edit-list-${editProject.id}`}
              initialData={{
                name: editProject.name,
                bpm: editProject.bpm,
                key: editProject.key,
                bars: editProject.bars,
              }}
              onSubmit={handleEditSave}
              onCancel={() => {
                if (!editLoading) {
                  setEditError("");
                  setEditProject(null);
                }
              }}
              submitLabel="Save"
              loading={editLoading}
              barsLocked={editProject.track_count > 0}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleteLoading) {
                setDeleteProjectError("");
                setDeleteTarget(null);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl synthwave-modal-panel border border-red-500/50 p-6">
            <h3 className="font-bold text-2xl mb-4 text-red-200">
              Delete Project
            </h3>
            <p className="mb-6 text-synthwave-text-secondary">
              Are you sure you want to delete this project? This action cannot
              be undone.
            </p>
            {deleteProjectError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-200"
              >
                <span className="neon-glow-orange">{deleteProjectError}</span>
              </div>
            )}
            <div className="flex justify-end gap-4 mt-6">
              <button
                className="btn bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2.5 px-6"
                onClick={() => {
                  setDeleteProjectError("");
                  setDeleteTarget(null);
                }}
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
        </div>
      )}
    </div>
  );
};

export default ProjectList;
