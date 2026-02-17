import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 synthwave-card border-b border-synthwave-purple/50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold synthwave-gradient-text neon-glow-purple">
            Singthesizer
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <button
                onClick={() => navigate("/projects")}
                className="btn btn-sm bg-synthwave-purple hover:bg-synthwave-purple/80 border-synthwave-purple text-white neon-border-purple rounded-lg py-2 px-4"
              >
                My Projects
              </button>
            )}
            {isAuthenticated ? (
              <button
                onClick={handleSignOut}
                className="btn btn-sm bg-synthwave-card border-synthwave-purple/50 text-synthwave-text-primary hover:bg-synthwave-card/80 rounded-lg py-2 px-4"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="btn btn-sm bg-synthwave-blue hover:bg-synthwave-blue/80 border-synthwave-blue text-white neon-border-blue rounded-lg py-2 px-4"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

