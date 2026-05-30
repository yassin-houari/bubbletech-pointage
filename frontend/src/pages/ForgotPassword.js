import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import {
  FiMail, FiCheckCircle, FiAlertCircle,
  FiLock, FiArrowLeft, FiRefreshCw
} from 'react-icons/fi';
import '../styles/Login.css';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Étape 1 = email, Étape 2 = code + nouveau mot de passe, 3 = succès
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const codeInputs = useRef([]);

  // ── ÉTAPE 1 : Envoyer le code ──────────────────────────────────
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi du code');
    }
    setLoading(false);
  };

  // ── Renvoyer le code ──────────────────────────────────────────
  const handleResend = async () => {
    setResendMsg('');
    setError('');
    setResendLoading(true);
    try {
      await authService.forgotPassword(email);
      setResendMsg('Nouveau code envoyé !');
      setCode(['', '', '', '', '', '']);
      if (codeInputs.current[0]) codeInputs.current[0].focus();
    } catch (err) {
      setError('Erreur lors du renvoi du code');
    }
    setResendLoading(false);
  };

  // ── Gestion de la saisie du code (cases individuelles) ──────────
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // chiffres uniquement
    const newCode = [...code];
    newCode[index] = value.slice(-1); // 1 chiffre max
    setCode(newCode);
    // Avancer automatiquement au champ suivant
    if (value && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) newCode[i] = pasted[i];
    setCode(newCode);
    const nextEmpty = Math.min(pasted.length, 5);
    codeInputs.current[nextEmpty]?.focus();
  };

  // ── ÉTAPE 2 : Vérifier le code + nouveau mot de passe ──────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      return setError('Veuillez saisir le code à 6 chiffres complet');
    }
    if (newPassword.length < 8) {
      return setError('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (newPassword !== confirmPassword) {
      return setError('Les mots de passe ne correspondent pas');
    }

    setLoading(true);
    try {
      await authService.resetPasswordWithCode(email, fullCode, newPassword);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide ou expiré');
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '440px' }}>

        {/* ── ÉTAPE 1 : Email ── */}
        {step === 1 && (
          <>
            <div className="login-header">
              <h1>Mot de passe oublié</h1>
              <p>Entrez votre email pour recevoir un code de vérification</p>
            </div>

            {error && (
              <div className="error-message">
                <FiAlertCircle /><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSendCode} className="login-form">
              <div className="form-group">
                <label htmlFor="email"><FiMail /> Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre.email@bubbletech.be"
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Envoi en cours...' : 'Envoyer le code de vérification'}
              </button>
            </form>

            <div className="login-footer">
              <Link to="/login" className="link"><FiArrowLeft /> Retour à la connexion</Link>
            </div>
          </>
        )}

        {/* ── ÉTAPE 2 : Code OTP + nouveau mot de passe ── */}
        {step === 2 && (
          <>
            <div className="login-header">
              <h1>Vérification</h1>
              <p>
                Un code à 6 chiffres a été envoyé à<br />
                <strong style={{ color: '#4F46E5' }}>{email}</strong>
              </p>
            </div>

            {error && (
              <div className="error-message">
                <FiAlertCircle /><span>{error}</span>
              </div>
            )}

            {resendMsg && (
              <div className="success-message" style={{ marginBottom: '1rem' }}>
                <FiCheckCircle /><span>{resendMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="login-form">

              {/* Cases du code OTP */}
              <div className="form-group">
                <label>Code de vérification (6 chiffres)</label>
                <div style={{
                  display: 'flex', gap: '8px', justifyContent: 'center', margin: '8px 0'
                }}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => codeInputs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      onPaste={i === 0 ? handleCodePaste : undefined}
                      autoFocus={i === 0}
                      style={{
                        width: '48px', height: '56px',
                        textAlign: 'center', fontSize: '22px', fontWeight: 'bold',
                        border: '2px solid ' + (digit ? '#4F46E5' : '#d1d5db'),
                        borderRadius: '8px', outline: 'none',
                        background: digit ? '#eff6ff' : '#fff',
                        color: '#1d4ed8', transition: 'all 0.15s'
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', margin: '4px 0 0' }}>
                  ⏱️ Ce code expire dans <strong>15 minutes</strong>
                </p>
              </div>

              {/* Nouveau mot de passe */}
              <div className="form-group">
                <label htmlFor="newPassword"><FiLock /> Nouveau mot de passe</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword"><FiLock /> Confirmer le mot de passe</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Répétez le mot de passe"
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading || code.join('').length !== 6}>
                {loading ? 'Vérification...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>

            <div className="login-footer" style={{ flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                <FiRefreshCw style={{ marginRight: '4px' }} />
                {resendLoading ? 'Renvoi...' : 'Renvoyer le code'}
              </button>
              <button
                onClick={() => { setStep(1); setError(''); setCode(['','','','','','']); }}
                className="link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                <FiArrowLeft style={{ marginRight: '4px' }} /> Changer l'email
              </button>
            </div>
          </>
        )}

        {/* ── ÉTAPE 3 : Succès ── */}
        {step === 3 && (
          <>
            <div className="login-header">
              <div style={{ fontSize: '60px', marginBottom: '12px' }}>✅</div>
              <h1>Mot de passe modifié !</h1>
              <p>Votre mot de passe a été réinitialisé avec succès.</p>
            </div>

            <div className="success-message" style={{ margin: '16px 0 24px' }}>
              <FiCheckCircle />
              <span>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</span>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              Se connecter →
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
