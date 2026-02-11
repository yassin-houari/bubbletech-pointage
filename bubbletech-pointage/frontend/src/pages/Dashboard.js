import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pointageService, userService } from '../services/api';
import { 
  FiUsers, FiClock, FiCheckCircle, FiXCircle, 
  FiCalendar, FiTrendingUp 
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user, isAdmin, isAdminOrManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [pointages, setPointages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger les statistiques
      const statsResponse = await pointageService.getStats({
        date_debut: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd')
      });
      setStats(statsResponse.data.stats);

      // Charger les pointages récents
      const pointagesResponse = await pointageService.getAll({
        date_debut: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd')
      });
      setPointages(pointagesResponse.data.pointages || []);

      // Si admin ou manager, charger la liste des utilisateurs
      if (isAdminOrManager) {
        const usersResponse = await userService.getAll({ actif: 'true' });
        setAllUsers(usersResponse.data.users || []);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    }
    setLoading(false);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0h00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const getTodayAttendance = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayPointages = pointages.filter(p => p.date_pointage === today);
    const present = todayPointages.filter(p => p.statut === 'en_cours' || p.statut === 'termine').length;
    return { present, total: allUsers.length };
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Chargement du tableau de bord...</div>
      </div>
    );
  }

  const attendance = isAdminOrManager ? getTodayAttendance() : null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tableau de bord</h1>
        <p>Bienvenue, {user.prenom} {user.nom}</p>
      </div>

      {/* Statistiques */}
      <div className="stats-grid">
        {isAdmin && (
          <>
            <div className="stat-card">
              <div className="stat-icon blue">
                <FiUsers />
              </div>
              <div className="stat-info">
                <h3>{allUsers.length}</h3>
                <p>Utilisateurs actifs</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <FiCheckCircle />
              </div>
              <div className="stat-info">
                <h3>{attendance.present}</h3>
                <p>Présents aujourd'hui</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">
                <FiXCircle />
              </div>
              <div className="stat-info">
                <h3>{attendance.total - attendance.present}</h3>
                <p>Absents aujourd'hui</p>
              </div>
            </div>
          </>
        )}

        <div className="stat-card">
          <div className="stat-icon purple">
            <FiClock />
          </div>
          <div className="stat-info">
            <h3>{stats?.total_pointages || 0}</h3>
            <p>Pointages ce mois</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FiTrendingUp />
          </div>
          <div className="stat-info">
            <h3>{formatDuration(stats?.duree_moyenne_minutes)}</h3>
            <p>Durée moyenne</p>
          </div>
        </div>
      </div>

      {/* Pointages récents */}
      <div className="section">
        <div className="section-header">
          <h2><FiCalendar /> Pointages récents (7 derniers jours)</h2>
        </div>

        {pointages.length === 0 ? (
          <div className="empty-state">
            <p>Aucun pointage enregistré</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {isAdminOrManager && <th>Nom</th>}
                  <th>Date</th>
                  <th>Arrivée</th>
                  <th>Départ</th>
                  <th>Durée</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {pointages.slice(0, 10).map((pointage) => (
                  <tr key={pointage.id}>
                    {isAdminOrManager && (
                      <td>{pointage.prenom} {pointage.nom}</td>
                    )}
                    <td>
                      {format(new Date(pointage.date_pointage), 'dd MMMM yyyy', { locale: fr })}
                    </td>
                    <td>{pointage.heure_checkin}</td>
                    <td>{pointage.heure_checkout || '-'}</td>
                    <td>{formatDuration(pointage.duree_travail_minutes)}</td>
                    <td>
                      <span className={`badge badge-${pointage.statut}`}>
                        {pointage.statut === 'en_cours' ? 'En cours' :
                         pointage.statut === 'termine' ? 'Terminé' : 'Incomplet'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className="quick-actions">
        <h2>Actions rapides</h2>
        <div className="actions-grid">
          <button 
            onClick={() => window.location.href = '/pointage'} 
            className="btn btn-primary"
          >
            <FiClock /> Pointer
          </button>
          {isAdmin && (
            <button 
              onClick={() => window.location.href = '/users'} 
              className="btn btn-secondary"
            >
              <FiUsers /> Gérer le personnel
            </button>
          )}
          <button 
            onClick={() => window.location.href = '/my-pointages'} 
            className="btn btn-secondary"
          >
            <FiCalendar /> Mes pointages
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
