import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await register({
        username,
        email,
        password,
        password_confirm: passwordConfirm,
      });
      navigate("/projects");
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?:
            | string
            | {
                password?: string | string[];
                username?: string | string[];
                email?: string | string[];
              };
        };
      };
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") {
          setError(data);
        } else if (data.password) {
          setError(
            Array.isArray(data.password) ? data.password[0] : data.password,
          );
        } else if (data.username) {
          setError(
            Array.isArray(data.username) ? data.username[0] : data.username,
          );
        } else if (data.email) {
          setError(Array.isArray(data.email) ? data.email[0] : data.email);
        } else {
          setError("Registration failed. Please try again.");
        }
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex items-center justify-center synthwave-gradient overflow-hidden">
      <div className="card w-full max-w-md synthwave-card synthwave-card-auth shadow-2xl">
        <div className="card-body p-8">
          <h2 className="card-title justify-center text-3xl mb-6 synthwave-gradient-text neon-glow-purple">
            Register
          </h2>

          {error && (
            <div className="alert bg-red-900/30 border-red-500/50 text-red-200 mb-4">
              <span className="neon-glow-orange">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-control w-full mb-5">
              <label className="label pb-2">
                <span className="label-text text-synthwave-text-secondary">
                  Username
                </span>
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

            <div className="form-control w-full mb-5">
              <label className="label pb-2">
                <span className="label-text text-synthwave-text-secondary">
                  Email
                </span>
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className="input input-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-control w-full mb-5">
              <label className="label pb-2">
                <span className="label-text text-synthwave-text-secondary">
                  Password
                </span>
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

            <div className="form-control w-full mb-6">
              <label className="label pb-2">
                <span className="label-text text-synthwave-text-secondary">
                  Confirm Password
                </span>
              </label>
              <input
                type="password"
                placeholder="Confirm your password"
                className="input input-bordered w-full bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary synthwave-input-focus rounded-lg py-2.5 px-4"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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
                {loading ? (
                  <span className="loading loading-spinner"></span>
                ) : (
                  "Register"
                )}
              </button>
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-synthwave-text-secondary">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-synthwave-orange hover:text-synthwave-purple neon-glow-orange"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
