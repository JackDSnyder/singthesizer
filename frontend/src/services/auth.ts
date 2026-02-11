import api from "./api";

const TOKEN_KEY = "token";

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/register/", data);
  const { token } = response.data;
  setToken(token);
  return { token };
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("/auth/login/", data);
  const { token } = response.data;
  setToken(token);
  return { token };
};

export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

