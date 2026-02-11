import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pointageService } from '../services/api';
import { FiClock, FiLogIn, FiLogOut, FiCoffee, FiCheckCircle } from 'react-icons/fi';
import '../styles/Pointage.css';

const Pointage = () => {
  const { loginWithCode } = useAuth();
  const [code, setCode] = useState('');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

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
      setUser(result.user);
      setMessage({ type: 'success', text: `Bonjour ${result.user.prenom} ${result.user.nom}` });
    } else {
      setMessage({ type: 'error', text: result.message });
      setCode('');
    }
    
    setLoading(false);
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const response = await pointageService.checkIn(user.id);
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `Check-in enregistré à ${response.data.pointage.heure_checkin}` 
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
      const response = await pointageService.checkOut(user.id);
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
    setUser(null);
    setMessage({ type: '', text: '' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (!user && code.length === 4) {
        handleAuthenticate();
      }
    }
  };

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

        {!user ? (
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
              Changer d'utilisateur
            </button>
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
