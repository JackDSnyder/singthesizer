import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";

const ProjectList = () => (
  <div className="container mx-auto p-4">
    <h1 className="text-2xl font-bold">Projects</h1>
    <p className="mt-4">Project list will be implemented in Part 5.</p>
  </div>
);

const ProjectDetail = () => (
  <div className="container mx-auto p-4">
    <h1 className="text-2xl font-bold">Project Detail</h1>
    <p className="mt-4">Project detail will be implemented in Part 5.</p>
  </div>
);

const HomeRedirect = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/projects" : "/login"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <ProjectList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
