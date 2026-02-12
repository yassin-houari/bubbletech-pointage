import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pointageService } from '../services/api';
import { FiClock, FiLogIn, FiLogOut, FiCoffee, FiCheckCircle } from 'react-icons/fi';
import '../styles/Pointage.css';

const Pointage = () => {
  const { loginWithCode, user } = useAuth();
  const [code, setCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

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
    const result = await loginWithCode(code);
    
    if (result.success) {
      setIsVerified(true);
      setMessage({ type: 'success', text: `Bonjour ${user.prenom} ${user.nom}` });
    } else {
      setMessage({ type: 'error', text: result.message });
      setCode('');
    }
    
    setLoading(false);
    if (result.success) {
      loadSessions(user.id);
    }
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

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const response = await pointageService.checkIn();
      if (response.data.success) {
        const checkinAt = new Date(response.data.pointage.checkin_at);
        const timeStr = checkinAt.toLocaleTimeString();
        setMessage({ 
          type: 'success', 
          text: `Check-in enregistré à ${timeStr}` 
        });
        setTimeout(() => resetForm(), 3000);
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Erreur lors du check-in' 
      });
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const response = await pointageService.checkOut();
      if (response.data.success) {
        const minutes = response.data.pointage.duree_travail_minutes;
        const heures = Math.floor(minutes / 60);
        const mins = minutes % 60;
        setMessage({ 
          type: 'success', 
          text: `Check-out enregistré. Temps travaillé: ${heures}h${mins}min` 
        });
        setTimeout(() => resetForm(), 3000);
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Erreur lors du check-out' 
      });
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCode('');
    setIsVerified(false);
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
    if (isVerified) loadSessions(user.id);
    else setSessions([]);
  }, [isVerified, user]);

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
              <h2>{user.prenom} {user.nom}</h2>
              <p>{user.email}</p>
            </div>

            <div className="actions-grid">
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="btn btn-success btn-action"
              >
                <FiLogIn />
                <span>Check-In</span>
                <small>Arrivée</small>
              </button>

              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="btn btn-danger btn-action"
              >
                <FiLogOut />
                <span>Check-Out</span>
                <small>Départ</small>
              </button>
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
                        <span>Durée: {s.duree_travail_minutes ? `${Math.floor(s.duree_travail_minutes/60)}h${s.duree_travail_minutes%60}m` : '-'}</span>
                        <span style={{marginLeft: '1rem'}}>Statut: {s.statut}</span>
                      </div>
                      {s.pauses && s.pauses.length > 0 && (
                        <div className="session-pauses">
                          <em>Pauses:</em>
                          <ul>
                            {s.pauses.map((p) => (
                              <li key={p.id}>
                                {p.debut_at ? new Date(p.debut_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-'}
                                {' → '}
                                {p.fin_at ? new Date(p.fin_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'En cours'}
                                {' ('}{p.duree_minutes ? `${p.duree_minutes}m` : '-'}{')'}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => loadSessions(user.id)} className="btn btn-sm">Rafraîchir</button>
            </div>
          </div>
        )}

        <div className="pointage-footer">
          <p>Pour accéder à votre tableau de bord complet, connectez-vous avec votre email</p>
        </div>
      </div>
    </div>
  );
};

export default Pointage;
