import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { FiMail, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import '../styles/Login.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authService.requestPasswordReset(email);
      setSuccess(response.data?.message || 'Si cet email existe, un nouveau mot de passe a été envoyé');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la demande de réinitialisation');
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Mot de passe oublié</h1>
          <p>Entrez votre email pour recevoir un mot de passe temporaire</p>
        </div>

        {error && (
          <div className="error-message">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-message" style={{ marginBottom: '1rem' }}>
            <FiCheckCircle />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">
              <FiMail /> Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre.email@bubbletech.be"
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Envoi...' : 'Demander la réinitialisation'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/login" className="link">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
