import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { login as loginService, register as registerService, logout as logoutService, getToken } from "../services/auth";
import type { LoginData, RegisterData } from "../services/auth";
import { AuthContext } from "./AuthContext.types";
import api from "../services/api";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        await api.get("/projects/");
        setIsAuthenticated(true);
      } catch {
        logoutService();
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  const login = async (data: LoginData) => {
    await loginService(data);
    setIsAuthenticated(true);
  };

  const register = async (data: RegisterData) => {
    await registerService(data);
    setIsAuthenticated(true);
  };

  const logout = () => {
    logoutService();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

