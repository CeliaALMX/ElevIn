import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, Key, RefreshCw, Briefcase, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../ui/Avatar';
import AdminPasswordModal from '../admin/AdminPasswordModal';

const AdminDashboard = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'posts'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de contraseña
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Cargar usuarios desde Supabase
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Error cargando usuarios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 1. Cambiar Rol (PÚBLICO)
  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // 2. Cambiar Permisos de Admin (INTERNO)
  const handleAdminToggle = async (user) => {
    const newValue = !user.is_admin;
    const action = newValue ? "dar permisos de Administrador" : "quitar permisos de Administrador";

    if (!window.confirm(`¿Seguro que quieres ${action} a ${user.full_name}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: newValue })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(users.map(u => u.id === user.id ? { ...u, is_admin: newValue } : u));
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  // Filtrado
  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Acceso SOLO por bandera interna: is_admin
  if (!currentUser?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
        <Shield size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-ivory">Acceso Restringido</h1>
        <p className="text-gray-600 dark:text-softgray">No tienes permisos de administrador.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-emerald-dark p-6 rounded-xl shadow-sm border border-gray-100 dark:border-emerald-800">
        <div>
          <h1 className="text-3xl font-bold text-emerald-deep dark:text-gold-premium flex items-center gap-2">
            <Shield className="fill-emerald-deep dark:fill-gold-premium text-white dark:text-emerald-deep" />
            Panel de Administración
          </h1>
          <p className="text-gray-500 dark:text-softgray text-sm mt-1">Gestión global de la plataforma AscenLin.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-emerald-deep/50 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'users'
              ? 'bg-white dark:bg-emerald-dark shadow text-emerald-deep dark:text-gold-premium'
              : 'text-gray-500 dark:text-softgray hover:text-emerald-deep dark:hover:text-gold-premium'
            }`}
          >
            <Users size={16} className="inline mr-2" /> Usuarios
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'posts'
              ? 'bg-white dark:bg-emerald-dark shadow text-emerald-deep dark:text-gold-premium'
              : 'text-gray-500 dark:text-softgray hover:text-emerald-deep dark:hover:text-gold-premium'
            }`}
          >
            <Briefcase size={16} className="inline mr-2" /> Posts
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-emerald-800 bg-white dark:bg-emerald-dark outline-none focus:ring-2 focus:ring-gold-premium"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-3 rounded-xl bg-emerald-deep text-ivory hover:bg-emerald-dark transition flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-emerald-dark rounded-xl shadow-sm border border-gray-100 dark:border-emerald-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-emerald-800 flex items-center justify-between">
            <h2 className="font-bold text-emerald-deep dark:text-gold-premium">Usuarios</h2>
            <span className="text-xs text-gray-500 dark:text-softgray">{filteredUsers.length} resultados</span>
          </div>

          {loading ? (
            <div className="p-10 flex justify-center"><RefreshCw className="animate-spin" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-softgray">No hay usuarios para mostrar.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-emerald-800">
              {filteredUsers.map(u => (
                <div key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.full_name} src={u.avatar_url} size="md" />
                    <div>
                      <div className="font-semibold text-gray-800 dark:text-ivory flex items-center gap-2">
                        {u.full_name || 'Sin nombre'}
                        {u.is_admin && <Shield size={12} className="text-gold-premium fill-gold-premium" title="Administrador" />}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-softgray">{u.email || 'Sin correo'}</div>
                      <div className="text-[11px] text-gray-400">
                        ID: {u.id}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center justify-end">
                    {/* Rol público */}
                    <select
                      value={u.role || 'Técnico'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className={`px-3 py-2 rounded-lg border text-sm outline-none
                        ${u.role === 'Empresa' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          u.role === 'Ingeniero' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                    >
                      <option value="Técnico">Técnico</option>
                      <option value="Ingeniero">Ingeniero</option>
                      <option value="Empresa">Empresa</option>
                    </select>

                    {/* Toggle Admin (interno) */}
                    <button
                      onClick={() => handleAdminToggle(u)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border transition
                        ${u.is_admin ? 'bg-gold-premium/20 text-gold-premium border-gold-premium/40' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                      title={u.is_admin ? "Quitar Admin" : "Hacer Admin"}
                    >
                      <Shield size={16} className="inline mr-1" />
                      {u.is_admin ? 'Admin' : 'Normal'}
                    </button>

                    {/* Cambiar contraseña */}
                    <button
                      onClick={() => { setSelectedUser(u); setPasswordModalOpen(true); }}
                      className="px-3 py-2 rounded-lg bg-emerald-deep text-ivory hover:bg-emerald-dark transition text-sm font-semibold flex items-center gap-2"
                    >
                      <Key size={16} /> Contraseña
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="bg-white dark:bg-emerald-dark rounded-xl shadow-sm border border-gray-100 dark:border-emerald-800 p-8 text-center text-gray-500 dark:text-softgray">
          <AlertTriangle className="mx-auto mb-2" />
          Moderación de posts: (pendiente / depende de tu implementación actual de posts).
        </div>
      )}

      {/* ✅ FIX: ahora se pasa userToEdit */}
      <AdminPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        userToEdit={selectedUser}
      />
    </div>
  );
};

export default AdminDashboard;
