import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { pointageService } from '../services/api';
import { FiClock, FiLogIn, FiLogOut, FiCheckCircle, FiCoffee } from 'react-icons/fi';
import '../styles/Pointage.css';

const Pointage = () => {
  const navigate = useNavigate();
  const { loginWithCode, pointageDirectLogin, user, isAuthenticated } = useAuth();
  const [code, setCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [pointageUser, setPointageUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const activeUser = isAuthenticated ? user : pointageUser;

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
    setMessage({ type: '', text: '' });
  };

  const handleAuthenticate = async () => {
    if (code.length !== 4) {
      setMessage({ type: 'error', text: 'Le code doit contenir 4 chiffres' });
      return;
    }

    setLoading(true);
    const result = isAuthenticated
      ? await loginWithCode(code)
      : await pointageDirectLogin(code);
    
    if (result.success) {
      const activeUser = result.user || user;

      if (!isAuthenticated && result.token && activeUser) {
        sessionStorage.setItem('pointage_token', result.token);
        sessionStorage.setItem('pointage_user', JSON.stringify(activeUser));
        setPointageUser(activeUser);
      }

      setIsVerified(true);
      setMessage({ type: 'success', text: `Bonjour ${activeUser?.prenom} ${activeUser?.nom}` });
      if (activeUser?.id) {
        loadSessions(activeUser.id);
      }
    } else {
      setMessage({ type: 'error', text: result.message });
      setCode('');
    }
    
    setLoading(false);
  };

  const loadSessions = async (userId) => {
    setLoadingSessions(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const resp = await pointageService.getAll({ user_id: userId, date_debut: today, date_fin: today });
      setSessions(resp.data.pointages || []);
    } catch (err) {
      console.error('Erreur chargement sessions:', err);
      setSessions([]);
    }
    setLoadingSessions(false);
  };

  // Formate des minutes en "1h05m"
  const fmtMins = (raw) => {
    const total = parseInt(raw || 0);
    return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}m`;
  };

  // Après chaque action : dashboard si connecté par email, sinon retour PIN
  const afterAction = () => {
    setTimeout(() => {
      if (isAuthenticated) {
        navigate('/dashboard');
      } else {
        resetForm();
      }
    }, 2500);
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const response = await pointageService.checkIn();
      if (response.data.success) {
        const checkinAt = new Date(response.data.pointage.checkin_at);
        const timeStr = checkinAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessage({ type: 'success', text: `✅ Check-in enregistré à ${timeStr}` });
        afterAction();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors du check-in' });
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const response = await pointageService.checkOut();
      if (response.data.success) {
        const minutes = parseInt(response.data.pointage.duree_travail_minutes || 0);
        const heures = Math.floor(minutes / 60);
        const mins = minutes % 60;
        setMessage({
          type: 'success',
          text: `✅ Check-out — ${heures}h${String(mins).padStart(2, '0')}min travaillées`
        });
        afterAction();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors du check-out' });
    }
    setLoading(false);
  };

  const handleStartPause = async () => {
    setLoading(true);
    try {
      const response = await pointageService.startPause();
      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Pause démarrée' });
        afterAction();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors du démarrage de la pause' });
    }
    setLoading(false);
  };

  const handleEndPause = async () => {
    setLoading(true);
    try {
      const response = await pointageService.endPause();
      if (response.data.success) {
        const mins = parseInt(response.data.pause.duree_minutes || 0);
        setMessage({ type: 'success', text: `✅ Pause terminée — ${fmtMins(mins)}` });
        afterAction();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erreur lors de la fin de la pause' });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCode('');
    setIsVerified(false);
    if (!isAuthenticated) {
      sessionStorage.removeItem('pointage_token');
      sessionStorage.removeItem('pointage_user');
      setPointageUser(null);
    }
    setMessage({ type: '', text: '' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (!isVerified && code.length === 4) {
        handleAuthenticate();
      }
    }
  };

  useEffect(() => {
    if (isVerified && activeUser?.id) loadSessions(activeUser.id);
    else setSessions([]);
  }, [isVerified, activeUser]);

  useEffect(() => {
    const active = sessions.find(s => s.statut === 'en_cours') || null;
    setActiveSession(active);
    setIsPaused(active ? active.pause_active_id != null : false);
  }, [sessions]);

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem('pointage_user');
      sessionStorage.removeItem('pointage_token');
      setPointageUser(null);
      setIsVerified(false);
    }
  }, [isAuthenticated]);

  return (
    <div className="pointage-container">
      <div className="pointage-card">
        <div className="pointage-header">
          <FiClock className="icon-large" />
          <h1>Pointage Rapide</h1>
          <p>Entrez votre code à 4 chiffres</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' && <FiCheckCircle />}
            <span>{message.text}</span>
          </div>
        )}

        {!isVerified ? (
          <div className="code-input-section">
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength="4"
              value={code}
              onChange={handleCodeChange}
              onKeyPress={handleKeyPress}
              placeholder="● ● ● ●"
              className="code-input"
              autoFocus
            />
            <div className="code-display">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={`code-dot ${code[index] ? 'filled' : ''}`}>
                  {code[index] || '●'}
                </div>
              ))}
            </div>
            <button
              onClick={handleAuthenticate}
              disabled={code.length !== 4 || loading}
              className="btn btn-primary btn-large"
            >
              {loading ? 'Vérification...' : 'Valider'}
            </button>
          </div>
        ) : (
          <div className="actions-section">
            <div className="user-info">
              <h2>{activeUser?.prenom} {activeUser?.nom}</h2>
              <p>{activeUser?.email}</p>
            </div>

            <div className="actions-grid">
              {!activeSession ? (
                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="btn btn-success btn-action"
                  style={{ gridColumn: '1 / -1' }}
                >
                  <FiLogIn />
                  <span>Check-In</span>
                  <small>Arrivée</small>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCheckOut}
                    disabled={loading}
                    className="btn btn-danger btn-action"
                  >
                    <FiLogOut />
                    <span>Check-Out</span>
                    <small>Départ</small>
                  </button>

                  <button
                    onClick={isPaused ? handleEndPause : handleStartPause}
                    disabled={loading}
                    className="btn btn-action"
                    style={{
                      background: isPaused ? '#f59e0b' : '#6366f1',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    <FiCoffee />
                    <span>{isPaused ? 'Reprendre' : 'Pause'}</span>
                    <small>{isPaused ? 'Fin de pause' : 'Début de pause'}</small>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={resetForm}
              className="btn btn-secondary"
            >
              Reinitialiser le code
            </button>
            
            <div className="sessions-section">
              <h3>Sessions d'aujourd'hui</h3>
              {loadingSessions ? (
                <p>Chargement...</p>
              ) : sessions.length === 0 ? (
                <p>Aucune session aujourd'hui</p>
              ) : (
                <div className="sessions-list">
                  {sessions.map((s) => (
                    <div key={s.id} className="session-card">
                      <div className="session-times">
                        <strong>Arrivée:</strong> {s.checkin_at ? new Date(s.checkin_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                        {'  '}|{'  '}
                        <strong>Départ:</strong> {s.checkout_at ? new Date(s.checkout_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'En cours'}
                      </div>
                      <div className="session-meta">
                        <span>Durée: {s.duree_travail_minutes != null ? fmtMins(s.duree_travail_minutes) : '-'}</span>
                        <span style={{marginLeft: '1rem'}}>Statut: {s.statut}</span>
                      </div>
                      {s.nb_pauses > 0 && (
                        <div className="session-pauses">
                          <FiCoffee style={{marginRight: '4px', color: '#f59e0b'}} />
                          <span>{s.nb_pauses} pause{s.nb_pauses > 1 ? 's' : ''}</span>
                          {parseInt(s.duree_pauses_minutes || 0) > 0 && (
                            <span style={{marginLeft: '8px', color: '#6b7280'}}>
                              ({fmtMins(s.duree_pauses_minutes)})
                            </span>
                          )}
                          {s.pause_active_id && (
                            <span style={{marginLeft: '8px', color: '#f59e0b', fontWeight: '600'}}>
                              — En pause
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => activeUser?.id && loadSessions(activeUser.id)} className="btn btn-sm">Rafraîchir</button>
            </div>
          </div>
        )}

        <div className="pointage-footer">
          <p>
            Pour accéder à votre tableau de bord complet,{' '}
            <Link to="/login">connectez-vous avec votre email</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pointage;
