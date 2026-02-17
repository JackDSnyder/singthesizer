import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ username, password });
      navigate("/projects");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; non_field_errors?: string[] } } };
      setError(
        error.response?.data?.error || error.response?.data?.non_field_errors?.[0] || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex items-center justify-center synthwave-gradient overflow-hidden">
      <div className="card w-full max-w-md synthwave-card shadow-2xl">
        <div className="card-body p-8">
          <h2 className="card-title justify-center text-3xl mb-6 synthwave-gradient-text neon-glow-purple">
            Login
          </h2>

          {error && (
            <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
              <span className="neon-glow-orange">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-control w-full mb-5">
              <label className="label pb-2">
                <span className="label-text text-synthwave-text-secondary">Username</span>
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                className="input input-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-control w-full mb-6">
              <label className="label pb-2">
                <span className="label-text text-synthwave-text-secondary">Password</span>
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                className="input input-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-3 px-6 w-full"
                disabled={loading}
              >
                {loading ? <span className="loading loading-spinner"></span> : "Login"}
              </button>
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-synthwave-text-secondary">
              Don't have an account?{" "}
              <Link to="/register" className="text-synthwave-blue hover:text-synthwave-purple neon-glow-blue">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

