import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../context/NotificationContext';

const NotificationBell = ({ onNavigate }) => {
  const { notifications, unreadCount, setNotifications, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let channel;

    const setupSubscription = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("❌ No hay sesión activa");
        return;
      }

      const userId = session.user.id;

      // EL TRUCO: Le damos un nombre único e irrepetible al canal para evitar a los "fantasmas" de recargas anteriores
      const nombreCanalUnico = `campana-${userId}-${Date.now()}`;

      channel = supabase
        .channel(nombreCanalUnico)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `recipient_id=eq.${userId}` // Volvemos a poner el filtro correcto
        }, (payload) => {
          
          console.log("🔔 ¡Notificación recibida en tiempo real!", payload.new);
          
          setNotifications(prev => {
            if (prev.find(n => n.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });

        })
        .subscribe((status, err) => {
          console.log(`📡 Estado de la antena: ${status}`);
          if (err) console.error("❌ Error en la antena:", err);
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        // Al cerrar, nos aseguramos de destruir la antena para no dejar basura
        supabase.removeChannel(channel);
      }
    };
  }, [setNotifications]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full transition-all relative ${unreadCount > 0 ? 'bg-gold-premium/10 text-gold-premium' : 'text-gold-champagne hover:bg-white/10'}`}
      >
        <Bell size={22} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        
        {/* Punto rojo brillante con animación */}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-emerald-deep"></span>
          </span>
        )}
      </button>

      {/* Menú de Notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
          <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-sm dark:text-white flex justify-between items-center">
              Notificaciones
              {unreadCount > 0 && <span className="bg-gold-premium text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount} nuevas</span>}
            </h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No tienes notificaciones aún</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    onNavigate(notif);
                    setIsOpen(false);
                  }}
                  className={`p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-gold-premium/5 dark:hover:bg-slate-700/50 transition-colors ${!notif.is_read ? 'border-l-4 border-l-gold-premium bg-blue-50/30 dark:bg-gold-premium/5' : ''}`}
                >
                  <p className="text-sm dark:text-gray-200 leading-tight">
                    <span className="font-semibold">{notif.type === 'message' ? '💬 Mensaje nuevo' : '🔔 Notificación'}</span>
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {notif.content || 'Haz clic para ver más detalles'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;