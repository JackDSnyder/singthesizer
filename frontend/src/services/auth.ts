import api from "./api";
import { setToken } from "./token";

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
  const response = await api.post<AuthResponse>("auth/register/", data);
  const { token } = response.data;
  setToken(token);
  return { token };
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>("auth/login/", data);
  const { token } = response.data;
  setToken(token);
  return { token };
};

