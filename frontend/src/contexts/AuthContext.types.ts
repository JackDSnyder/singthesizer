import { createContext } from "react";
import type { LoginData, RegisterData } from "../services/auth";

export interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

