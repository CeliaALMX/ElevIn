import React, { useEffect, useState } from 'react';
import { X, Lock, Save, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';

/**
 * AdminPasswordModal
 * Compatibilidad:
 * - Antes: props { userToEdit }
 * - En cambios recientes: props { user }
 * Acepta ambos para que no se rompa el panel si alguien usa una u otra.
 */
const AdminPasswordModal = ({ isOpen, onClose, user, userToEdit }) => {
  const targetUser = userToEdit || user;

  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Limpieza al cerrar
  useEffect(() => {
    if (!isOpen) {
      setNewPassword('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  const handleSave = async () => {
    if (newPassword.trim().length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      // RPC en Supabase (DB) que valida permisos admin y actualiza credenciales
      const { error } = await supabase.rpc('admin_update_password', {
        target_user_id: targetUser.id,
        new_password: newPassword.trim(),
      });

      if (error) throw error;

      alert(`Contraseña actualizada correctamente para ${targetUser.full_name || targetUser.email}`);
      setNewPassword('');
      onClose();
    } catch (error) {
      console.error('Error:', error);
      alert("Error al actualizar: " + (error?.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-emerald-dark w-full max-w-md rounded-xl shadow-2xl border border-gold-premium overflow-hidden animate-in fade-in zoom-in duration-200">

        <div className="bg-emerald-deep p-4 flex justify-between items-center border-b border-gold-premium/30">
          <h3 className="text-ivory font-bold flex items-center gap-2">
            <Lock size={18} className="text-gold-premium" />
            Cambiar Contraseña
          </h3>
          <button onClick={onClose} className="text-softgray hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 rounded flex gap-3">
            <AlertTriangle className="text-yellow-600 dark:text-yellow-400 shrink-0" size={20} />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              Estás cambiando la contraseña para <strong>{targetUser.full_name}</strong> ({targetUser.email}).
              Esta acción es irreversible.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Nueva Contraseña
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Escribe la nueva clave..."
              className="w-full p-3 bg-gray-50 dark:bg-emerald-deep/50 border border-gray-200 dark:border-emerald-800 rounded-lg outline-none focus:border-gold-premium transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={loading || newPassword.trim().length < 6}
              className="min-w-[120px]"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <Save size={18} className="mr-2" /> Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordModal;