import api from "./api";

export interface Project {
  id: number;
  name: string;
  user: number;
  bpm: number;
  key: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  bpm?: number;
  key?: string;
}

export interface UpdateProjectData {
  name: string;
  bpm?: number;
  key?: string;
}

export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get<Project[]>("projects/");
  return response.data;
};

export const getProject = async (id: number): Promise<Project> => {
  const response = await api.get<Project>(`projects/${id}/`);
  return response.data;
};

export const createProject = async (data: CreateProjectData): Promise<Project> => {
  const response = await api.post<Project>("projects/", data);
  return response.data;
};

export const updateProject = async (id: number, data: UpdateProjectData): Promise<Project> => {
  const response = await api.patch<Project>(`projects/${id}/`, data);
  return response.data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(`projects/${id}/`);
};

