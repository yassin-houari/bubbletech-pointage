import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/api';
import { format } from 'date-fns';

const Personnel = () => {
  const { isAdmin, isAdminOrManager, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      // Managers will receive their team from the backend (see controller)
      const res = await userService.getAll(params);
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;
    try {
      await userService.delete(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error('Erreur suppression', err);
      alert(err.response?.data?.message || 'Erreur suppression');
    }
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingUser({ nom: '', prenom: '', email: '', role: 'personnel', actif: true, password: '', doit_changer_mdp: false, code_secret: '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...editingUser };
      if (payload.password === '') {
        delete payload.password;
      }
      if (payload.code_secret === '') {
        delete payload.code_secret;
      }

      if (payload.id) {
        await userService.update(payload.id, payload);
        await loadUsers();
      } else {
        await userService.create(payload);
        await loadUsers();
      }
      setShowForm(false);
    } catch (err) {
      console.error('Erreur sauvegarde', err);
      alert(err.response?.data?.message || 'Erreur sauvegarde');
    }
  };

  if (!isAdminOrManager) {
    return <div>Accès refusé.</div>;
  }

  return (
    <div className="personnel-page">
      <div className="page-header">
        <h1>Personnel</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Rechercher nom, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreate}>Ajouter</button>
          )}
        </div>
      </div>

      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Poste</th>
                <th>Embauche</th>
                <th>Actif</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(u => {
                  if (!search) return true;
                  const s = search.toLowerCase();
                  return (u.nom || '').toLowerCase().includes(s) || (u.prenom || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s);
                })
                .map(u => (
                  <tr key={u.id}>
                    <td>{u.prenom} {u.nom}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.poste_nom || '-'}</td>
                    <td>{u.date_embauche ? format(new Date(u.date_embauche), 'dd/MM/yyyy') : '-'}</td>
                    <td>{u.actif ? 'Oui' : 'Non'}</td>
                    <td>
                      <button className="btn" onClick={() => openEdit(u)}>Éditer</button>
                      {isAdmin && (
                        <button className="btn btn-danger" onClick={() => handleDelete(u.id)}>Supprimer</button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <h3>{editingUser.id ? 'Modifier utilisateur' : 'Créer utilisateur'}</h3>
            <form onSubmit={handleSubmit}>
              <div>
                <label>Prénom</label>
                <input value={editingUser.prenom} onChange={(e) => setEditingUser({ ...editingUser, prenom: e.target.value })} required />
              </div>
              <div>
                <label>Nom</label>
                <input value={editingUser.nom} onChange={(e) => setEditingUser({ ...editingUser, nom: e.target.value })} required />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} required />
              </div>
              {isAdmin && (
                <div>
                  <label>Code secret (4 chiffres)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={editingUser.code_secret || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, code_secret: e.target.value })}
                    placeholder="0000"
                  />
                </div>
              )}
              <div>
                <label>Mot de passe (laisser vide pour générer un mot de passe temporaire)</label>
                <input type="password" value={editingUser.password || ''} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} />
              </div>
              <div>
                <label>Forcer changement mot de passe</label>
                <select value={editingUser.doit_changer_mdp ? 'true' : 'false'} onChange={(e) => setEditingUser({ ...editingUser, doit_changer_mdp: e.target.value === 'true' })}>
                  <option value="false">Non</option>
                  <option value="true">Oui</option>
                </select>
              </div>
              <div>
                <label>Rôle</label>
                <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                  <option value="personnel">Personnel</option>
                  <option value="stagiaire">Stagiaire</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label>Actif</label>
                <select value={editingUser.actif ? 'true' : 'false'} onChange={(e) => setEditingUser({ ...editingUser, actif: e.target.value === 'true' })}>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </select>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" type="submit">Sauvegarder</button>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Personnel;
