import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageCircle, MessageSquare, Briefcase, X } from 'lucide-react'; // Agregamos la X
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from './Avatar';

const NotificationBell = ({ onNavigate }) => {
  const { notifications, unreadCount, setNotifications, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  
  // NUEVO: Estados para controlar la alerta flotante (Toast)
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    let channel;

    const setupSubscription = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) return;

      const userId = session.user.id;
      const nombreCanalUnico = `campana-${userId}-${Date.now()}`;

      channel = supabase
        .channel(nombreCanalUnico)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `recipient_id=eq.${userId}` 
        }, async (payload) => {
          
          // 1. Buscamos rápido la foto y nombre del que hizo la acción para el Toast
          const { data: actor } = await supabase
            .from('profiles')
            .select('full_name, avatar_initials, avatar_url')
            .eq('id', payload.new.actor_id)
            .single();

          const nuevaNotificacionCompleta = { ...payload.new, actor };

          // 2. Actualizamos la lista normal de notificaciones
          setNotifications(prev => {
            if (prev.find(n => n.id === payload.new.id)) return prev;
            return [nuevaNotificacionCompleta, ...prev];
          });

          // 3. ¡DISPARAMOS EL TOAST FLOTANTE!
          setToast(nuevaNotificacionCompleta);

          // 4. Limpiamos cualquier temporizador viejo y ponemos uno nuevo de 10 segundos
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => {
            setToast(null);
          }, 10000);

        })
        .subscribe((status) => {
           console.log(`📡 Antena con Toast conectada: ${status}`);
        });
    };

    setupSubscription();

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [setNotifications]);

  // --- FUNCIONES DE DISEÑO ---
  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart size={14} className="text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle size={14} className="text-blue-500 fill-blue-100 dark:fill-blue-900" />;
      case 'postulación': return <Briefcase size={14} className="text-gold-premium" />;
      case 'message': return <MessageSquare size={14} className="text-emerald-500" />;
      default: return <Bell size={14} className="text-gray-500" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const shortDate = date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return isToday ? `Hoy a las ${time}` : `${shortDate} a las ${time}`;
  };

  return (
    <>
      <div className="relative z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-full transition-all relative ${unreadCount > 0 ? 'bg-gold-premium/10 text-gold-premium' : 'text-gold-champagne hover:bg-white/10'}`}
        >
          <Bell size={22} className={unreadCount > 0 ? 'animate-bounce' : ''} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-emerald-deep"></span>
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-[350px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="font-bold text-sm dark:text-white">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="bg-gold-premium text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
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
                    className={`p-4 border-b dark:border-slate-700/50 cursor-pointer transition-colors flex gap-3 group ${(!notif.read && !notif.is_read) ? 'bg-blue-50/40 dark:bg-slate-700/40' : 'hover:bg-gray-50 dark:hover:bg-slate-700/20'}`}
                  >
                    <div className="relative shrink-0 mt-1">
                      <Avatar initials={notif.actor?.avatar_initials || '?'} src={notif.actor?.avatar_url} size="md" />
                      <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-gray-100 dark:border-slate-700">
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                        <span className="font-bold">{notif.actor?.full_name || (notif.type === 'message' ? 'Alguien' : 'Un usuario')}</span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">{notif.content || 'interactuó contigo.'}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium flex items-center gap-1">
                        {formatTime(notif.created_at)}
                      </p>
                    </div>
                    {(!notif.read && !notif.is_read) && (
                      <div className="shrink-0 flex items-center justify-center w-3">
                        <span className="h-2 w-2 bg-gold-premium rounded-full"></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- EL TOAST FLOTANTE INFERIOR DERECHO --- */}
      {toast && (
        <div 
          onClick={() => {
            markAsRead(toast.id);
            onNavigate(toast);
            setToast(null); 
          }}
          className="fixed bottom-6 right-6 z-[100] w-80 bg-white dark:bg-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-slate-700 p-4 animate-in slide-in-from-bottom-8 fade-in duration-300 cursor-pointer hover:scale-[1.02] transition-transform"
        >
          <div className="flex gap-3 items-start">
            <div className="relative shrink-0 mt-1">
              <Avatar initials={toast.actor?.avatar_initials || '?'} src={toast.actor?.avatar_url} size="md" />
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-gray-100 dark:border-slate-700">
                {getIcon(toast.type)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-blue-500 mb-0.5 uppercase tracking-wider">Nueva Notificación</h4>
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                <span className="font-bold">{toast.actor?.full_name || 'Alguien'}</span>{' '}
                <span className="text-gray-600 dark:text-gray-400">{toast.content || 'interactuó contigo.'}</span>
              </p>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                setToast(null);
              }} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 p-1.5 rounded-full transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;