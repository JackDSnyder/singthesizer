import axios from "axios";
import { getToken, logout } from "./token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: 401 = token missing/expired on protected API (not login failure).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? "");
    const isAuthLoginAttempt =
      url.includes("auth/login") || /(^|\/)login\/?(\?|$)/.test(url);

    if (status === 401 && !isAuthLoginAttempt) {
      logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

