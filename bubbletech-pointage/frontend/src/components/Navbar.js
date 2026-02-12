import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FiHome, FiClock, FiUsers, FiLogOut, FiMenu 
} from 'react-icons/fi';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/dashboard">
            <FiClock /> BubbleTech Pointage
          </Link>
        </div>

        <button 
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <FiMenu />
        </button>

        <div className={`navbar-menu ${menuOpen ? 'active' : ''}`}>
          <div className="navbar-links">
            <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
              <FiHome /> Tableau de bord
            </Link>
            <Link to="/pointage" onClick={() => setMenuOpen(false)}>
              <FiClock /> Pointage
            </Link>
            {isAdminOrManager && (
              <Link to="/users" onClick={() => setMenuOpen(false)}>
                <FiUsers /> Personnel
              </Link>
            )}
          </div>

          <div className="navbar-user">
            <span className="user-name">
              {user?.prenom} {user?.nom}
            </span>
            <button onClick={handleLogout} className="btn-logout">
              <FiLogOut /> Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
