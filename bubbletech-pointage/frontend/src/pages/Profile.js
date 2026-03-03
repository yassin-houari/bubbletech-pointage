import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService, userService } from '../services/api';
import '../styles/Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingSecretCode, setSavingSecretCode] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [profileData, setProfileData] = useState({
    nom: '',
    prenom: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [secretCodeData, setSecretCodeData] = useState({
    oldCode: '',
    newCode: '',
    confirmCode: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await authService.getProfile();
      const profile = response.data.user;
      setProfileData({
        nom: profile.nom || '',
        prenom: profile.prenom || '',
        email: profile.email || ''
      });
      updateUser(profile);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors du chargement du profil.'
      });
    }
    setLoading(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!profileData.nom || !profileData.prenom || !profileData.email) {
      setMessage({ type: 'error', text: 'Nom, prénom et email sont requis.' });
      return;
    }

    setSavingProfile(true);
    try {
      await userService.update(user.id, {
        nom: profileData.nom,
        prenom: profileData.prenom,
        email: profileData.email
      });

      const refreshed = await authService.getProfile();
      updateUser(refreshed.data.user);

      setMessage({ type: 'success', text: 'Informations personnelles mises à jour.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors de la mise à jour du profil.'
      });
    }
    setSavingProfile(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Tous les champs de mot de passe sont requis.' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'La confirmation du mot de passe ne correspond pas.' });
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword(passwordData.oldPassword, passwordData.newPassword);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      updateUser({ doit_changer_mdp: false });
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors du changement de mot de passe.'
      });
    }
    setSavingPassword(false);
  };

  const handleSecretCodeSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!secretCodeData.oldCode || !secretCodeData.newCode || !secretCodeData.confirmCode) {
      setMessage({ type: 'error', text: 'Tous les champs du code secret sont requis.' });
      return;
    }

    if (!/^\d{4}$/.test(secretCodeData.oldCode) || !/^\d{4}$/.test(secretCodeData.newCode)) {
      setMessage({ type: 'error', text: 'Le code secret doit contenir exactement 4 chiffres.' });
      return;
    }

    if (secretCodeData.newCode !== secretCodeData.confirmCode) {
      setMessage({ type: 'error', text: 'La confirmation du code secret ne correspond pas.' });
      return;
    }

    setSavingSecretCode(true);
    try {
      await authService.changeSecretCode(secretCodeData.oldCode, secretCodeData.newCode);
      setSecretCodeData({ oldCode: '', newCode: '', confirmCode: '' });
      setMessage({ type: 'success', text: 'Code secret modifié avec succès.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors du changement du code secret.'
      });
    }
    setSavingSecretCode(false);
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Chargement du profil...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
        <p>Gérez vos informations personnelles</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="profile-grid">
        <div className="card">
          <h2>Informations personnelles</h2>
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label>Prénom</label>
              <input
                type="text"
                value={profileData.prenom}
                onChange={(e) => setProfileData({ ...profileData, prenom: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                value={profileData.nom}
                onChange={(e) => setProfileData({ ...profileData, nom: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Modifier le mot de passe</h2>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Mise à jour...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Modifier le code secret</h2>
          <form onSubmit={handleSecretCodeSubmit}>
            <div className="form-group">
              <label>Code secret actuel</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={secretCodeData.oldCode}
                onChange={(e) => setSecretCodeData({ ...secretCodeData, oldCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                required
                placeholder="0000"
              />
            </div>
            <div className="form-group">
              <label>Nouveau code secret</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={secretCodeData.newCode}
                onChange={(e) => setSecretCodeData({ ...secretCodeData, newCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                required
                placeholder="0000"
              />
            </div>
            <div className="form-group">
              <label>Confirmer le nouveau code secret</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={secretCodeData.confirmCode}
                onChange={(e) => setSecretCodeData({ ...secretCodeData, confirmCode: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                required
                placeholder="0000"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={savingSecretCode}>
              {savingSecretCode ? 'Mise à jour...' : 'Changer le code secret'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
